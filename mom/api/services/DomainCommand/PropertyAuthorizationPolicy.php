<?php

declare(strict_types=1);

namespace MOM\Api\Services\DomainCommand;

final class PropertyAuthorizationPolicy
{
    private const SENSITIVE_FIELDS = [
        'actual_total_cost',
        'cost',
        'cost_quantity',
        'labor_cost_actual',
        'margin',
        'material_cost_actual',
        'price',
        'standard_cost',
        'unit_price',
    ];

    /**
     * @param array<string,mixed> $entry
     * @param array<string,mixed> $envelope
     * @param array<string,mixed> $payload
     * @return array{allowed:bool,code:string,message:string,details:array<string,mixed>}
     */
    public function evaluate(array $entry, array $envelope, array $payload): array
    {
        unset($entry);
        $touched = $this->touchedSensitiveFields($payload);
        if ($touched === []) {
            return $this->allow();
        }

        $permissions = $this->strings($envelope['actor_permissions'] ?? []);
        $roles = $this->strings($envelope['actor_roles'] ?? []);
        if (
            array_intersect($permissions, ['*', 'sensitive_field.write', 'finance.cost.write']) !== []
            || array_intersect($roles, ['admin', 'super_admin', 'finance_manager', 'cost_accountant']) !== []
        ) {
            return $this->allow();
        }

        return $this->deny('property_authorization_denied', 'Actor cannot mutate sensitive business properties.', [
            'fields' => $touched,
        ]);
    }

    /**
     * @param array<string,mixed> $payload
     * @return list<string>
     */
    private function touchedSensitiveFields(array $payload, string $prefix = ''): array
    {
        $fields = [];
        foreach ($payload as $key => $value) {
            $name = (string)$key;
            $path = $prefix === '' ? $name : $prefix . '.' . $name;
            if (in_array($name, self::SENSITIVE_FIELDS, true)) {
                $fields[] = $path;
            }
            if (is_array($value)) {
                $fields = array_merge($fields, $this->touchedSensitiveFields($value, $path));
            }
        }

        return array_values(array_unique($fields));
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
