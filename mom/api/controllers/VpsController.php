<?php

declare(strict_types=1);

namespace MOM\Api\Controllers;

use MOM\Services\VpsService;
use RuntimeException;
use Throwable;

final class VpsController extends BaseController
{
    private VpsService $service;

    public function __construct(\MOM\Database\DataLayer $data, string $rootDir, string $dataDir)
    {
        parent::__construct($data, $rootDir, $dataDir);
        $this->service = new VpsService($dataDir, $rootDir, $data);
    }

    /**
     * @return array<int, string>
     */
    private function readRoles(): array
    {
        return admin_roles();
    }

    /**
     * @return array<int, string>
     */
    private function writeRoles(): array
    {
        return admin_roles();
    }

    private function requireReadAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->readRoles());
    }

    private function requireWriteAccess(array $user): void
    {
        $this->requireAnyRole($user, $this->writeRoles());
    }

    private function terminalHeaderValue(string $value): string
    {
        $sanitized = preg_replace('/[^A-Za-z0-9._:@-]+/', '_', $value);
        $sanitized = is_string($sanitized) ? trim($sanitized, '_') : '';
        return $sanitized !== '' ? $sanitized : 'unknown';
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
    }

    private function assetActionUrl(string $path, bool $download = false): string
    {
        return 'api.php?action=vps_control_asset&path=' . rawurlencode($path) . ($download ? '&download=1' : '');
    }

    private function assetMimeType(string $ext): string
    {
        $ext = strtolower(trim($ext));
        return match ($ext) {
            'md', 'markdown', 'sh', 'bash', 'zsh', 'txt', 'log', 'env', 'ini', 'conf', 'yaml', 'yml', 'json' => 'text/plain; charset=utf-8',
            default => portal_stream_mime_type($ext),
        };
    }

    private function assetLinkHref(string $url, string $currentAssetPath): string
    {
        $url = trim($url);
        if ($url === '') {
            return '';
        }

        if (preg_match('#^https?://#i', $url) === 1 || str_starts_with($url, '/')) {
            return $url;
        }

        if (str_starts_with($url, '#')) {
            return $url;
        }

        $candidate = $url;
        if (
            !str_starts_with($candidate, 'mom/')
            && !str_starts_with($candidate, 'docs/')
            && !str_starts_with($candidate, 'ops/')
            && !str_starts_with($candidate, 'scripts/')
            && !str_starts_with($candidate, 'styles/')
            && !str_starts_with($candidate, './')
        ) {
            $baseDir = str_replace('\\', '/', dirname($currentAssetPath));
            $candidate = ($baseDir === '.' || $baseDir === '') ? $candidate : ($baseDir . '/' . $candidate);
        }

        try {
            $resolved = $this->service->resolveAsset($candidate);
        } catch (RuntimeException) {
            return '';
        }

        return $this->assetActionUrl((string)($resolved['path'] ?? $candidate));
    }

    private function renderMarkdownInline(string $text, string $currentAssetPath): string
    {
        $parts = preg_split('/(`[^`]+`|\[[^\]]+\]\([^)]+\))/', $text, -1, PREG_SPLIT_DELIM_CAPTURE);
        if (!is_array($parts)) {
            return $this->esc($text);
        }

        $out = '';
        foreach ($parts as $part) {
            if ($part === '') {
                continue;
            }

            if (preg_match('/^`([^`]+)`$/', $part, $match) === 1) {
                $out .= '<code>' . $this->esc($match[1]) . '</code>';
                continue;
            }

            if (preg_match('/^\[([^\]]+)\]\(([^)]+)\)$/', $part, $match) === 1) {
                $label = $this->esc($match[1]);
                $href = $this->assetLinkHref($match[2], $currentAssetPath);
                if ($href === '') {
                    $out .= $label;
                } else {
                    $target = preg_match('#^https?://#i', $href) === 1 ? ' target="_blank" rel="noopener noreferrer"' : '';
                    $out .= '<a href="' . $this->esc($href) . '"' . $target . '>' . $label . '</a>';
                }
                continue;
            }

            $out .= $this->esc($part);
        }

        return $out;
    }

    private function renderMarkdownBody(string $source, string $currentAssetPath): string
    {
        $html = '';
        $inCode = false;
        $codeLang = '';
        $codeLines = [];
        $paragraph = [];
        $listType = '';
        $listItems = [];

        foreach (preg_split("/\r\n|\n|\r/", $source) ?: [] as $line) {
            $line = (string)$line;
            $trimmed = trim($line);

            if (preg_match('/^```([A-Za-z0-9_-]+)?\s*$/', $trimmed, $match) === 1) {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                $this->flushMarkdownList($html, $listType, $listItems);
                if ($inCode) {
                    $langClass = $codeLang !== '' ? ' data-lang="' . $this->esc($codeLang) . '"' : '';
                    $html .= '<pre class="vps-asset-code"' . $langClass . '><code>' . $this->esc(implode("\n", $codeLines)) . '</code></pre>';
                    $inCode = false;
                    $codeLang = '';
                    $codeLines = [];
                } else {
                    $inCode = true;
                    $codeLang = strtolower(trim((string)($match[1] ?? '')));
                    $codeLines = [];
                }
                continue;
            }

            if ($inCode) {
                $codeLines[] = $line;
                continue;
            }

            if ($trimmed === '') {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                $this->flushMarkdownList($html, $listType, $listItems);
                continue;
            }

            if (preg_match('/^(#{1,6})\s+(.*)$/', $trimmed, $match) === 1) {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                $this->flushMarkdownList($html, $listType, $listItems);
                $level = strlen($match[1]);
                $html .= '<h' . $level . '>' . $this->renderMarkdownInline($match[2], $currentAssetPath) . '</h' . $level . '>';
                continue;
            }

            if (preg_match('/^>\s?(.*)$/', $trimmed, $match) === 1) {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                $this->flushMarkdownList($html, $listType, $listItems);
                $html .= '<blockquote><p>' . $this->renderMarkdownInline($match[1], $currentAssetPath) . '</p></blockquote>';
                continue;
            }

            if (preg_match('/^[-*]\s+(.*)$/', $trimmed, $match) === 1) {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                if ($listType !== 'ul') {
                    $this->flushMarkdownList($html, $listType, $listItems);
                    $listType = 'ul';
                }
                $listItems[] = '<li>' . $this->renderMarkdownInline($match[1], $currentAssetPath) . '</li>';
                continue;
            }

            if (preg_match('/^\d+\.\s+(.*)$/', $trimmed, $match) === 1) {
                $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
                if ($listType !== 'ol') {
                    $this->flushMarkdownList($html, $listType, $listItems);
                    $listType = 'ol';
                }
                $listItems[] = '<li>' . $this->renderMarkdownInline($match[1], $currentAssetPath) . '</li>';
                continue;
            }

            $paragraph[] = $trimmed;
        }

        $this->flushMarkdownParagraph($html, $paragraph, $currentAssetPath);
        $this->flushMarkdownList($html, $listType, $listItems);

        if ($inCode) {
            $langClass = $codeLang !== '' ? ' data-lang="' . $this->esc($codeLang) . '"' : '';
            $html .= '<pre class="vps-asset-code"' . $langClass . '><code>' . $this->esc(implode("\n", $codeLines)) . '</code></pre>';
        }

        return $html !== '' ? $html : '<p>No content.</p>';
    }

    /**
     * @param array<int, string> $paragraph
     */
    private function flushMarkdownParagraph(string &$html, array &$paragraph, string $currentAssetPath): void
    {
        if ($paragraph === []) {
            return;
        }

        $text = trim(implode(' ', $paragraph));
        if ($text !== '') {
            $html .= '<p>' . $this->renderMarkdownInline($text, $currentAssetPath) . '</p>';
        }
        $paragraph = [];
    }

    /**
     * @param array<int, string> $listItems
     */
    private function flushMarkdownList(string &$html, string &$listType, array &$listItems): void
    {
        if ($listType !== '' && $listItems !== []) {
            $html .= '<' . $listType . '>' . implode('', $listItems) . '</' . $listType . '>';
        }
        $listType = '';
        $listItems = [];
    }

    private function renderAssetViewer(array $asset, string $content): string
    {
        $relativePath = (string)($asset['relative_path'] ?? '');
        $rawPath = (string)($asset['path'] ?? $relativePath);
        $kind = (string)($asset['kind'] ?? 'stream');
        $ext = strtolower(trim((string)($asset['ext'] ?? pathinfo($relativePath, PATHINFO_EXTENSION))));
        $downloadUrl = $this->assetActionUrl($rawPath, true);

        $body = match ($kind) {
            'markdown' => $this->renderMarkdownBody($content, $relativePath),
            default => '<pre class="vps-asset-code"><code>' . $this->esc($content) . '</code></pre>',
        };

        return '<!doctype html><html lang="en"><head><meta charset="utf-8">'
            . '<meta name="viewport" content="width=device-width, initial-scale=1">'
            . '<title>' . $this->esc((string)($asset['label'] ?? basename($relativePath))) . '</title>'
            . '<style>'
            . ':root{color-scheme:light;background:#f4f7fb;color:#0f172a;font-family:ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}'
            . 'body{margin:0;background:linear-gradient(180deg,#08111f 0%,#10253d 220px,#f4f7fb 220px,#f4f7fb 100%)}'
            . '.shell{max-width:1100px;margin:0 auto;padding:28px 18px 40px}'
            . '.hero{background:rgba(7,18,31,.92);color:#e6edf7;border:1px solid rgba(148,163,184,.16);border-radius:24px;padding:22px 24px;box-shadow:0 18px 42px rgba(8,17,31,.24)}'
            . '.hero small{display:block;color:rgba(230,237,247,.68);text-transform:uppercase;letter-spacing:.08em;font-size:11px}'
            . '.hero h1{margin:8px 0 6px;font-size:30px;line-height:1.05;letter-spacing:-.04em}'
            . '.hero p{margin:0;color:rgba(230,237,247,.78);line-height:1.65;font-size:14px}'
            . '.actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}'
            . '.actions a{display:inline-flex;align-items:center;padding:10px 14px;border-radius:12px;text-decoration:none;font-weight:700;font-size:13px;border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.08);color:#edf5ff}'
            . '.actions a.primary{background:linear-gradient(135deg,#5eead4,#2dd4bf);color:#05202a;border-color:transparent}'
            . '.meta{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:16px}'
            . '.meta div{padding:14px;border-radius:16px;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.08)}'
            . '.meta small{display:block;color:rgba(230,237,247,.58);text-transform:uppercase;letter-spacing:.08em;font-size:11px;margin-bottom:6px}'
            . '.card{margin-top:18px;background:#fff;border:1px solid rgba(148,163,184,.18);border-radius:24px;padding:24px 24px 28px;box-shadow:0 14px 42px rgba(15,23,42,.06)}'
            . '.doc-body{max-width:860px}'
            . '.doc-body h1,.doc-body h2,.doc-body h3,.doc-body h4,.doc-body h5,.doc-body h6{letter-spacing:-.03em;line-height:1.15;margin:1.35em 0 .45em}'
            . '.doc-body h1{font-size:2rem}.doc-body h2{font-size:1.55rem}.doc-body h3{font-size:1.25rem}'
            . '.doc-body p,.doc-body li,.doc-body blockquote{font-size:15px;line-height:1.75}'
            . '.doc-body ul,.doc-body ol{padding-left:22px}'
            . '.doc-body blockquote{margin:1rem 0;padding:12px 16px;border-left:4px solid #2dd4bf;background:#f2fbfa;border-radius:12px}'
            . '.doc-body code{font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:.92em;background:#eff5fb;padding:2px 6px;border-radius:6px}'
            . '.doc-body a{color:#0f766e;text-decoration:none;font-weight:600}'
            . '.vps-asset-code{margin:0;overflow:auto;padding:18px;border-radius:18px;background:#07111d;color:#d9f99d;font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:13px;line-height:1.7}'
            . '</style></head><body><div class="shell"><section class="hero">'
            . '<small>HESEM OPS ASSET VIEWER</small>'
            . '<h1>' . $this->esc((string)($asset['label'] ?? basename($relativePath))) . '</h1>'
            . '<p>Whitelisted control-plane asset rendered inside the portal security model.</p>'
            . '<div class="actions"><a class="primary" href="' . $this->esc($downloadUrl) . '">Download raw file</a></div>'
            . '<div class="meta">'
            . '<div><small>Path</small><strong>' . $this->esc($relativePath) . '</strong></div>'
            . '<div><small>Kind</small><strong>' . $this->esc($kind) . '</strong></div>'
            . '<div><small>Extension</small><strong>' . $this->esc($ext !== '' ? $ext : 'n/a') . '</strong></div>'
            . '</div></section><section class="card"><div class="doc-body">' . $body . '</div></section></div></body></html>';
    }

    public function overview(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        try {
            $this->success([
                'overview' => $this->service->getOverview(),
            ]);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_control_overview_failed', 500, $e->getMessage());
        }
    }

    public function host(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        if ($hostId === '') {
            $this->error('missing_host_id', 400);
        }

        try {
            $this->success([
                'host' => $this->service->getHostSnapshot($hostId),
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $code = str_starts_with($message, 'host_not_found') ? 404 : 400;
            $this->error('vps_control_host_failed', $code, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_control_host_failed', 500, $e->getMessage());
        }
    }

    public function runAction(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['host_id', 'action']);

        $hostId = trim((string)($body['host_id'] ?? ''));
        $action = trim((string)($body['action'] ?? ''));

        if ($hostId === '' || $action === '') {
            $this->error('invalid_vps_action_request', 400);
        }

        try {
            $requiresWrite = $this->service->actionRequiresWrite($hostId, $action);
            if ($requiresWrite) {
                $this->requireWriteAccess($user);
            }
            $result = $this->service->runAction(
                $hostId,
                $action,
                $requiresWrite,
                is_array($body['deployment_governance'] ?? null) ? $body['deployment_governance'] : $body
            );
            $this->auditLog('vps_control_action', [
                'host_id' => $hostId,
                'action' => $action,
                'exit_code' => $result['exit_code'] ?? null,
                'ok' => $result['ok'] ?? false,
            ]);
            $this->success([
                'result' => $result,
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'action_not_allowed') => 403,
                str_starts_with($message, 'action_not_found') => 404,
                str_starts_with($message, 'write_access_required') => 403,
                str_starts_with($message, 'deployment_actions_disabled') => 403,
                str_starts_with($message, 'deployment_change_authority_required') => 409,
                str_starts_with($message, 'deployment_promotion_intent_required') => 409,
                str_starts_with($message, 'deployment_confirmation_required') => 409,
                default => 400,
            };
            $this->error('vps_control_action_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_control_action_failed', 500, $e->getMessage());
        }
    }

    public function terminalAuth(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        $terminalId = trim((string)($this->input('terminal_id') ?? ''));
        if ($hostId === '' || $terminalId === '') {
            $this->error('invalid_terminal_auth_request', 400);
        }

        try {
            if ($this->service->terminalRequiresWrite($hostId, $terminalId)) {
                $this->requireWriteAccess($user);
            }

            $terminal = $this->service->getTerminal($hostId, $terminalId);
            $username = $this->terminalHeaderValue(
                (string)($user['username'] ?? $user['email'] ?? $user['id'] ?? 'unknown')
            );

            $this->emptyResponse(204, [
                'X-Remote-User' => $username,
                'X-Terminal-Host' => $this->terminalHeaderValue($hostId),
                'X-Terminal-Id' => $this->terminalHeaderValue((string)($terminal['id'] ?? $terminalId)),
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'terminal_not_found') => 404,
                default => 403,
            };
            $this->error('vps_terminal_auth_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_terminal_auth_failed', 500, $e->getMessage());
        }
    }

    public function observabilityAuth(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        $panelId = trim((string)($this->input('panel_id') ?? ''));
        if ($hostId === '' || $panelId === '') {
            $this->error('invalid_observability_auth_request', 400);
        }

        try {
            if ($this->service->observabilityRequiresWrite($hostId, $panelId)) {
                $this->requireWriteAccess($user);
            }

            $panel = $this->service->getObservabilityPanel($hostId, $panelId);
            $username = $this->terminalHeaderValue(
                (string)($user['username'] ?? $user['email'] ?? $user['id'] ?? 'unknown')
            );

            $this->emptyResponse(204, [
                'X-Remote-User' => $username,
                'X-Observability-Host' => $this->terminalHeaderValue($hostId),
                'X-Observability-Panel' => $this->terminalHeaderValue((string)($panel['id'] ?? $panelId)),
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'observability_panel_not_found') => 404,
                default => 403,
            };
            $this->error('vps_observability_auth_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_observability_auth_failed', 500, $e->getMessage());
        }
    }

    public function fileList(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        if ($hostId === '') {
            $this->error('missing_host_id', 400);
        }

        $rootId = trim((string)($this->input('root_id') ?? ''));
        $path = trim((string)($this->input('path') ?? ''));
        $showHidden = $this->input('hidden') === '1';

        try {
            $this->success([
                'explorer' => $this->service->listFiles($hostId, $rootId, $path, $showHidden),
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'file_root_not_found') => 404,
                str_starts_with($message, 'file_root_unreachable') => 404,
                str_starts_with($message, 'file_path_not_found') => 404,
                str_starts_with($message, 'invalid_file_path') => 400,
                default => 400,
            };
            $this->error('vps_file_list_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_file_list_failed', 500, $e->getMessage());
        }
    }

    public function fileSearch(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        if ($hostId === '') {
            $this->error('missing_host_id', 400);
        }

        $rootId = trim((string)($this->input('root_id') ?? ''));
        $path = trim((string)($this->input('path') ?? ''));
        $query = trim((string)($this->input('q') ?? ''));
        $showHidden = $this->input('hidden') === '1';

        try {
            $this->success([
                'explorer' => $this->service->searchFiles($hostId, $rootId, $path, $query, $showHidden),
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'file_root_not_found') => 404,
                str_starts_with($message, 'file_root_unreachable') => 404,
                str_starts_with($message, 'file_path_not_found') => 404,
                str_starts_with($message, 'missing_file_search_query') => 400,
                str_starts_with($message, 'invalid_file_path') => 400,
                default => 400,
            };
            $this->error('vps_file_search_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_file_search_failed', 500, $e->getMessage());
        }
    }

    public function fileRead(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $hostId = trim((string)($this->input('host_id') ?? ''));
        if ($hostId === '') {
            $this->error('missing_host_id', 400);
        }

        $rootId = trim((string)($this->input('root_id') ?? ''));
        $path = trim((string)($this->input('path') ?? ''));
        $download = $this->input('download') !== null;

        try {
            $result = $this->service->readFile($hostId, $rootId, $path, $download);
            if ($download) {
                $raw = base64_decode((string)($result['content_base64'] ?? ''), true);
                if (!is_string($raw)) {
                    throw new RuntimeException('file_download_decode_failed');
                }
                $file = is_array($result['file'] ?? null) ? $result['file'] : [];
                $fileName = basename((string)($file['relative_path'] ?? $path));
                $ext = strtolower(trim((string)($file['extension'] ?? pathinfo($fileName, PATHINFO_EXTENSION))));
                $this->rawResponse($raw, 200, [
                    'Content-Type' => (string)($file['mime'] ?? '') ?: $this->assetMimeType($ext),
                    'Content-Disposition' => 'attachment; filename="' . rawurlencode($fileName) . '"',
                ]);
            }

            unset($result['content_base64']);
            $this->success([
                'explorer' => $result,
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'file_root_not_found') => 404,
                str_starts_with($message, 'file_root_unreachable') => 404,
                str_starts_with($message, 'file_path_not_found') => 404,
                str_starts_with($message, 'file_path_not_file') => 400,
                str_starts_with($message, 'file_access_denied') => 403,
                str_starts_with($message, 'file_too_large') => 413,
                str_starts_with($message, 'invalid_file_path') => 400,
                default => 400,
            };
            $this->error('vps_file_read_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_file_read_failed', 500, $e->getMessage());
        }
    }

    public function fileMutate(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireWriteAccess($user);
        $this->requireCsrf();

        $body = $this->jsonBody();
        $this->requireFields($body, ['host_id', 'root_id', 'operation']);

        $hostId = trim((string)($body['host_id'] ?? ''));
        $rootId = trim((string)($body['root_id'] ?? ''));
        $operation = trim((string)($body['operation'] ?? ''));
        if ($hostId === '' || $rootId === '' || $operation === '') {
            $this->error('invalid_vps_file_mutation_request', 400);
        }

        try {
            $result = $this->service->mutateFile($hostId, $rootId, $operation, [
                'path' => (string)($body['path'] ?? ''),
                'target_path' => (string)($body['target_path'] ?? ''),
                'name' => (string)($body['name'] ?? ''),
                'overwrite' => !empty($body['overwrite']),
            ]);
            $this->auditLog('vps_file_mutate', [
                'host_id' => $hostId,
                'root_id' => $rootId,
                'operation' => $operation,
                'path' => (string)($body['path'] ?? ''),
                'target_path' => (string)($body['target_path'] ?? ''),
            ]);
            $this->success([
                'explorer' => $result,
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'file_root_not_found') => 404,
                str_starts_with($message, 'file_root_unreachable') => 404,
                str_starts_with($message, 'file_path_not_found') => 404,
                str_starts_with($message, 'file_exists') => 409,
                str_starts_with($message, 'file_access_denied') => 403,
                str_starts_with($message, 'file_root_read_only') => 403,
                str_starts_with($message, 'upload_too_large') => 413,
                str_starts_with($message, 'file_operation_limit') => 413,
                str_starts_with($message, 'upload_stage_failed') => 502,
                str_starts_with($message, 'zip_unavailable') => 501,
                str_starts_with($message, 'file_zip_failed') => 500,
                str_starts_with($message, 'file_unzip_failed') => 500,
                str_starts_with($message, 'file_not_zip') => 400,
                str_starts_with($message, 'invalid_file_path') => 400,
                str_starts_with($message, 'invalid_file_name') => 400,
                str_starts_with($message, 'invalid_file_operation') => 400,
                default => 400,
            };
            $this->error('vps_file_mutate_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_file_mutate_failed', 500, $e->getMessage());
        }
    }

    public function fileUpload(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);
        $this->requireWriteAccess($user);
        $this->requireCsrf();

        $hostId = trim((string)($_POST['host_id'] ?? ''));
        $rootId = trim((string)($_POST['root_id'] ?? ''));
        $path = trim((string)($_POST['path'] ?? ''));
        $overwrite = (string)($_POST['overwrite'] ?? '') === '1';
        if ($hostId === '' || $rootId === '') {
            $this->error('invalid_vps_file_upload_request', 400);
        }

        $files = $_FILES['files'] ?? null;
        if (!is_array($files) || !isset($files['name'], $files['tmp_name'], $files['error'])) {
            $this->error('missing_upload_files', 400);
        }

        $names = is_array($files['name']) ? $files['name'] : [$files['name']];
        $tmps = is_array($files['tmp_name']) ? $files['tmp_name'] : [$files['tmp_name']];
        $errors = is_array($files['error']) ? $files['error'] : [$files['error']];
        $results = [];

        try {
            foreach ($names as $index => $name) {
                $error = (int)($errors[$index] ?? UPLOAD_ERR_NO_FILE);
                if ($error !== UPLOAD_ERR_OK) {
                    throw new RuntimeException('upload_failed:' . $error);
                }
                $tmp = (string)($tmps[$index] ?? '');
                if ($tmp === '' || !is_uploaded_file($tmp)) {
                    throw new RuntimeException('upload_temp_unreadable');
                }
                $results[] = $this->service->uploadFile($hostId, $rootId, $path, $tmp, (string)$name, $overwrite);
            }
            $this->auditLog('vps_file_upload', [
                'host_id' => $hostId,
                'root_id' => $rootId,
                'path' => $path,
                'count' => count($results),
            ]);
            $this->success([
                'uploads' => $results,
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                str_starts_with($message, 'host_not_found') => 404,
                str_starts_with($message, 'file_root_not_found') => 404,
                str_starts_with($message, 'file_root_unreachable') => 404,
                str_starts_with($message, 'file_path_not_found') => 404,
                str_starts_with($message, 'file_exists') => 409,
                str_starts_with($message, 'file_access_denied') => 403,
                str_starts_with($message, 'file_root_read_only') => 403,
                str_starts_with($message, 'upload_too_large') => 413,
                str_starts_with($message, 'upload_stage_failed') => 502,
                str_starts_with($message, 'invalid_file_path') => 400,
                str_starts_with($message, 'invalid_file_name') => 400,
                default => 400,
            };
            $this->error('vps_file_upload_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_file_upload_failed', 500, $e->getMessage());
        }
    }

    public function asset(): never
    {
        $user = $this->requireAuth();
        $this->requireReadAccess($user);

        $assetPath = trim((string)($this->input('path') ?? ''));
        if ($assetPath === '') {
            $this->error('missing_path', 400);
        }

        $download = $this->input('download') !== null;

        try {
            $asset = $this->service->resolveAsset($assetPath);
            $absolutePath = (string)($asset['absolute_path'] ?? '');
            if ($absolutePath === '' || !is_file($absolutePath)) {
                throw new RuntimeException('asset_not_found:' . $assetPath);
            }

            $content = @file_get_contents($absolutePath);
            if (!is_string($content)) {
                throw new RuntimeException('asset_read_failed:' . $assetPath);
            }

            $relativePath = (string)($asset['relative_path'] ?? $assetPath);
            $ext = strtolower(trim((string)($asset['ext'] ?? pathinfo($relativePath, PATHINFO_EXTENSION))));
            $fileName = basename($relativePath);

            if ($download) {
                $this->rawResponse($content, 200, [
                    'Content-Type' => $this->assetMimeType($ext),
                    'Content-Disposition' => 'attachment; filename="' . rawurlencode($fileName) . '"',
                ]);
            }

            if (($asset['kind'] ?? '') === 'markdown' || ($asset['kind'] ?? '') === 'code') {
                $this->htmlResponse($this->renderAssetViewer($asset, $content));
            }

            if ($ext === 'html') {
                $this->htmlResponse(portal_rewrite_streamed_html($content, $relativePath), 200, [
                    'Content-Disposition' => 'inline; filename="' . rawurlencode($fileName) . '"',
                ]);
            }

            $this->rawResponse($content, 200, [
                'Content-Type' => $this->assetMimeType($ext),
                'Content-Disposition' => 'inline; filename="' . rawurlencode($fileName) . '"',
            ]);
        } catch (RuntimeException $e) {
            $this->rethrowResponse($e);
            $message = $e->getMessage();
            $status = match (true) {
                $message === 'invalid_asset_path' => 400,
                str_starts_with($message, 'asset_not_found') => 404,
                str_starts_with($message, 'asset_not_allowed') => 403,
                default => 400,
            };
            $this->error('vps_control_asset_failed', $status, $message);
        } catch (Throwable $e) {
            $this->rethrowResponse($e);
            $this->error('vps_control_asset_failed', 500, $e->getMessage());
        }
    }
}
