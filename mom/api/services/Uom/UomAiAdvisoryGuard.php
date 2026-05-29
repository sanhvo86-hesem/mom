<?php

declare(strict_types=1);

namespace MOM\Api\Services\Uom;

/**
 * AI advisory non-authority guard (HESEM UoM V3 P11 deliverable).
 *
 * The HESEM AI governance posture is that AI may suggest, cluster, detect
 * anomalies and draft remediation — but it may NEVER approve a conversion
 * rule, activate an alias, sign an e-sign record, or update an
 * authority field. This guard exposes the explicit predicates the
 * controller layer (P06 OpenAPI surface) consults to assert that posture.
 *
 * AI principals are recognised by a recorded set of `actor_kind` values
 * agreed at the API/IDM layer. The guard is therefore data-driven; the
 * actual list of AI actor kinds lives in `data/security/ai-actors.json`
 * or wherever IDM publishes them.
 */
final class UomAiAdvisoryGuard
{
    /**
     * Codes treated as the AI advisory principal across HESEM. Anything
     * that matches `actor_kind` IN this list MUST be rejected from any
     * authority mutation entry point.
     */
    public const AI_ACTOR_KINDS = [
        'ai-llm',
        'ai-classifier',
        'ai-anomaly-detector',
        'ai-suggester',
    ];

    /**
     * Authority entry points AI must never reach.
     */
    public const FORBIDDEN_OPERATIONS_FOR_AI = [
        'manifest.approve',
        'manifest.linkRule',
        'rule.submitForReview',
        'rule.approve',
        'rule.esign',
        'rule.deprecate',
        'alias.approveResolution',
    ];

    public static function isAiActor(string $actorKind): bool
    {
        return in_array(strtolower($actorKind), self::AI_ACTOR_KINDS, true);
    }

    public static function assertNotAi(string $actorKind, string $operation): void
    {
        if (!self::isAiActor($actorKind)) {
            return;
        }
        if (in_array($operation, self::FORBIDDEN_OPERATIONS_FOR_AI, true)) {
            throw new UomException(
                'UOM_AI_AUTHORITY_FORBIDDEN',
                "AI principal '{$actorKind}' cannot invoke '{$operation}'.",
                403
            );
        }
    }
}
