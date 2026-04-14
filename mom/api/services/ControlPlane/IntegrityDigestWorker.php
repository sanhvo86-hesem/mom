<?php

declare(strict_types=1);

namespace MOM\Services\ControlPlane;

/**
 * Queue/scheduler entrypoint for daily integrity digest jobs.
 */
final class IntegrityDigestWorker
{
    public function __construct(private readonly IntegrityDigestService $service)
    {
    }

    /**
     * @param list<array<string, mixed>> $scopes
     * @return array{processed: int, digests: list<array<string, mixed>>}
     */
    public function runDaily(array $scopes = [[]]): array
    {
        $digests = [];
        foreach ($scopes === [] ? [[]] : $scopes as $scope) {
            $digests[] = $this->service->computeDailyDigest(is_array($scope) ? $scope : []);
        }
        return ['processed' => count($digests), 'digests' => $digests];
    }
}
