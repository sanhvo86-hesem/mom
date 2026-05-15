<?php

declare(strict_types=1);

namespace MOM\Api\Services;

/**
 * Immutable result of one AuthorizationKernel::decide() call.
 *
 * outcome ∈ {allow, deny, stepup}.
 *
 * reason is one of:
 *   * granted                       — allowed
 *   * granted_aal_gap               — allowed in observe-only AAL mode (AAL gap logged, not blocked)
 *   * empty_permission              — caller passed an empty permission key
 *   * unknown_permission            — code path reserved (catalog enforce mode)
 *   * permission_inactive           — catalog row exists but is_active=false
 *   * no_grant                      — default-deny: no role grant matches
 *   * no_grant_catalog_missing      — no grant matched AND no catalog row (dev/JSON_ONLY)
 *   * explicit_deny                 — role's denies[] matched
 *   * aal_insufficient              — grant exists but session AAL < required AAL (enforce mode)
 *
 * @package MOM\Api\Services
 * @since   2.1.0
 */
final class AuthDecision
{
    public function __construct(
        public readonly string $outcome,
        public readonly string $reason,
        public readonly ?int $currentAal = null,
        public readonly ?int $requiredAal = null,
        public readonly ?string $matchedPattern = null,
    ) {
    }

    public function isAllow(): bool
    {
        return $this->outcome === 'allow';
    }

    public function isStepUp(): bool
    {
        return $this->outcome === 'stepup';
    }

    public function isDeny(): bool
    {
        return $this->outcome === 'deny';
    }

    /** HTTP status to surface from PEP for this decision. */
    public function httpStatus(): int
    {
        return match ($this->outcome) {
            'allow'  => 200,
            'stepup' => 401,
            default  => 403,
        };
    }
}
