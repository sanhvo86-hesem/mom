<?php

declare(strict_types=1);

namespace HESEM\QMS\Api\Controllers;

/**
 * Dictionary (Glossary) controller for HESEM QMS Portal.
 *
 * Handles listing, upserting, and deleting glossary terms.
 * Persists to both JSON and JS files for offline usage.
 *
 * @package HESEM\QMS\Api\Controllers
 * @since   2.0.0
 */
class DictController extends BaseController
{
    /**
     * GET list — List all glossary terms.
     *
     * Legacy action: `dict_list`
     *
     * @return never
     */
    public function list(): never
    {
        $this->requireAuth();

        $jsonFile = $this->rootDir . '/11-Glossary/dict-data.json';
        $items = [];
        if (is_file($jsonFile)) {
            $items = load_dict_items($jsonFile);
        }

        $this->success(['items' => $items]);
    }

    /**
     * POST upsert — Create or update a glossary term (admin only).
     *
     * Legacy action: `dict_upsert`
     *
     * @return never
     */
    public function upsert(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data     = $this->jsonBody();
        $term     = trim((string)($data['term'] ?? ''));
        $original = trim((string)($data['originalTerm'] ?? ''));
        if ($original === '') $original = $term;

        if ($term === '') $this->error('missing_term', 400);

        $def = trim((string)($data['def'] ?? ''));
        if ($def === '') $this->error('missing_definition', 400);

        $newItem = [
            'term'    => $term,
            'meaning' => (string)($data['meaning'] ?? ''),
            'vi'      => (string)($data['vi'] ?? ''),
            'def'     => $def,
            'ctx'     => (string)($data['ctx'] ?? ''),
            'rec'     => (string)($data['rec'] ?? ''),
            'cat'     => (string)($data['cat'] ?? 'General'),
        ];

        $jsonFile = $this->rootDir . '/11-Glossary/dict-data.json';
        $jsFile   = $this->rootDir . '/11-Glossary/dict-data.js';

        $items = is_file($jsonFile) ? load_dict_items($jsonFile) : [];
        $found = false;
        foreach ($items as $i => $it) {
            if (!is_array($it)) continue;
            if (strcasecmp((string)($it['term'] ?? ''), $original) === 0) {
                $items[$i] = $newItem;
                $found = true;
                break;
            }
        }
        if (!$found) $items[] = $newItem;

        save_dict_items($jsonFile, $jsFile, $items);
        $items = load_dict_items($jsonFile);

        $this->auditLog('dict_upsert', ['term' => $term]);
        $this->success(['items' => $items]);
    }

    /**
     * POST delete — Delete a glossary term (admin only).
     *
     * Legacy action: `dict_delete`
     *
     * @return never
     */
    public function delete(): never
    {
        $me = $this->requireAuth();
        $this->requireCsrf();
        $this->requireAdmin($me);

        $data = $this->jsonBody();
        $term = trim((string)($data['term'] ?? ''));

        if ($term === '') $this->error('missing_term', 400);

        $jsonFile = $this->rootDir . '/11-Glossary/dict-data.json';
        $jsFile   = $this->rootDir . '/11-Glossary/dict-data.js';

        $items = is_file($jsonFile) ? load_dict_items($jsonFile) : [];
        $filtered = [];
        foreach ($items as $it) {
            if (!is_array($it)) continue;
            if (strcasecmp((string)($it['term'] ?? ''), $term) === 0) continue;
            $filtered[] = $it;
        }

        save_dict_items($jsonFile, $jsFile, $filtered);
        $filtered = load_dict_items($jsonFile);

        $this->auditLog('dict_delete', ['term' => $term]);
        $this->success(['items' => $filtered]);
    }
}
