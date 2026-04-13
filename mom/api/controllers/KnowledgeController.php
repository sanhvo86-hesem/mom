<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Api\Controllers\BaseController;
use Throwable;

/**
 * Knowledge Base controller for HESEM MOM Portal.
 *
 * Provides API endpoints for shop floor knowledge tips including
 * CRUD, voting (helpful/not_helpful), commenting, and search/filter
 * by machine, material, part, and category.
 *
 * Data stored in `data/knowledge/` with per-entity JSON files.
 *
 * @package MOM\Api\Controllers
 * @since   3.0.0
 */
class KnowledgeController extends BaseController
{
    /** @var string Base directory for knowledge data. */
    private string $kbDir = '';

    // -- Helpers --------------------------------------------------------------

    /**
     * Get the knowledge data directory, creating it on first use.
     *
     * @return string
     */
    private function kbDir(): string
    {
        if ($this->kbDir === '') {
            $this->kbDir = $this->dataDir . '/knowledge';
            if (!is_dir($this->kbDir)) {
                @mkdir($this->kbDir, 0755, true);
            }
        }
        return $this->kbDir;
    }

    /**
     * Extract the acting username from a user record.
     *
     * @param array $user User record.
     * @return string
     */
    private function userId(array $user): string
    {
        return (string)($user['username'] ?? $user['user'] ?? 'unknown');
    }

    /**
     * @return array<int, string>
     */
    private function knowledgeReadRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_director',
                'production_manager',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'process_engineer',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'shift_leader',
                'supervisor',
                'setup_technician',
                'operator',
                'cnc_operator',
            ]
        )));
    }

    /**
     * @return array<int, string>
     */
    private function knowledgeWriteRoles(): array
    {
        return array_values(array_unique(array_merge(
            admin_roles(),
            [
                'production_manager',
                'cnc_workshop_manager',
                'engineering_manager',
                'engineering_lead',
                'process_engineer',
                'quality_manager',
                'qa_manager',
                'quality_engineer',
                'shift_leader',
                'supervisor',
                'setup_technician',
                'operator',
                'cnc_operator',
            ]
        )));
    }

    /**
     * @return void
     */
    private function requireKnowledgeReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->knowledgeReadRoles());
    }

    /**
     * @return void
     */
    private function requireKnowledgeWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->knowledgeWriteRoles());
    }

    // -- Endpoints ------------------------------------------------------------

    /**
     * GET listTips -- List knowledge tips with filters and search.
     *
     * Query params:
     *   - machine   (string, optional)
     *   - material  (string, optional)
     *   - part      (string, optional)
     *   - category  (string, optional)
     *   - search    (string, optional): Full-text search in title/body.
     *   - offset    (int, optional)
     *   - limit     (int, optional)
     *
     * @return never
     */
    public function listTips(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeReadAccess($user);

        try {
            $file = $this->kbDir() . '/tips.json';
            $all  = $this->readJsonFile($file) ?? [];

            $machine = $this->query('machine');
            if ($machine !== null && $machine !== '') {
                $all = array_filter($all, fn(array $t) => stripos($t['machine'] ?? '', $machine) !== false);
            }

            $material = $this->query('material');
            if ($material !== null && $material !== '') {
                $all = array_filter($all, fn(array $t) => stripos($t['material'] ?? '', $material) !== false);
            }

            $part = $this->query('part');
            if ($part !== null && $part !== '') {
                $all = array_filter($all, fn(array $t) => stripos($t['part'] ?? $t['part_id'] ?? '', $part) !== false);
            }

            $category = $this->query('category');
            if ($category !== null && $category !== '') {
                $category = strtolower($category);
                $all = array_filter($all, fn(array $t) => strtolower($t['category'] ?? '') === $category);
            }

            $search = $this->query('search');
            if ($search !== null && $search !== '') {
                $searchLower = strtolower($search);
                $all = array_filter($all, function (array $t) use ($searchLower) {
                    $haystack = strtolower(
                        ($t['title'] ?? '') . ' ' .
                        ($t['body'] ?? '') . ' ' .
                        ($t['tags'] ?? '')
                    );
                    return strpos($haystack, $searchLower) !== false;
                });
            }

            // Sort by helpful_count descending, then by created_at descending
            usort($all, function (array $a, array $b) {
                $scoreA = (int)($a['helpful_count'] ?? 0) - (int)($a['not_helpful_count'] ?? 0);
                $scoreB = (int)($b['helpful_count'] ?? 0) - (int)($b['not_helpful_count'] ?? 0);
                if ($scoreB !== $scoreA) {
                    return $scoreB <=> $scoreA;
                }
                return ($b['created_at'] ?? '') <=> ($a['created_at'] ?? '');
            });

            $offset = max(0, (int)($this->query('offset', '0')));
            $limit  = min(200, max(1, (int)($this->query('limit', '50'))));
            $total  = count($all);
            $items  = array_slice(array_values($all), $offset, $limit);

            $this->paginated('tips', $items, $total, $offset, $limit);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_list_failed', 500, $e->getMessage());
        }
    }

    /**
     * GET getDetail -- Get a single knowledge tip with comments.
     *
     * Query params:
     *   - id (string, required)
     *
     * @return never
     */
    public function getDetail(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeReadAccess($user);

        $id = $this->query('id');
        if ($id === null || trim($id) === '') {
            $this->error('missing_id', 400);
        }
        $id = trim($id);

        try {
            $file = $this->kbDir() . '/tips.json';
            $all  = $this->readJsonFile($file) ?? [];

            $tip = null;
            foreach ($all as $t) {
                if (($t['id'] ?? '') === $id) {
                    $tip = $t;
                    break;
                }
            }

            if ($tip === null) {
                $this->error('not_found', 404, "Knowledge tip {$id} not found.");
            }

            // Attach comments
            $commentsFile = $this->kbDir() . '/comments.json';
            $allComments  = $this->readJsonFile($commentsFile) ?? [];
            $tip['comments'] = array_values(array_filter(
                $allComments,
                fn(array $c) => ($c['tip_id'] ?? '') === $id
            ));

            $this->success(['tip' => $tip]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_detail_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST create -- Create a knowledge tip.
     *
     * Body fields:
     *   - title    (string, required)
     *   - body     (string, required)
     *   - category (string, required): e.g. setup, tooling, material, process, safety.
     *   - machine  (string, optional)
     *   - material (string, optional)
     *   - part     (string, optional)
     *   - tags     (string, optional): Comma-separated tags.
     *
     * @return never
     */
    public function create(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        // Frontend sends 'description', accept both 'body' and 'description'
        if (!isset($body['body']) && isset($body['description'])) {
            $body['body'] = $body['description'];
        }
        $this->requireFields($body, ['title', 'body', 'category']);

        $userId = $this->userId($user);

        try {
            $file = $this->kbDir() . '/tips.json';
            $all  = $this->readJsonFile($file) ?? [];

            $tip = [
                'id'                => 'KB-' . bin2hex(random_bytes(8)),
                'title'             => trim((string)($body['title'] ?? '')),
                'body'              => trim((string)($body['body'] ?? '')),
                'category'          => strtolower(trim((string)($body['category'] ?? ''))),
                'machine'           => trim((string)($body['machine'] ?? '')),
                'material'          => trim((string)($body['material'] ?? '')),
                'part'              => trim((string)($body['part'] ?? '')),
                'tags'              => trim((string)($body['tags'] ?? '')),
                'helpful_count'     => 0,
                'not_helpful_count' => 0,
                'comment_count'     => 0,
                'created_by'        => $userId,
                'created_at'        => $this->nowIso(),
                'updated_at'        => $this->nowIso(),
            ];

            $all[] = $tip;
            $this->writeJsonFile($file, $all);

            $this->auditLog('knowledge_create', [
                'tip_id'   => $tip['id'],
                'title'    => $tip['title'],
                'category' => $tip['category'],
            ], $userId);

            $this->success(['tip' => $tip], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_create_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST update -- Update a knowledge tip.
     *
     * Body fields:
     *   - id (string, required)
     *   - Any updatable fields (title, body, category, machine, material, part, tags).
     *
     * @return never
     */
    public function update(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['id']);

        $id     = trim((string)($body['id'] ?? ''));
        $userId = $this->userId($user);

        try {
            $file  = $this->kbDir() . '/tips.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = null;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $id) {
                    $updatable = ['title', 'body', 'category', 'machine', 'material', 'part', 'tags'];
                    foreach ($updatable as $field) {
                        if (isset($body[$field])) {
                            $entry[$field] = trim((string)$body[$field]);
                        }
                    }
                    $entry['updated_at'] = $this->nowIso();
                    $entry['updated_by'] = $userId;
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Knowledge tip {$id} not found.");
            }
            if (!is_array($updated)) {
                $this->error('knowledge_update_failed', 500, 'Knowledge update result was not materialized.');
            }

            $this->writeJsonFile($file, $all);

            $this->auditLog('knowledge_update', [
                'tip_id' => $id,
                'fields' => array_keys($body),
            ], $userId);

            $this->success(['tip' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_update_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST vote -- Vote on a knowledge tip (helpful or not_helpful).
     *
     * Body fields:
     *   - tip_id (string, required)
     *   - vote   (string, required): "helpful" or "not_helpful".
     *
     * @return never
     */
    public function vote(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['tip_id', 'vote']);

        $tipId  = trim((string)($body['tip_id'] ?? ''));
        $vote   = strtolower(trim((string)($body['vote'] ?? '')));
        $userId = $this->userId($user);

        if (!in_array($vote, ['helpful', 'not_helpful'], true)) {
            $this->error('invalid_vote', 400, 'Vote must be helpful or not_helpful.');
        }

        try {
            $file  = $this->kbDir() . '/tips.json';
            $all   = $this->readJsonFile($file) ?? [];
            $found = false;
            $updated = null;

            foreach ($all as &$entry) {
                if (($entry['id'] ?? '') === $tipId) {
                    if ($vote === 'helpful') {
                        $entry['helpful_count'] = (int)($entry['helpful_count'] ?? 0) + 1;
                    } else {
                        $entry['not_helpful_count'] = (int)($entry['not_helpful_count'] ?? 0) + 1;
                    }
                    $entry['updated_at'] = $this->nowIso();
                    $found   = true;
                    $updated = $entry;
                    break;
                }
            }
            unset($entry);

            if (!$found) {
                $this->error('not_found', 404, "Knowledge tip {$tipId} not found.");
            }
            if (!is_array($updated)) {
                $this->error('knowledge_vote_failed', 500, 'Knowledge vote result was not materialized.');
            }

            $this->writeJsonFile($file, $all);

            // Record vote
            $votesFile = $this->kbDir() . '/votes.json';
            $votes     = $this->readJsonFile($votesFile) ?? [];
            $votes[]   = [
                'id'       => 'VT-' . bin2hex(random_bytes(4)),
                'tip_id'   => $tipId,
                'vote'     => $vote,
                'voted_by' => $userId,
                'voted_at' => $this->nowIso(),
            ];
            $this->writeJsonFile($votesFile, $votes);

            $this->auditLog('knowledge_vote', [
                'tip_id' => $tipId,
                'vote'   => $vote,
            ], $userId);

            $this->success(['tip' => $updated]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_vote_failed', 500, $e->getMessage());
        }
    }

    /**
     * POST addComment -- Add a comment to a knowledge tip.
     *
     * Body fields:
     *   - tip_id (string, required)
     *   - body   (string, required)
     *
     * @return never
     */
    public function addComment(): never
    {
        $user = $this->requireAuth();
        $this->requireKnowledgeReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['tip_id', 'body']);

        $tipId  = trim((string)($body['tip_id'] ?? ''));
        $userId = $this->userId($user);

        try {
            // Verify tip exists and increment comment count
            $tipsFile = $this->kbDir() . '/tips.json';
            $tips     = $this->readJsonFile($tipsFile) ?? [];
            $tipFound = false;

            foreach ($tips as &$entry) {
                if (($entry['id'] ?? '') === $tipId) {
                    $entry['comment_count'] = (int)($entry['comment_count'] ?? 0) + 1;
                    $entry['updated_at']    = $this->nowIso();
                    $tipFound = true;
                    break;
                }
            }
            unset($entry);

            if (!$tipFound) {
                $this->error('not_found', 404, "Knowledge tip {$tipId} not found.");
            }

            $this->writeJsonFile($tipsFile, $tips);

            // Store the comment
            $commentsFile = $this->kbDir() . '/comments.json';
            $comments     = $this->readJsonFile($commentsFile) ?? [];

            $comment = [
                'id'         => 'KC-' . bin2hex(random_bytes(8)),
                'tip_id'     => $tipId,
                'body'       => trim((string)($body['body'] ?? '')),
                'created_by' => $userId,
                'created_at' => $this->nowIso(),
            ];

            $comments[] = $comment;
            $this->writeJsonFile($commentsFile, $comments);

            $this->auditLog('knowledge_comment', [
                'comment_id' => $comment['id'],
                'tip_id'     => $tipId,
            ], $userId);

            $this->success(['comment' => $comment], 201);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('knowledge_comment_failed', 500, $e->getMessage());
        }
    }
}
