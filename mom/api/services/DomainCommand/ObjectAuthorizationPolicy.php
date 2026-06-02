<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

final class ObjectAuthorizationPolicy
{
    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        unset($entry);
        $actorScope = is_array($envelope['actor_scope'] ?? null) ? (array)$envelope['actor_scope'] : [];
        $allowedSites = $this->strings($actorScope['site_ids'] ?? $actorScope['sites'] ?? []);
        $allowedPlants = $this->strings($actorScope['plant_ids'] ?? $actorScope['plants'] ?? []);

        $targetSite = $this->first($payload, ['site_id', 'site_ref', 'org_site_id']);
        if ($targetSite !== '' && $allowedSites === []) {
            return $this->deny('object_scope_missing', 'Actor site scope is required for target-site mutation.', [
                'target_site' => $targetSite,
            ]);
        }
        if ($targetSite !== '' && $allowedSites !== [] && !in_array($targetSite, $allowedSites, true)) {
            return $this->deny('object_scope_denied', 'Actor is not authorized for the target site.', [
                'target_site' => $targetSite,
            ]);
        }

        $targetPlant = $this->first($payload, ['plant_id', 'org_plant_id']);
        if ($targetPlant !== '' && $allowedPlants === []) {
            return $this->deny('object_scope_missing', 'Actor plant scope is required for target-plant mutation.', [
                'target_plant' => $targetPlant,
            ]);
        }
        if ($targetPlant !== '' && $allowedPlants !== [] && !in_array($targetPlant, $allowedPlants, true)) {
            return $this->deny('object_scope_denied', 'Actor is not authorized for the target plant.', [
                'target_plant' => $targetPlant,
            ]);
        }

        return $this->allow();
    }

    /**
     * @param array<string,mixed> $payload
     * @param list<string> $fields
     */
    private function first(array $payload, array $fields): string
    {
        foreach ($fields as $field) {
            $value = trim((string)($payload[$field] ?? ''));
            if ($value !== '') {
                return $value;
            }
        }

        return '';
    }

    /**
     * @return list<string>
     */
    private function strings(mixed $value): array
    {
        if (!is_array($value)) {
            return [];
        }

        return array_values(array_filter(array_map(static fn (mixed $item): string => trim((string)$item), $value)));
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
