<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

final class VpsService
{
    private const FILE_PREVIEW_MAX_BYTES = 262144;
    private const FILE_DOWNLOAD_MAX_BYTES = 10485760;
    private const FILE_SEARCH_MAX_RESULTS = 160;
    private const FILE_UPLOAD_MAX_BYTES = 67108864;

    /** @var list<string> */
    private array $configCandidates;

    private array $configCache = [];

    private string $rootDir;

    public function __construct(string $dataDir, string $rootDir)
    {
        $dataDir = rtrim(str_replace('\\', '/', $dataDir), '/');
        $rootDir = rtrim(str_replace('\\', '/', $rootDir), '/');
        $this->rootDir = $rootDir;
        $this->configCandidates = array_values(array_unique([
            $dataDir . '/config/vps_control_tower.json',
            $rootDir . '/mom/data/config/vps_control_tower.json',
        ]));
    }

    public function getOverview(): array
    {
        $config = $this->loadConfig();
        $hosts = [];
        $declaredServices = 0;
        $activeServices = 0;
        $runningContainers = 0;
        $dnsRecords = 0;
        $siteCount = 0;
        $terminalCount = 0;
        $observabilityCount = 0;
        $fileRootCount = 0;
        $reachableHosts = 0;
        $terminalReadyHosts = 0;
        $observabilityReadyHosts = 0;
        $healthySites = 0;
        $healthyDnsRecords = 0;
        $healthyTerminals = 0;
        $healthyObservabilityPanels = 0;
        $alertCount = 0;

        foreach ((array)($config['hosts'] ?? []) as $host) {
            if (!is_array($host)) {
                continue;
            }

            $snapshot = $this->buildHostSnapshot($host);
            $hosts[] = $snapshot;

            $declaredServices += count((array)($snapshot['services'] ?? []));
            $activeServices += count(array_filter((array)($snapshot['services'] ?? []), static fn(array $service): bool => ($service['status'] ?? '') === 'active'));
            $runningContainers += count((array)($snapshot['containers'] ?? []));
            $dnsRecords += count((array)($snapshot['dns_records'] ?? []));
            $siteCount += count((array)($snapshot['sites'] ?? []));
            $terminalCount += count((array)($snapshot['terminals'] ?? []));
            $observabilityCount += count((array)($snapshot['observability'] ?? []));
            $fileRootCount += count((array)($snapshot['file_roots'] ?? []));
            $healthySites += count(array_filter((array)($snapshot['sites'] ?? []), static fn(array $site): bool => ($site['status'] ?? '') === 'ok'));
            $healthyDnsRecords += count(array_filter((array)($snapshot['dns_records'] ?? []), static fn(array $row): bool => ($row['status'] ?? '') === 'ok'));
            $healthyTerminals += count(array_filter((array)($snapshot['terminals'] ?? []), static fn(array $terminal): bool => ($terminal['status'] ?? '') === 'ok'));
            $healthyObservabilityPanels += count(array_filter((array)($snapshot['observability'] ?? []), static fn(array $panel): bool => ($panel['status'] ?? '') === 'ok'));
            $alertCount += count((array)($snapshot['alerts'] ?? []));
            $reachableHosts += (($snapshot['connection']['status'] ?? '') === 'ok') ? 1 : 0;
            $terminalReadyHosts += count(array_filter((array)($snapshot['terminals'] ?? []), static fn(array $terminal): bool => trim((string)($terminal['url'] ?? '')) !== '')) > 0 ? 1 : 0;
            $observabilityReadyHosts += count(array_filter((array)($snapshot['observability'] ?? []), static fn(array $panel): bool => trim((string)($panel['url'] ?? '')) !== '')) > 0 ? 1 : 0;
        }

        $config['hosts'] = $hosts;
        $config['metrics'] = [
            'host_count' => count($hosts),
            'reachable_hosts' => $reachableHosts,
            'declared_services' => $declaredServices,
            'active_services' => $activeServices,
            'running_containers' => $runningContainers,
            'sites_count' => $siteCount,
            'dns_records' => $dnsRecords,
            'terminals_count' => $terminalCount,
            'observability_panels' => $observabilityCount,
            'file_roots_count' => $fileRootCount,
            'terminal_ready_hosts' => $terminalReadyHosts,
            'observability_ready_hosts' => $observabilityReadyHosts,
            'healthy_sites' => $healthySites,
            'healthy_dns_records' => $healthyDnsRecords,
            'healthy_terminals' => $healthyTerminals,
            'healthy_observability_panels' => $healthyObservabilityPanels,
            'alert_count' => $alertCount,
        ];
        $config['quick_command'] = (string)($config['quick_command'] ?? (($hosts[0]['ssh_target'] ?? '') ? 'ssh ' . $hosts[0]['ssh_target'] : 'ssh root@103.110.87.55'));
        $config['setup_script'] = './ops/vps/setup-vps.sh';
        $config['architecture_doc'] = './docs/system/vps-control-tower-architecture-2026-04-09.md';
        $config['terminal_gateway'] = array_merge([
            'install_script' => './ops/vps/install-terminal-gateway.sh',
            'setup_doc' => './docs/system/vps-terminal-gateway-setup-2026-04-09.md',
            'auth_model' => 'Portal session -> nginx auth_request -> ttyd auth header',
            'stack' => 'ttyd on 127.0.0.1 behind Nginx reverse proxy',
        ], is_array($config['terminal_gateway'] ?? null) ? $config['terminal_gateway'] : []);
        $config['observability_stack'] = array_merge([
            'install_script' => './ops/vps/install-observability-stack.sh',
            'setup_doc' => './docs/system/vps-observability-stack-setup-2026-04-09.md',
            'auth_model' => 'Portal session -> nginx auth_request -> Netdata/Grafana reverse proxy',
            'stack' => 'Netdata on 19999 and Grafana on 3000 behind Nginx subpaths',
        ], is_array($config['observability_stack'] ?? null) ? $config['observability_stack'] : []);
        $config['next_features'] = is_array($config['next_features'] ?? null) && $config['next_features'] !== []
            ? array_values(array_filter($config['next_features'], 'is_array'))
            : $this->defaultNextFeatures();
        $config['operational_findings'] = is_array($config['operational_findings'] ?? null) && $config['operational_findings'] !== []
            ? array_values(array_filter($config['operational_findings'], 'is_array'))
            : $this->defaultOperationalFindings();
        $config['control_assets'] = $this->listControlAssets();
        $config['metrics']['hardening_findings'] = count($config['operational_findings']);

        return $config;
    }

    public function getHostSnapshot(string $hostId): array
    {
        $host = $this->findHost($hostId);
        return $this->buildHostSnapshot($host);
    }

    public function actionRequiresWrite(string $hostId, string $actionId): bool
    {
        $host = $this->findHost($hostId);
        $action = $this->resolveAction($host, $actionId);
        return (bool)($action['requires_write'] ?? false);
    }

    public function terminalRequiresWrite(string $hostId, string $terminalId): bool
    {
        $host = $this->findHost($hostId);
        $terminal = $this->resolveTerminal($host, $terminalId);
        return strtolower(trim((string)($terminal['access'] ?? 'read'))) === 'write';
    }

    /**
     * @return array<string, mixed>
     */
    public function getTerminal(string $hostId, string $terminalId): array
    {
        $host = $this->findHost($hostId);
        return $this->resolveTerminal($host, $terminalId);
    }

    public function observabilityRequiresWrite(string $hostId, string $panelId): bool
    {
        $host = $this->findHost($hostId);
        $panel = $this->resolveObservabilityPanel($host, $panelId);
        return strtolower(trim((string)($panel['access'] ?? 'read'))) === 'write';
    }

    /**
     * @return array<string, mixed>
     */
    public function getObservabilityPanel(string $hostId, string $panelId): array
    {
        $host = $this->findHost($hostId);
        return $this->resolveObservabilityPanel($host, $panelId);
    }

    /**
     * @return array<string, mixed>
     */
    public function listFiles(string $hostId, string $rootId, string $path = '', bool $showHidden = false): array
    {
        $host = $this->findHost($hostId);
        $root = $this->resolveFileRoot($host, $rootId);

        return $this->runFileExplorerOperation($host, $root, 'list', [
            'path' => $this->normalizeExplorerPath($path),
            'show_hidden' => $showHidden ? '1' : '0',
            'limit' => self::FILE_SEARCH_MAX_RESULTS,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function searchFiles(string $hostId, string $rootId, string $path, string $query, bool $showHidden = false): array
    {
        $query = trim($query);
        if ($query === '') {
            throw new RuntimeException('missing_file_search_query');
        }

        $host = $this->findHost($hostId);
        $root = $this->resolveFileRoot($host, $rootId);

        return $this->runFileExplorerOperation($host, $root, 'search', [
            'path' => $this->normalizeExplorerPath($path),
            'query' => substr($query, 0, 120),
            'show_hidden' => $showHidden ? '1' : '0',
            'limit' => self::FILE_SEARCH_MAX_RESULTS,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function readFile(string $hostId, string $rootId, string $path, bool $download = false): array
    {
        $path = $this->normalizeExplorerPath($path);
        if ($path === '') {
            throw new RuntimeException('missing_file_path');
        }

        $host = $this->findHost($hostId);
        $root = $this->resolveFileRoot($host, $rootId);

        return $this->runFileExplorerOperation($host, $root, 'read', [
            'path' => $path,
            'download' => $download ? '1' : '0',
            'max_bytes' => $download ? self::FILE_DOWNLOAD_MAX_BYTES : self::FILE_PREVIEW_MAX_BYTES,
        ]);
    }

    /**
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    public function mutateFile(string $hostId, string $rootId, string $operation, array $options): array
    {
        $operation = strtolower(trim($operation));
        if (!in_array($operation, ['mkdir', 'rename', 'copy', 'move', 'delete', 'zip', 'unzip'], true)) {
            throw new RuntimeException('invalid_file_operation');
        }

        $host = $this->findHost($hostId);
        $root = $this->resolveFileRoot($host, $rootId);

        return $this->runFileExplorerOperation($host, $root, $operation, [
            'path' => $this->normalizeExplorerPath((string)($options['path'] ?? '')),
            'target_path' => $this->normalizeExplorerPath((string)($options['target_path'] ?? '')),
            'name' => $this->normalizeExplorerName((string)($options['name'] ?? '')),
            'overwrite' => !empty($options['overwrite']) ? '1' : '0',
            'max_bytes' => self::FILE_UPLOAD_MAX_BYTES,
        ]);
    }

    /**
     * @return array<string, mixed>
     */
    public function uploadFile(string $hostId, string $rootId, string $directory, string $tmpPath, string $originalName, bool $overwrite = false): array
    {
        $directory = $this->normalizeExplorerPath($directory);
        $name = $this->normalizeExplorerName($originalName);
        if ($name === '') {
            throw new RuntimeException('missing_upload_name');
        }
        if ($tmpPath === '' || !is_file($tmpPath) || !is_readable($tmpPath)) {
            throw new RuntimeException('upload_temp_unreadable');
        }
        $size = (int)(@filesize($tmpPath) ?: 0);
        if ($size > self::FILE_UPLOAD_MAX_BYTES) {
            throw new RuntimeException('upload_too_large');
        }

        $host = $this->findHost($hostId);
        $root = $this->resolveFileRoot($host, $rootId);
        $remoteTmp = $this->stageUploadForHost($host, $tmpPath);

        try {
            return $this->runFileExplorerOperation($host, $root, 'upload', [
                'path' => $directory,
                'name' => $name,
                'upload_tmp' => $remoteTmp,
                'overwrite' => $overwrite ? '1' : '0',
                'max_bytes' => self::FILE_UPLOAD_MAX_BYTES,
            ]);
        } finally {
            $this->cleanupStagedUpload($host, $remoteTmp, $tmpPath);
        }
    }

    public function runAction(string $hostId, string $actionId, bool $allowWrite = false): array
    {
        $host = $this->findHost($hostId);
        $action = $this->resolveAction($host, $actionId);

        if (($action['requires_write'] ?? false) === true && $allowWrite !== true) {
            throw new RuntimeException('write_access_required:' . $actionId);
        }

        $run = $this->executeOnHost($host, (string)($action['command'] ?? ''));

        $result = [
            'host_id' => $host['id'] ?? $hostId,
            'action' => $actionId,
            'label' => $action['label'] ?? $actionId,
            'ok' => (bool)($run['ok'] ?? false),
            'exit_code' => (int)($run['exit_code'] ?? 1),
            'output' => (string)($run['output'] ?? ''),
            'executed_at' => gmdate('c'),
            'host_after' => $this->buildHostSnapshot($host),
        ];

        if (($run['error'] ?? '') !== '') {
            $result['error'] = (string)$run['error'];
        }

        return $result;
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listControlAssets(): array
    {
        $config = $this->loadConfig();
        $candidates = [
            ['id' => 'architecture_doc', 'label' => 'Architecture spec', 'path' => (string)($config['architecture_doc'] ?? '')],
            ['id' => 'bootstrap_script', 'label' => 'Bootstrap VPS script', 'path' => (string)($config['setup_script'] ?? '')],
            ['id' => 'terminal_setup_doc', 'label' => 'Terminal gateway setup', 'path' => (string)(($config['terminal_gateway']['setup_doc'] ?? '') ?: '')],
            ['id' => 'terminal_install_script', 'label' => 'Terminal gateway install script', 'path' => (string)(($config['terminal_gateway']['install_script'] ?? '') ?: '')],
            ['id' => 'observability_setup_doc', 'label' => 'Observability setup', 'path' => (string)(($config['observability_stack']['setup_doc'] ?? '') ?: '')],
            ['id' => 'observability_install_script', 'label' => 'Observability install script', 'path' => (string)(($config['observability_stack']['install_script'] ?? '') ?: '')],
        ];

        $assets = [];
        $seen = [];
        foreach ($candidates as $candidate) {
            $rawPath = trim((string)$candidate['path']);
            if ($rawPath === '') {
                continue;
            }

            try {
                $relativePath = $this->normalizeAssetPath($rawPath);
            } catch (RuntimeException) {
                continue;
            }

            if (isset($seen[$relativePath])) {
                continue;
            }
            $seen[$relativePath] = true;

            $ext = strtolower(trim((string)pathinfo($relativePath, PATHINFO_EXTENSION)));
            $assets[] = [
                'id' => (string)$candidate['id'],
                'label' => (string)$candidate['label'],
                'path' => $rawPath,
                'relative_path' => $relativePath,
                'absolute_path' => $this->rootDir . '/' . $relativePath,
                'ext' => $ext,
                'kind' => $this->assetKindForExtension($ext),
                'exists' => is_file($this->rootDir . '/' . $relativePath),
            ];
        }

        return $assets;
    }

    /**
     * @return array<string, mixed>
     */
    public function resolveAsset(string $assetPath): array
    {
        $normalized = $this->normalizeAssetPath($assetPath);
        foreach ($this->listControlAssets() as $asset) {
            if (($asset['relative_path'] ?? '') !== $normalized) {
                continue;
            }

            if (($asset['exists'] ?? false) !== true) {
                throw new RuntimeException('asset_not_found:' . $normalized);
            }

            return $asset;
        }

        throw new RuntimeException('asset_not_allowed:' . $normalized);
    }

    private function loadConfig(): array
    {
        if ($this->configCache !== []) {
            return $this->configCache;
        }

        foreach ($this->configCandidates as $path) {
            if (!is_file($path)) {
                continue;
            }

            $raw = @file_get_contents($path);
            if (!is_string($raw) || trim($raw) === '') {
                continue;
            }

            $decoded = json_decode($raw, true);
            if (is_array($decoded)) {
                $this->configCache = $decoded;
                return $this->configCache;
            }
        }

        $this->configCache = $this->defaultConfig();
        return $this->configCache;
    }

    /**
     * @return array<string, mixed>
     */
    private function defaultConfig(): array
    {
        return [
            'product' => 'HESEM VPS Control Tower',
            'quick_command' => 'ssh root@103.110.87.55',
            'dns_strategy' => [
                'current_mode' => 'AZDIGI client-portal DNS',
                'limitation' => 'Zone vẫn đang nằm trong giao diện nhà cung cấp, nên không thể trở thành control plane API chuẩn chỉ bằng cách bọc thêm HTML.',
                'recommended_next' => 'Chuyển zone sang Cloudflare API hoặc PowerDNS authoritative API.',
            ],
            'architecture_layers' => [
                [
                    'title' => 'UI control plane',
                    'body' => 'Portal hiện tại là lớp orchestration và audit, không phải nơi chạy PTY trực tiếp.',
                    'points' => [
                        'Render host/service/container/DNS state.',
                        'Gọi safe action whitelisted qua backend.',
                        'Mở terminal gateway đã harden thay vì shell tùy ý.',
                    ],
                ],
                [
                    'title' => 'Terminal gateway',
                    'body' => 'Dùng xterm.js trong browser và ttyd/Wetty/Bastion ở lớp terminal riêng.',
                    'points' => [
                        'Không expose arbitrary shell từ PHP.',
                        'Có thể gắn MFA, RBAC, SSH key và log ở lớp gateway.',
                        'Tối ưu cho dùng hằng ngày hơn macOS Terminal mặc định.',
                    ],
                ],
                [
                    'title' => 'Observability',
                    'body' => 'Dùng Netdata hoặc exporter + OTel + Grafana cho metric, alert và drill-down.',
                    'points' => [
                        'Tách metric/alert khỏi shell log thủ công.',
                        'Thấy CPU, RAM, disk, network, process và anomaly.',
                        'Gắn alert theo SLA thật của hệ thống.',
                    ],
                ],
                [
                    'title' => 'DNS and ingress',
                    'body' => 'DNS phải nằm ở nơi có API hoặc authoritative stack do bạn tự giữ.',
                    'points' => [
                        'Nếu tiếp tục dùng portal provider không API, dashboard không thể sửa record an toàn.',
                        'Ingress, TLS, reverse proxy nên được quản qua inventory + runbook thống nhất.',
                    ],
                ],
            ],
            'references' => [
                ['title' => 'xterm.js', 'url' => 'https://xtermjs.org/docs/', 'note' => 'Terminal UI render trong browser.'],
                ['title' => 'ttyd', 'url' => 'https://tsl0922.github.io/ttyd/', 'note' => 'Share terminal over the web để biến browser thành shell chuẩn hơn Terminal mặc định.'],
                ['title' => 'ttyd Releases', 'url' => 'https://github.com/tsl0922/ttyd/releases', 'note' => 'Nguồn binary phát hành chính thức cho terminal gateway.'],
                ['title' => 'ttyd Auth Proxy', 'url' => 'https://github.com/tsl0922/ttyd/wiki/Auth-Proxy', 'note' => 'Mẫu reverse proxy dùng header auth cho ttyd phía sau Nginx.'],
                ['title' => 'Netdata Agent', 'url' => 'https://learn.netdata.cloud/docs/netdata-agent/installation/linux', 'note' => 'Realtime host telemetry.'],
                ['title' => 'Netdata behind Nginx', 'url' => 'https://learn.netdata.cloud/docs/netdata-agent/configuration/securing-agents/running-the-agent-behind-a-reverse-proxy/nginx', 'note' => 'Cấu hình reverse proxy Netdata dưới subpath qua Nginx.'],
                ['title' => 'Portainer Edge Agent', 'url' => 'https://docs.portainer.io/advanced/edge-agent', 'note' => 'Quản lý estate Docker nhiều host.'],
                ['title' => 'Grafana Alerting', 'url' => 'https://grafana.com/docs/grafana/latest/alerting/', 'note' => 'Alerting và dashboard cho control plane.'],
                ['title' => 'Grafana Debian/Ubuntu install', 'url' => 'https://grafana.com/docs/grafana/latest/setup-grafana/installation/debian/', 'note' => 'APT install chính thức cho Grafana trên Ubuntu/Debian.'],
                ['title' => 'Grafana Auth Proxy', 'url' => 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-access/configure-authentication/auth-proxy/', 'note' => 'Dùng reverse proxy để tin cậy header user từ portal.'],
                ['title' => 'Grafana allow_embedding', 'url' => 'https://grafana.com/docs/grafana/latest/setup-grafana/configure-grafana/', 'note' => 'Cho phép nhúng Grafana vào iframe khi self-host.'],
                ['title' => 'Cloudflare DNS API', 'url' => 'https://developers.cloudflare.com/api/resources/dns/subresources/records/methods/edit/', 'note' => 'API-first DNS nếu rời AZDIGI DNS portal.'],
                ['title' => 'PowerDNS HTTP API', 'url' => 'https://doc.powerdns.com/authoritative/http-api/', 'note' => 'Lựa chọn self-host authoritative DNS.'],
            ],
            'runbook_steps' => [
                ['phase' => 'P0', 'title' => 'Inventory and bastion', 'body' => 'Khóa inventory host, service, site, DNS; dựng bastion SSH và key management trước khi nói đến dashboard đẹp.'],
                ['phase' => 'P1', 'title' => 'Read-only control tower', 'body' => 'Hiện trạng host, service, Docker, ingress, DNS và log probes. Đặt dashboard làm nguồn sự thật vận hành.'],
                ['phase' => 'P2', 'title' => 'Safe actions', 'body' => 'Chỉ bật action whitelisted như health snapshot, nginx test, docker ps, recent logs. Chưa mở arbitrary shell.'],
                ['phase' => 'P3', 'title' => 'Terminal gateway', 'body' => 'Nối xterm.js với ttyd hoặc gateway tương đương để dùng shell mạnh, trực quan, có auth và audit.'],
                ['phase' => 'P4', 'title' => 'Observability stack', 'body' => 'Bật Netdata và Grafana sau cùng domain qua Nginx auth_request để có metrics, dashboard và alert trong cùng control plane.'],
                ['phase' => 'P5', 'title' => 'DNS API migration', 'body' => 'Di chuyển zone khỏi nơi chỉ có web portal sang nơi có API thật để dashboard sửa DNS được an toàn.'],
            ],
            'quick_commands' => [
                ['label' => 'SSH primary VPS', 'command' => 'ssh root@103.110.87.55'],
                ['label' => 'Run bootstrap remotely', 'command' => 'ssh root@103.110.87.55 "bash -s" < mom/ops/vps/setup-vps.sh'],
                ['label' => 'Install terminal gateway', 'command' => 'ssh root@103.110.87.55 "bash -s" < mom/ops/vps/install-terminal-gateway.sh'],
                ['label' => 'Install observability stack', 'command' => 'ssh root@103.110.87.55 "bash -s" < mom/ops/vps/install-observability-stack.sh'],
            ],
            'terminal_gateway' => [
                'install_script' => './ops/vps/install-terminal-gateway.sh',
                'setup_doc' => './docs/system/vps-terminal-gateway-setup-2026-04-09.md',
                'auth_model' => 'Portal session -> nginx auth_request -> ttyd auth header',
                'stack' => 'ttyd 1.7.x behind Nginx reverse proxy on 127.0.0.1',
            ],
            'observability_stack' => [
                'install_script' => './ops/vps/install-observability-stack.sh',
                'setup_doc' => './docs/system/vps-observability-stack-setup-2026-04-09.md',
                'auth_model' => 'Portal session -> nginx auth_request -> Netdata/Grafana reverse proxy',
                'stack' => 'Netdata 19999 and Grafana 3000 behind Nginx auth-proxied subpaths',
            ],
            'next_features' => $this->defaultNextFeatures(),
            'hosts' => [
                [
                    'id' => 'hesem-vps-01',
                    'label' => 'HESEM Primary VPS',
                    'provider' => 'AZDIGI VPS',
                    'mode' => 'ssh',
                    'ssh_target' => 'root@103.110.87.55',
                    'public_ip' => '103.110.87.55',
                    'roles' => ['reverse-proxy', 'portal', 'postgres', 'terminal-gateway', 'observability', 'file-explorer'],
                    'services' => [
                        ['name' => 'nginx', 'label' => 'Nginx', 'kind' => 'systemd', 'unit_candidates' => ['nginx']],
                        ['name' => 'php-fpm', 'label' => 'PHP-FPM', 'kind' => 'systemd', 'unit_candidates' => ['php8.2-fpm', 'php8.3-fpm', 'php8.4-fpm', 'php-fpm']],
                        ['name' => 'postgresql', 'label' => 'PostgreSQL', 'kind' => 'systemd', 'unit_candidates' => ['postgresql']],
                        ['name' => 'hesem-ttyd-primary', 'label' => 'Terminal gateway (primary)', 'kind' => 'systemd', 'unit_candidates' => ['hesem-ttyd-primary']],
                        ['name' => 'hesem-ttyd-readonly', 'label' => 'Terminal gateway (readonly)', 'kind' => 'systemd', 'unit_candidates' => ['hesem-ttyd-readonly']],
                        ['name' => 'netdata', 'label' => 'Netdata Agent', 'kind' => 'systemd', 'unit_candidates' => ['netdata']],
                        ['name' => 'grafana-server', 'label' => 'Grafana', 'kind' => 'systemd', 'unit_candidates' => ['grafana-server']],
                    ],
                    'safe_actions' => ['health', 'docker_ps', 'nginx_test', 'ports', 'recent_logs', 'terminal_gateway_logs', 'observability_logs'],
                    'sites' => [
                        ['host' => 'qms.hesem.com.vn', 'url' => 'https://qms.hesem.com.vn', 'role' => 'Main portal'],
                        ['host' => 'eqms.hesemeng.com', 'url' => 'https://eqms.hesemeng.com', 'role' => 'Portal alias'],
                        ['host' => 'files.hesemeng.com', 'url' => 'https://files.hesemeng.com', 'role' => 'Portal alias'],
                        ['host' => 'portainer.hesemeng.com', 'url' => 'https://portainer.hesemeng.com', 'role' => 'Portal alias'],
                    ],
                    'dns_records' => [
                        ['name' => 'hesemeng.com', 'type' => 'A', 'value' => '103.110.87.55'],
                        ['name' => 'eqms.hesemeng.com', 'type' => 'A', 'value' => '103.110.87.55'],
                        ['name' => 'files.hesemeng.com', 'type' => 'A', 'value' => '103.110.87.55'],
                        ['name' => 'portainer.hesemeng.com', 'type' => 'A', 'value' => '103.110.87.55'],
                        ['name' => 'www.hesemeng.com', 'type' => 'CNAME', 'value' => 'hesemeng.com'],
                    ],
                    'terminals' => [
                        [
                            'id' => 'primary',
                            'label' => 'Primary shell',
                            'url' => '/ops/terminal/primary/',
                            'note' => 'Interactive ttyd shell protected by portal session through nginx auth_request.',
                            'embed' => true,
                            'access' => 'write',
                            'service_name' => 'hesem-ttyd-primary',
                            'internal_url' => 'http://127.0.0.1:7681/',
                            'expected_http_codes' => [200, 401, 403, 407],
                        ],
                        [
                            'id' => 'readonly',
                            'label' => 'Readonly diagnostics',
                            'url' => '/ops/terminal/readonly/',
                            'note' => 'Readonly ttyd diagnostics view for fast triage without write access.',
                            'embed' => true,
                            'access' => 'read',
                            'service_name' => 'hesem-ttyd-readonly',
                            'internal_url' => 'http://127.0.0.1:7682/',
                            'expected_http_codes' => [200, 401, 403, 407],
                        ],
                    ],
                    'observability' => [
                        [
                            'id' => 'netdata',
                            'label' => 'Netdata live metrics',
                            'url' => '/ops/netdata/',
                            'note' => 'Realtime CPU, RAM, disk, network and process telemetry through Netdata behind Nginx.',
                            'embed' => true,
                            'kind' => 'metrics',
                            'access' => 'read',
                            'service_name' => 'netdata',
                            'internal_url' => 'http://127.0.0.1:19999/api/v1/info',
                            'expected_http_codes' => [200],
                        ],
                        [
                            'id' => 'grafana',
                            'label' => 'Grafana dashboards',
                            'url' => '/ops/grafana/',
                            'note' => 'Embedded Grafana workspace protected by auth proxy for team dashboards and alerts.',
                            'embed' => true,
                            'kind' => 'dashboard',
                            'access' => 'read',
                            'service_name' => 'grafana-server',
                            'internal_url' => 'http://127.0.0.1:3000/api/health',
                            'expected_http_codes' => [200],
                        ],
                    ],
                    'file_roots' => [
                        [
                            'id' => 'portal_app',
                            'label' => 'Portal app',
                            'path' => '/var/www/eqms.hesemeng.com/mom',
                            'note' => 'Application code, docs, styles, scripts and API sources.',
                        ],
                        [
                            'id' => 'portal_data',
                            'label' => 'Portal data',
                            'path' => '/var/www/eqms.hesemeng.com/mom/data',
                            'note' => 'Runtime data and logs with secret preview/download guardrails.',
                        ],
                        [
                            'id' => 'nginx',
                            'label' => 'Nginx config',
                            'path' => '/etc/nginx',
                            'note' => 'Ingress, TLS and reverse proxy configuration.',
                        ],
                        [
                            'id' => 'nginx_logs',
                            'label' => 'Nginx logs',
                            'path' => '/var/log/nginx',
                            'note' => 'Access and error logs for live request triage.',
                        ],
                        [
                            'id' => 'systemd',
                            'label' => 'Systemd units',
                            'path' => '/etc/systemd/system',
                            'note' => 'Service units for terminal, observability and app runtime.',
                        ],
                    ],
                ],
            ],
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function defaultNextFeatures(): array
    {
        return [
            [
                'title' => 'Multi-host observability hub',
                'status' => 'next',
                'url' => 'https://learn.netdata.cloud/docs/netdata-parents/parent-child-configuration-reference',
                'body' => 'Dựng Netdata parent-child để gom nhiều VPS vào một điểm quan sát trung tâm, thay vì mỗi host tự đứng riêng.',
            ],
            [
                'title' => 'Dashboards as code',
                'status' => 'next',
                'url' => 'https://grafana.com/docs/grafana/latest/administration/provisioning/',
                'body' => 'Provision datasource và dashboard bằng file trong Git để Grafana không bị drift khi sửa tay trên UI.',
            ],
            [
                'title' => 'Container fleet control',
                'status' => 'later',
                'url' => 'https://docs.portainer.io/admin/environments/add/docker/edge',
                'body' => 'Nếu số Docker workload tăng, nối Portainer Edge Agent để control plane quản nhiều host và group/tag môi trường.',
            ],
            [
                'title' => 'Scoped DNS automation',
                'status' => 'later',
                'url' => 'https://developers.cloudflare.com/fundamentals/api/get-started/create-token/',
                'body' => 'Chuyển DNS write sang API token giới hạn theo zone và quyền, để dashboard sửa record mà không cần quay lại portal thủ công.',
            ],
        ];
    }

    /**
     * @return list<array<string, string>>
     */
    private function defaultOperationalFindings(): array
    {
        return [
            [
                'title' => 'Netdata PostgreSQL collector must be explicit',
                'status' => 'warning',
                'url' => 'https://learn.netdata.cloud/docs/collecting-metrics/collectors/databases/postgresql',
                'body' => 'Do not let Netdata guess PostgreSQL credentials. Keep the collector disabled by default and enable it only when a valid DSN or dedicated read-only role is provisioned.',
            ],
            [
                'title' => 'Grafana should stay provisioned, not hand-tuned',
                'status' => 'next',
                'url' => 'https://grafana.com/docs/grafana/latest/administration/provisioning/',
                'body' => 'Provision dashboards and datasources from Git so the control plane does not drift after manual edits in Grafana.',
            ],
            [
                'title' => 'ttyd auth proxy stays behind a trusted gateway',
                'status' => 'ok',
                'url' => 'https://github.com/tsl0922/ttyd/wiki/Auth-Proxy',
                'body' => 'Keep ttyd bound to loopback or an internal socket and let Nginx inject the auth header. The terminal gateway should not trust arbitrary client-supplied headers.',
            ],
        ];
    }

    private function normalizeAssetPath(string $path): string
    {
        $normalized = trim(str_replace('\\', '/', $path));
        if ($normalized === '') {
            throw new RuntimeException('invalid_asset_path');
        }

        while (str_starts_with($normalized, './')) {
            $normalized = substr($normalized, 2);
        }

        if (
            str_starts_with($normalized, 'docs/')
            || str_starts_with($normalized, 'ops/')
            || str_starts_with($normalized, 'scripts/')
            || str_starts_with($normalized, 'styles/')
        ) {
            $normalized = 'mom/' . $normalized;
        }

        try {
            $normalized = safe_rel_path($normalized);
        } catch (\Throwable) {
            throw new RuntimeException('invalid_asset_path');
        }
        if (!str_starts_with($normalized, 'mom/')) {
            throw new RuntimeException('asset_not_allowed:' . $normalized);
        }

        return $normalized;
    }

    private function assetKindForExtension(string $ext): string
    {
        return match (strtolower(trim($ext))) {
            'md', 'markdown' => 'markdown',
            'sh', 'bash', 'zsh', 'txt', 'log', 'env', 'ini', 'conf', 'yaml', 'yml', 'json' => 'code',
            default => 'stream',
        };
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function fileRootsForHost(array $host): array
    {
        $declared = array_values(array_filter((array)($host['file_roots'] ?? []), 'is_array'));
        $roots = $declared !== [] ? $declared : $this->defaultFileRoots($host);
        $normalized = [];
        $seen = [];
        foreach ($roots as $index => $root) {
            try {
                $item = $this->normalizeFileRoot($root, $index);
            } catch (RuntimeException) {
                continue;
            }
            if (isset($seen[$item['id']])) {
                continue;
            }
            $seen[$item['id']] = true;
            $normalized[] = $item;
        }

        return $normalized;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function defaultFileRoots(array $host): array
    {
        $local = $this->resolveExecutionMode($host) === 'local';
        $portalRoot = $local ? ($this->rootDir . '/mom') : '/var/www/eqms.hesemeng.com/mom';

        return [
            [
                'id' => 'portal',
                'label' => 'Portal app',
                'path' => $portalRoot,
                'note' => 'Application code and deployed portal assets.',
            ],
            [
                'id' => 'portal_data',
                'label' => 'Portal data',
                'path' => $portalRoot . '/data',
                'note' => 'Runtime data directory with guarded secret previews.',
            ],
            [
                'id' => 'nginx',
                'label' => 'Nginx config',
                'path' => '/etc/nginx',
                'note' => 'Ingress and reverse-proxy configuration.',
            ],
            [
                'id' => 'nginx_logs',
                'label' => 'Nginx logs',
                'path' => '/var/log/nginx',
                'note' => 'Access and error logs for live ingress triage.',
            ],
            [
                'id' => 'systemd',
                'label' => 'Systemd units',
                'path' => '/etc/systemd/system',
                'note' => 'Local service unit files used by the control plane.',
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function normalizeFileRoot(array $root, int $index): array
    {
        $rawPath = trim((string)($root['path'] ?? ''));
        if ($rawPath === '') {
            throw new RuntimeException('invalid_file_root_path');
        }
        $path = str_replace('\\', '/', $rawPath);
        while (str_starts_with($path, './')) {
            $path = $this->rootDir . '/' . substr($path, 2);
        }
        $path = preg_replace('#/+#', '/', $path);
        $path = is_string($path) ? rtrim($path, '/') : '';
        if ($path === '' || !str_starts_with($path, '/')) {
            throw new RuntimeException('invalid_file_root_path');
        }

        $id = strtolower(trim((string)($root['id'] ?? '')));
        $id = preg_replace('/[^a-z0-9._-]+/', '-', $id);
        $id = is_string($id) ? trim($id, '-') : '';
        if ($id === '') {
            $id = 'root-' . ($index + 1);
        }

        $denyPatterns = array_values(array_unique(array_filter(array_map(
            static fn($value): string => strtolower(trim((string)$value)),
            array_merge($this->defaultFileDenyPatterns(), (array)($root['deny_patterns'] ?? []))
        ), static fn(string $value): bool => $value !== '')));

        $readOnly = filter_var($root['read_only'] ?? false, FILTER_VALIDATE_BOOLEAN);

        return [
            'id' => $id,
            'label' => trim((string)($root['label'] ?? '')) ?: basename($path),
            'path' => $path,
            'note' => trim((string)($root['note'] ?? '')),
            'read_only' => $readOnly,
            'max_preview_bytes' => max(1024, min((int)($root['max_preview_bytes'] ?? self::FILE_PREVIEW_MAX_BYTES), self::FILE_PREVIEW_MAX_BYTES)),
            'max_download_bytes' => max(1024, min((int)($root['max_download_bytes'] ?? self::FILE_DOWNLOAD_MAX_BYTES), self::FILE_DOWNLOAD_MAX_BYTES)),
            'max_upload_bytes' => max(1024, min((int)($root['max_upload_bytes'] ?? self::FILE_UPLOAD_MAX_BYTES), self::FILE_UPLOAD_MAX_BYTES)),
            'deny_patterns' => $denyPatterns,
            'policy' => $readOnly ? 'allowlist-root/read-only/no-dotdot/secret-deny' : 'allowlist-root/write-enabled/no-dotdot/secret-deny',
        ];
    }

    /**
     * @return list<string>
     */
    private function defaultFileDenyPatterns(): array
    {
        return [
            '.env',
            '.env.local',
            '.env.production',
            '*.key',
            '*.pem',
            '*.p12',
            '*.pfx',
            'id_rsa',
            'id_ed25519',
            'authorized_keys',
            'shadow',
            'gshadow',
            'private_key',
            'database-password',
            'secret',
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveFileRoot(array $host, string $rootId): array
    {
        $roots = $this->fileRootsForHost($host);
        if ($roots === []) {
            throw new RuntimeException('file_root_not_configured');
        }

        $rootId = trim($rootId);
        if ($rootId === '') {
            return $roots[0];
        }

        foreach ($roots as $root) {
            if ((string)($root['id'] ?? '') === $rootId) {
                return $root;
            }
        }

        throw new RuntimeException('file_root_not_found:' . $rootId);
    }

    private function normalizeExplorerPath(string $path): string
    {
        $normalized = trim(str_replace('\\', '/', $path));
        $normalized = preg_replace('#/+#', '/', $normalized);
        $normalized = is_string($normalized) ? ltrim($normalized, '/') : '';
        if ($normalized === '' || $normalized === '.') {
            return '';
        }

        $segments = [];
        foreach (explode('/', $normalized) as $segment) {
            $segment = trim($segment);
            if ($segment === '' || $segment === '.') {
                continue;
            }
            if ($segment === '..' || str_contains($segment, "\0")) {
                throw new RuntimeException('invalid_file_path');
            }
            $segments[] = $segment;
        }

        return implode('/', $segments);
    }

    private function normalizeExplorerName(string $name): string
    {
        $name = trim(str_replace(["\\", '/', "\0"], '', $name));
        if ($name === '' || $name === '.' || $name === '..') {
            return '';
        }
        $name = preg_replace('/[\x00-\x1F\x7F]+/', '', $name);
        $name = is_string($name) ? trim($name) : '';
        if ($name === '' || $name === '.' || $name === '..') {
            return '';
        }
        return substr($name, 0, 180);
    }

    /**
     * @param array<string, mixed> $host
     * @param array<string, mixed> $root
     * @param array<string, mixed> $options
     * @return array<string, mixed>
     */
    private function runFileExplorerOperation(array $host, array $root, string $operation, array $options): array
    {
        $command = $this->fileExplorerCommand($operation, $root, $options);
        $run = $this->executeOnHost($host, $command);
        $output = trim((string)($run['output'] ?? ''));

        if ($output === '') {
            throw new RuntimeException((string)($run['error'] ?? 'file_explorer_failed'));
        }

        $decoded = json_decode($output, true);
        if (!is_array($decoded)) {
            throw new RuntimeException('file_explorer_bad_response');
        }

        if (($decoded['ok'] ?? false) !== true) {
            throw new RuntimeException((string)($decoded['error'] ?? 'file_explorer_failed'));
        }

        unset($decoded['ok']);
        $decoded['host_id'] = (string)($host['id'] ?? '');
        $decoded['root'] = [
            'id' => (string)($root['id'] ?? ''),
            'label' => (string)($root['label'] ?? ''),
            'path' => (string)($root['path'] ?? ''),
            'note' => (string)($root['note'] ?? ''),
            'read_only' => (bool)($root['read_only'] ?? false),
            'policy' => (string)($root['policy'] ?? ''),
        ];

        return $decoded;
    }

    /**
     * @param array<string, mixed> $root
     * @param array<string, mixed> $options
     */
    private function fileExplorerCommand(string $operation, array $root, array $options): string
    {
        $env = [
            'VPS_EXPLORER_OP' => $operation,
            'VPS_EXPLORER_ROOT' => (string)($root['path'] ?? ''),
            'VPS_EXPLORER_PATH' => (string)($options['path'] ?? ''),
            'VPS_EXPLORER_TARGET_PATH' => (string)($options['target_path'] ?? ''),
            'VPS_EXPLORER_NAME' => (string)($options['name'] ?? ''),
            'VPS_EXPLORER_UPLOAD_TMP' => (string)($options['upload_tmp'] ?? ''),
            'VPS_EXPLORER_QUERY' => (string)($options['query'] ?? ''),
            'VPS_EXPLORER_HIDDEN' => (string)($options['show_hidden'] ?? '0'),
            'VPS_EXPLORER_LIMIT' => (string)($options['limit'] ?? self::FILE_SEARCH_MAX_RESULTS),
            'VPS_EXPLORER_MAX_BYTES' => (string)($options['max_bytes'] ?? ($root['max_preview_bytes'] ?? self::FILE_PREVIEW_MAX_BYTES)),
            'VPS_EXPLORER_DOWNLOAD' => (string)($options['download'] ?? '0'),
            'VPS_EXPLORER_OVERWRITE' => (string)($options['overwrite'] ?? '0'),
            'VPS_EXPLORER_READ_ONLY' => !empty($root['read_only']) ? '1' : '0',
            'VPS_EXPLORER_DENY' => base64_encode((string)json_encode((array)($root['deny_patterns'] ?? []), JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)),
        ];

        $assignments = [];
        foreach ($env as $key => $value) {
            $assignments[] = $key . '=' . escapeshellarg($value);
        }

        return implode(' ', $assignments)
            . " php <<'__VPS_FILE_EXPLORER_PHP__'\n"
            . $this->fileExplorerPhpScript()
            . "\n__VPS_FILE_EXPLORER_PHP__";
    }

    private function fileExplorerPhpScript(): string
    {
        return <<<'PHP'
<?php
declare(strict_types=1);

function out(array $payload): never {
    echo json_encode($payload, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE);
    exit(0);
}

function fail(string $error, array $extra = []): never {
    out(array_merge(['ok' => false, 'error' => $error], $extra));
}

function norm_rel(string $path): string {
    $path = trim(str_replace('\\', '/', $path));
    $path = preg_replace('#/+#', '/', $path) ?: '';
    $path = ltrim($path, '/');
    if ($path === '' || $path === '.') return '';
    $parts = [];
    foreach (explode('/', $path) as $part) {
        $part = trim($part);
        if ($part === '' || $part === '.') continue;
        if ($part === '..' || str_contains($part, "\0")) fail('invalid_file_path');
        $parts[] = $part;
    }
    return implode('/', $parts);
}

function inside_root(string $path, string $root): bool {
    $path = rtrim(str_replace('\\', '/', $path), '/');
    $root = rtrim(str_replace('\\', '/', $root), '/');
    return $path === $root || str_starts_with($path . '/', $root . '/');
}

function denied_rel(string $rel, array $deny): bool {
    $relLower = strtolower(trim(str_replace('\\', '/', $rel), '/'));
    $baseLower = strtolower(basename($relLower));
    foreach ($deny as $pattern) {
        $pattern = strtolower(trim((string)$pattern));
        if ($pattern === '') continue;
        if (function_exists('fnmatch') && (fnmatch($pattern, $baseLower) || fnmatch($pattern, $relLower))) return true;
        if (str_starts_with($pattern, '*.')) {
            $suffix = substr($pattern, 1);
            if ($suffix !== '' && str_ends_with($baseLower, $suffix)) return true;
        }
        if ($baseLower === $pattern || $relLower === $pattern || str_contains($relLower, '/' . $pattern)) return true;
    }
    return false;
}

function hidden_rel(string $rel): bool {
    foreach (explode('/', trim($rel, '/')) as $part) {
        if ($part !== '' && str_starts_with($part, '.')) return true;
    }
    return false;
}

function text_like(string $path, string $ext, string $mime): bool {
    $textExt = ['txt','log','md','markdown','php','js','css','html','htm','json','yaml','yml','xml','csv','tsv','sql','sh','bash','zsh','ini','conf','service','timer','env','vue','ts','tsx','jsx','py','rb','go','java','c','h','cpp','hpp'];
    if (in_array($ext, $textExt, true)) return true;
    if (str_starts_with(strtolower($mime), 'text/')) return true;
    $sample = @file_get_contents($path, false, null, 0, 4096);
    if (!is_string($sample) || $sample === '') return false;
    if (str_contains($sample, "\0")) return false;
    $len = strlen($sample);
    $bad = 0;
    for ($i = 0; $i < $len; $i += 1) {
        $ord = ord($sample[$i]);
        if ($ord < 9 || ($ord > 13 && $ord < 32)) $bad += 1;
    }
    return ($bad / max(1, $len)) < 0.05;
}

function child_count(string $dir, bool $showHidden): int {
    $items = @scandir($dir);
    if (!is_array($items)) return 0;
    $count = 0;
    foreach ($items as $name) {
        if ($name === '.' || $name === '..') continue;
        if (!$showHidden && str_starts_with($name, '.')) continue;
        $count += 1;
        if ($count >= 999) return $count;
    }
    return $count;
}

function clean_leaf_name(string $name): string {
    $name = trim(str_replace(["\\", '/', "\0"], '', $name));
    $name = preg_replace('/[\x00-\x1F\x7F]+/', '', $name) ?: '';
    $name = trim($name);
    if ($name === '' || $name === '.' || $name === '..') fail('invalid_file_name');
    return substr($name, 0, 180);
}

function ensure_write_allowed(bool $readOnly): void {
    if ($readOnly) fail('file_root_read_only');
}

function existing_real(string $rootReal, string $rel): string {
    $target = $rootReal . ($rel !== '' ? '/' . $rel : '');
    $real = realpath($target);
    if (!is_string($real) || !inside_root($real, $rootReal)) fail('file_path_not_found');
    return $real;
}

function parent_real(string $rootReal, string $rel): string {
    $parent = $rel === '' ? $rootReal : existing_real($rootReal, $rel);
    if (!is_dir($parent)) fail('file_path_not_directory');
    return $parent;
}

function join_rel_path(string $parentRel, string $name): string {
    $parentRel = norm_rel($parentRel);
    $name = clean_leaf_name($name);
    return $parentRel === '' ? $name : ($parentRel . '/' . $name);
}

function ensure_rel_not_denied(string $rel, array $deny): void {
    if (denied_rel($rel, $deny)) fail('file_access_denied');
}

function destination_for(string $rootReal, string $parentRel, string $name, bool $overwrite, array $deny): array {
    $parent = parent_real($rootReal, $parentRel);
    $destRel = join_rel_path($parentRel, $name);
    ensure_rel_not_denied($destRel, $deny);
    $dest = $parent . '/' . clean_leaf_name($name);
    $existing = realpath($dest);
    if (is_string($existing) && !inside_root($existing, $rootReal)) fail('file_path_not_found');
    if (file_exists($dest) && !$overwrite) fail('file_exists');
    return [$dest, $destRel, $parent];
}

function rrmdir_guarded(string $path, string $rootReal, int &$count = 0): void {
    $real = realpath($path);
    if (!is_string($real) || !inside_root($real, $rootReal)) fail('file_path_not_found');
    if (is_link($path) || is_file($path)) {
        if (!@unlink($path)) fail('file_delete_failed');
        $count += 1;
        return;
    }
    if (!is_dir($path)) fail('file_path_not_found');
    $items = @scandir($path);
    if (!is_array($items)) fail('file_directory_read_failed');
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $count += 1;
        if ($count > 6000) fail('file_operation_limit');
        rrmdir_guarded($path . '/' . $item, $rootReal, $count);
    }
    if (!@rmdir($path)) fail('file_delete_failed');
}

function copy_guarded(string $source, string $dest, string $rootReal, int &$count = 0): void {
    $sourceReal = realpath($source);
    if (!is_string($sourceReal) || !inside_root($sourceReal, $rootReal)) fail('file_path_not_found');
    if (is_link($source)) fail('file_symlink_not_supported');
    if (is_file($source)) {
        if (!@copy($source, $dest)) fail('file_copy_failed');
        @chmod($dest, (int)(@fileperms($source) ?: 0644) & 0777);
        $count += 1;
        return;
    }
    if (!is_dir($source)) fail('file_path_not_found');
    if (str_starts_with(rtrim($dest, '/') . '/', rtrim($sourceReal, '/') . '/')) fail('file_invalid_destination');
    if (!is_dir($dest) && !@mkdir($dest, 0775, true)) fail('file_copy_failed');
    $items = @scandir($source);
    if (!is_array($items)) fail('file_directory_read_failed');
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $count += 1;
        if ($count > 6000) fail('file_operation_limit');
        copy_guarded($source . '/' . $item, $dest . '/' . $item, $rootReal, $count);
    }
}

function add_to_zip_guarded(ZipArchive $zip, string $source, string $baseRel, string $rootReal, array $deny, int &$count = 0): void {
    $sourceReal = realpath($source);
    if (!is_string($sourceReal) || !inside_root($sourceReal, $rootReal)) fail('file_path_not_found');
    $baseRel = trim(str_replace('\\', '/', $baseRel), '/');
    ensure_rel_not_denied($baseRel, $deny);
    if (is_link($source)) fail('file_symlink_not_supported');
    if (is_file($sourceReal)) {
        if (!$zip->addFile($sourceReal, $baseRel)) fail('file_zip_failed');
        $count += 1;
        return;
    }
    if (!is_dir($sourceReal)) fail('file_path_not_found');
    $dirRel = $baseRel === '' ? basename($sourceReal) : $baseRel;
    $zip->addEmptyDir($dirRel);
    $items = @scandir($sourceReal);
    if (!is_array($items)) fail('file_directory_read_failed');
    foreach ($items as $item) {
        if ($item === '.' || $item === '..') continue;
        $childAbs = $sourceReal . '/' . $item;
        $childRel = $dirRel === '' ? $item : ($dirRel . '/' . $item);
        ensure_rel_not_denied($childRel, $deny);
        $count += 1;
        if ($count > 6000) fail('file_operation_limit');
        add_to_zip_guarded($zip, $childAbs, $childRel, $rootReal, $deny, $count);
    }
}

function unzip_guarded(string $zipPath, string $destDir, string $destRel, string $rootReal, array $deny, int &$count = 0): void {
    if (!class_exists('ZipArchive')) fail('zip_unavailable');
    $zipReal = realpath($zipPath);
    $destReal = realpath($destDir);
    if (!is_string($zipReal) || !inside_root($zipReal, $rootReal) || !is_file($zipReal)) fail('file_path_not_file');
    if (!is_string($destReal) || !inside_root($destReal, $rootReal) || !is_dir($destReal)) fail('file_path_not_directory');
    $zip = new ZipArchive();
    if ($zip->open($zipReal) !== true) fail('file_unzip_failed');
    for ($i = 0; $i < $zip->numFiles; $i += 1) {
        $name = (string)$zip->getNameIndex($i);
        $clean = norm_rel($name);
        if ($clean === '') continue;
        $targetRel = $destRel === '' ? $clean : ($destRel . '/' . $clean);
        ensure_rel_not_denied($targetRel, $deny);
        $target = $destReal . '/' . $clean;
        $targetParent = dirname($target);
        $targetParentReal = realpath($targetParent);
        if ($targetParentReal === false) {
            $candidate = $targetParent;
            $missing = [];
            while (!is_dir($candidate)) {
                $missing[] = basename($candidate);
                $candidate = dirname($candidate);
            }
            $baseReal = realpath($candidate);
            if (!is_string($baseReal) || !inside_root($baseReal, $rootReal)) {
                $zip->close();
                fail('file_invalid_destination');
            }
        } elseif (!inside_root((string)$targetParentReal, $rootReal)) {
            $zip->close();
            fail('file_invalid_destination');
        }
        $count += 1;
        if ($count > 6000) {
            $zip->close();
            fail('file_operation_limit');
        }
    }
    if (!$zip->extractTo($destReal)) {
        $zip->close();
        fail('file_unzip_failed');
    }
    $zip->close();
}

function entry_for(string $abs, string $rel, string $rootReal, bool $showHidden, array $deny, int $maxPreview): array {
    $real = realpath($abs);
    $link = is_link($abs);
    $inside = is_string($real) && inside_root($real, $rootReal);
    $denied = denied_rel($rel, $deny) || !$inside;
    $isDir = $inside && is_dir($real);
    $isFile = $inside && is_file($real);
    $ext = $isFile ? strtolower((string)pathinfo($abs, PATHINFO_EXTENSION)) : '';
    $size = $isFile ? (int)(@filesize($abs) ?: 0) : 0;
    $mime = $isFile && function_exists('mime_content_type') ? (string)(@mime_content_type($abs) ?: '') : '';
    $readable = $inside && is_readable($abs);
    $previewable = $isFile && $readable && !$denied && $size <= $maxPreview && text_like($abs, $ext, $mime);
    return [
        'name' => basename($abs),
        'relative_path' => $rel,
        'type' => $isDir ? 'directory' : ($link ? 'symlink' : 'file'),
        'extension' => $ext,
        'size_bytes' => $size,
        'modified_at' => is_string($real) && file_exists($real) ? gmdate('c', (int)(@filemtime($real) ?: time())) : '',
        'mode' => substr(sprintf('%o', (int)(@fileperms($abs) ?: 0)), -4),
        'readable' => $readable,
        'writable' => $inside && is_writable($abs),
        'denied' => $denied,
        'previewable' => $previewable,
        'downloadable' => $isFile && $readable && !$denied,
        'mime' => $mime,
        'child_count' => $isDir ? child_count($real, $showHidden) : 0,
    ];
}

$op = trim((string)getenv('VPS_EXPLORER_OP'));
$rootRaw = trim((string)getenv('VPS_EXPLORER_ROOT'));
$rel = norm_rel((string)getenv('VPS_EXPLORER_PATH'));
$targetRel = norm_rel((string)getenv('VPS_EXPLORER_TARGET_PATH'));
$name = trim((string)getenv('VPS_EXPLORER_NAME'));
$uploadTmp = trim((string)getenv('VPS_EXPLORER_UPLOAD_TMP'));
$query = trim((string)getenv('VPS_EXPLORER_QUERY'));
$showHidden = (string)getenv('VPS_EXPLORER_HIDDEN') === '1';
$download = (string)getenv('VPS_EXPLORER_DOWNLOAD') === '1';
$overwrite = (string)getenv('VPS_EXPLORER_OVERWRITE') === '1';
$readOnly = (string)getenv('VPS_EXPLORER_READ_ONLY') === '1';
$limit = max(1, min(500, (int)getenv('VPS_EXPLORER_LIMIT')));
$maxBytes = max(1024, min(67108864, (int)getenv('VPS_EXPLORER_MAX_BYTES')));
$denyRaw = base64_decode((string)getenv('VPS_EXPLORER_DENY'), true);
$deny = is_string($denyRaw) ? json_decode($denyRaw, true) : [];
$deny = is_array($deny) ? $deny : [];

$rootReal = realpath($rootRaw);
if (!is_string($rootReal) || !is_dir($rootReal)) fail('file_root_unreachable');

if ($op === 'list') {
    $targetReal = existing_real($rootReal, $rel);
    if (!is_dir($targetReal)) fail('file_path_not_directory');
    $items = @scandir($targetReal);
    if (!is_array($items)) fail('file_directory_read_failed');
    $entries = [];
    foreach ($items as $name) {
        if ($name === '.' || $name === '..') continue;
        $childRel = $rel === '' ? $name : ($rel . '/' . $name);
        if (!$showHidden && hidden_rel($childRel)) continue;
        $entries[] = entry_for($targetReal . '/' . $name, $childRel, $rootReal, $showHidden, $deny, $maxBytes);
    }
    usort($entries, static function(array $a, array $b): int {
        if (($a['type'] === 'directory') !== ($b['type'] === 'directory')) return $a['type'] === 'directory' ? -1 : 1;
        return strnatcasecmp((string)$a['name'], (string)$b['name']);
    });
    out([
        'ok' => true,
        'mode' => 'list',
        'path' => $rel,
        'parent_path' => $rel === '' ? '' : trim((string)dirname($rel), '.'),
        'entries' => $entries,
        'summary' => [
            'count' => count($entries),
            'directories' => count(array_filter($entries, static fn(array $entry): bool => $entry['type'] === 'directory')),
            'files' => count(array_filter($entries, static fn(array $entry): bool => $entry['type'] === 'file')),
            'denied' => count(array_filter($entries, static fn(array $entry): bool => (bool)$entry['denied'])),
            'show_hidden' => $showHidden,
        ],
    ]);
}

if ($op === 'search') {
    $targetReal = existing_real($rootReal, $rel);
    if ($query === '') fail('missing_file_search_query');
    if (!is_dir($targetReal)) fail('file_path_not_directory');
    $needle = strtolower($query);
    $entries = [];
    $stack = [[$targetReal, $rel, 0]];
    $visited = 0;
    while ($stack !== [] && count($entries) < $limit && $visited < 5000) {
        [$dir, $dirRel, $depth] = array_pop($stack);
        $items = @scandir($dir);
        if (!is_array($items)) continue;
        foreach ($items as $name) {
            if ($name === '.' || $name === '..') continue;
            $childRel = $dirRel === '' ? $name : ($dirRel . '/' . $name);
            if (!$showHidden && hidden_rel($childRel)) continue;
            $abs = $dir . '/' . $name;
            $entry = entry_for($abs, $childRel, $rootReal, $showHidden, $deny, $maxBytes);
            $visited += 1;
            if (str_contains(strtolower($childRel), $needle)) {
                $entries[] = $entry;
                if (count($entries) >= $limit) break;
            }
            if ($entry['type'] === 'directory' && !(bool)$entry['denied'] && $depth < 8) {
                $real = realpath($abs);
                if (is_string($real)) $stack[] = [$real, $childRel, $depth + 1];
            }
        }
    }
    usort($entries, static fn(array $a, array $b): int => strnatcasecmp((string)$a['relative_path'], (string)$b['relative_path']));
    out([
        'ok' => true,
        'mode' => 'search',
        'path' => $rel,
        'query' => $query,
        'entries' => $entries,
        'summary' => [
            'count' => count($entries),
            'visited' => $visited,
            'limit' => $limit,
            'show_hidden' => $showHidden,
        ],
    ]);
}

if ($op === 'mkdir') {
    ensure_write_allowed($readOnly);
    $folderName = clean_leaf_name($name);
    [$dest, $destRel] = destination_for($rootReal, $rel, $folderName, false, $deny);
    if (!@mkdir($dest, 0775, false)) fail('file_mkdir_failed');
    out([
        'ok' => true,
        'mode' => 'mkdir',
        'path' => $rel,
        'destination_path' => $destRel,
        'entry' => entry_for($dest, $destRel, $rootReal, $showHidden, $deny, $maxBytes),
    ]);
}

if ($op === 'rename') {
    ensure_write_allowed($readOnly);
    if ($rel === '') fail('missing_file_path');
    ensure_rel_not_denied($rel, $deny);
    $source = existing_real($rootReal, $rel);
    $newName = clean_leaf_name($name);
    $parentRel = trim((string)dirname($rel), '.');
    $parentRel = $parentRel === '/' ? '' : norm_rel($parentRel);
    [$dest, $destRel] = destination_for($rootReal, $parentRel, $newName, $overwrite, $deny);
    if (file_exists($dest) && $overwrite) {
        $count = 0;
        rrmdir_guarded($dest, $rootReal, $count);
    }
    if (!@rename($source, $dest)) fail('file_rename_failed');
    out([
        'ok' => true,
        'mode' => 'rename',
        'path' => $parentRel,
        'source_path' => $rel,
        'destination_path' => $destRel,
        'entry' => entry_for($dest, $destRel, $rootReal, $showHidden, $deny, $maxBytes),
    ]);
}

if ($op === 'copy' || $op === 'move') {
    ensure_write_allowed($readOnly);
    if ($rel === '') fail('missing_file_path');
    ensure_rel_not_denied($rel, $deny);
    $source = existing_real($rootReal, $rel);
    $baseName = clean_leaf_name($name !== '' ? $name : basename($rel));
    [$dest, $destRel] = destination_for($rootReal, $targetRel, $baseName, $overwrite, $deny);
    $sourceReal = realpath($source);
    if (!is_string($sourceReal)) fail('file_path_not_found');
    if (is_dir($sourceReal) && str_starts_with(rtrim($dest, '/') . '/', rtrim($sourceReal, '/') . '/')) fail('file_invalid_destination');
    if (file_exists($dest) && $overwrite) {
        $count = 0;
        rrmdir_guarded($dest, $rootReal, $count);
    }
    if ($op === 'copy') {
        $count = 0;
        copy_guarded($source, $dest, $rootReal, $count);
    } else {
        if (!@rename($source, $dest)) fail('file_move_failed');
    }
    out([
        'ok' => true,
        'mode' => $op,
        'path' => $targetRel,
        'source_path' => $rel,
        'destination_path' => $destRel,
        'entry' => entry_for($dest, $destRel, $rootReal, $showHidden, $deny, $maxBytes),
    ]);
}

if ($op === 'delete') {
    ensure_write_allowed($readOnly);
    if ($rel === '') fail('missing_file_path');
    ensure_rel_not_denied($rel, $deny);
    $source = existing_real($rootReal, $rel);
    $parentRel = trim((string)dirname($rel), '.');
    $parentRel = $parentRel === '/' ? '' : norm_rel($parentRel);
    $count = 0;
    rrmdir_guarded($source, $rootReal, $count);
    out([
        'ok' => true,
        'mode' => 'delete',
        'path' => $parentRel,
        'source_path' => $rel,
        'deleted_items' => $count,
    ]);
}

if ($op === 'upload') {
    ensure_write_allowed($readOnly);
    $folder = parent_real($rootReal, $rel);
    $fileName = clean_leaf_name($name);
    [$dest, $destRel] = destination_for($rootReal, $rel, $fileName, $overwrite, $deny);
    $tmpReal = realpath($uploadTmp);
    if (!is_string($tmpReal) || !is_file($tmpReal) || !is_readable($tmpReal)) fail('upload_temp_unreadable');
    $size = (int)(@filesize($tmpReal) ?: 0);
    if ($size > $maxBytes) fail('upload_too_large');
    if (file_exists($dest) && $overwrite) {
        $count = 0;
        rrmdir_guarded($dest, $rootReal, $count);
    }
    if (!@copy($tmpReal, $dest)) fail('file_upload_failed');
    @chmod($dest, 0664);
    out([
        'ok' => true,
        'mode' => 'upload',
        'path' => $rel,
        'destination_path' => $destRel,
        'entry' => entry_for($dest, $destRel, $rootReal, $showHidden, $deny, $maxBytes),
    ]);
}

if ($op === 'zip') {
    ensure_write_allowed($readOnly);
    if (!class_exists('ZipArchive')) fail('zip_unavailable');
    if ($rel === '') fail('missing_file_path');
    ensure_rel_not_denied($rel, $deny);
    $source = existing_real($rootReal, $rel);
    $parentRel = $targetRel !== '' ? $targetRel : trim((string)dirname($rel), '.');
    $parentRel = $parentRel === '/' ? '' : norm_rel($parentRel);
    $zipName = $name !== '' ? clean_leaf_name($name) : (basename($rel) . '.zip');
    if (!str_ends_with(strtolower($zipName), '.zip')) {
        $zipName .= '.zip';
    }
    [$dest, $destRel] = destination_for($rootReal, $parentRel, $zipName, $overwrite, $deny);
    if (file_exists($dest) && $overwrite) {
        $count = 0;
        rrmdir_guarded($dest, $rootReal, $count);
    }
    $zip = new ZipArchive();
    if ($zip->open($dest, ZipArchive::CREATE) !== true) fail('file_zip_failed');
    $count = 0;
    add_to_zip_guarded($zip, $source, basename($rel), $rootReal, $deny, $count);
    if (!$zip->close()) fail('file_zip_failed');
    out([
        'ok' => true,
        'mode' => 'zip',
        'path' => $parentRel,
        'source_path' => $rel,
        'destination_path' => $destRel,
        'entry' => entry_for($dest, $destRel, $rootReal, $showHidden, $deny, $maxBytes),
        'zipped_items' => $count,
    ]);
}

if ($op === 'unzip') {
    ensure_write_allowed($readOnly);
    if ($rel === '') fail('missing_file_path');
    ensure_rel_not_denied($rel, $deny);
    $source = existing_real($rootReal, $rel);
    if (!is_file($source)) fail('file_path_not_file');
    if (strtolower((string)pathinfo($source, PATHINFO_EXTENSION)) !== 'zip') fail('file_not_zip');
    $destRel = $targetRel !== '' ? $targetRel : trim((string)dirname($rel), '.');
    $destRel = $destRel === '/' ? '' : norm_rel($destRel);
    if ($name !== '') {
        [$folderDest, $folderRel] = destination_for($rootReal, $destRel, clean_leaf_name($name), $overwrite, $deny);
        if (file_exists($folderDest) && $overwrite) {
            $count = 0;
            rrmdir_guarded($folderDest, $rootReal, $count);
        }
        if (!is_dir($folderDest) && !@mkdir($folderDest, 0775, true)) fail('file_mkdir_failed');
        $destRel = $folderRel;
    }
    ensure_rel_not_denied($destRel, $deny);
    $destDir = parent_real($rootReal, $destRel);
    $count = 0;
    unzip_guarded($source, $destDir, $destRel, $rootReal, $deny, $count);
    out([
        'ok' => true,
        'mode' => 'unzip',
        'path' => $destRel,
        'source_path' => $rel,
        'extracted_items' => $count,
    ]);
}

if ($op === 'read') {
    $targetReal = existing_real($rootReal, $rel);
    if (!is_file($targetReal)) fail('file_path_not_file');
    if (denied_rel($rel, $deny)) fail('file_access_denied');
    if (!is_readable($targetReal)) fail('file_not_readable');
    $entry = entry_for($targetReal, $rel, $rootReal, $showHidden, $deny, $maxBytes);
    $size = (int)$entry['size_bytes'];
    if ($size > $maxBytes) fail('file_too_large', ['file' => $entry, 'max_bytes' => $maxBytes]);
    $raw = @file_get_contents($targetReal);
    if (!is_string($raw)) fail('file_read_failed');
    $ext = (string)$entry['extension'];
    $mime = (string)$entry['mime'];
    $text = text_like($targetReal, $ext, $mime);
    out([
        'ok' => true,
        'mode' => 'read',
        'path' => $rel,
        'file' => $entry,
        'encoding' => $text ? 'utf-8' : 'base64',
        'content' => $text ? $raw : '',
        'content_base64' => $download ? base64_encode($raw) : '',
        'truncated' => false,
    ]);
}

fail('unknown_file_explorer_operation');
PHP;
    }

    /**
     * @return array<string, mixed>
     */
    private function findHost(string $hostId): array
    {
        foreach ((array)($this->loadConfig()['hosts'] ?? []) as $host) {
            if (!is_array($host)) {
                continue;
            }

            if ((string)($host['id'] ?? '') === $hostId) {
                return $host;
            }
        }

        throw new RuntimeException('host_not_found:' . $hostId);
    }

    /**
     * @return array<string, mixed>
     */
    private function buildHostSnapshot(array $host): array
    {
        $snapshot = [
            'id' => (string)($host['id'] ?? ''),
            'label' => (string)($host['label'] ?? ($host['id'] ?? 'Host')),
            'provider' => (string)($host['provider'] ?? ''),
            'mode' => (string)($host['mode'] ?? 'inventory'),
            'execution_mode' => $this->resolveExecutionMode($host),
            'ssh_target' => (string)($host['ssh_target'] ?? ''),
            'public_ip' => (string)($host['public_ip'] ?? ''),
            'roles' => array_values(array_map('strval', (array)($host['roles'] ?? []))),
            'services' => array_values(array_map(function (array $service): array {
                return [
                    'id' => (string)($service['id'] ?? ($service['name'] ?? '')),
                    'name' => (string)($service['name'] ?? ''),
                    'label' => (string)($service['label'] ?? ($service['name'] ?? '')),
                    'kind' => (string)($service['kind'] ?? 'systemd'),
                    'status' => 'unknown',
                    'resolved_unit' => '',
                    'detail' => 'No live probe yet',
                ];
            }, array_values(array_filter((array)($host['services'] ?? []), 'is_array')))),
            'containers' => [],
            'ports' => [],
            'sites' => array_values(array_map(fn(array $site): array => [
                'host' => (string)($site['host'] ?? ''),
                'url' => (string)($site['url'] ?? ''),
                'role' => (string)($site['role'] ?? ''),
                'status' => 'unknown',
                'http_status' => 0,
                'final_url' => '',
                'response_ms' => null,
                'content_type' => '',
                'remote_ip' => '',
                'detail' => 'No live probe yet',
            ], array_values(array_filter((array)($host['sites'] ?? []), 'is_array')))),
            'dns_records' => array_values(array_map(fn(array $row): array => [
                'name' => (string)($row['name'] ?? ''),
                'type' => (string)($row['type'] ?? ''),
                'value' => (string)($row['value'] ?? ''),
                'status' => 'unknown',
                'resolved_values' => [],
                'detail' => 'No live probe yet',
            ], array_values(array_filter((array)($host['dns_records'] ?? []), 'is_array')))),
            'terminals' => array_values(array_map(fn(array $terminal): array => [
                'id' => (string)($terminal['id'] ?? ''),
                'label' => (string)($terminal['label'] ?? ''),
                'url' => (string)($terminal['url'] ?? ''),
                'note' => (string)($terminal['note'] ?? ''),
                'embed' => (bool)($terminal['embed'] ?? true),
                'access' => strtolower(trim((string)($terminal['access'] ?? 'read'))),
                'service_name' => (string)($terminal['service_name'] ?? ''),
                'internal_url' => (string)($terminal['internal_url'] ?? ''),
                'status' => 'unknown',
                'http_status' => 0,
                'detail' => 'No live probe yet',
                'reachable' => false,
            ], array_values(array_filter((array)($host['terminals'] ?? []), 'is_array')))),
            'observability' => array_values(array_map(fn(array $panel): array => [
                'id' => (string)($panel['id'] ?? ''),
                'label' => (string)($panel['label'] ?? ''),
                'url' => (string)($panel['url'] ?? ''),
                'note' => (string)($panel['note'] ?? ''),
                'embed' => (bool)($panel['embed'] ?? true),
                'kind' => strtolower(trim((string)($panel['kind'] ?? 'dashboard'))),
                'access' => strtolower(trim((string)($panel['access'] ?? 'read'))),
                'service_name' => (string)($panel['service_name'] ?? ''),
                'internal_url' => (string)($panel['internal_url'] ?? ''),
                'status' => 'unknown',
                'http_status' => 0,
                'detail' => 'No live probe yet',
                'summary' => '',
                'reachable' => false,
            ], array_values(array_filter((array)($host['observability'] ?? []), 'is_array')))),
            'file_roots' => $this->fileRootsForHost($host),
            'system' => [
                'hostname' => '',
                'os' => '',
                'arch' => '',
                'uptime' => '',
                'load' => '',
                'last_probe_at' => gmdate('c'),
            ],
            'capabilities' => [
                'systemctl' => false,
                'docker' => false,
            ],
            'resources' => [
                'disk_used_pct' => '',
                'memory_used_pct' => '',
                'disk_total_kb' => 0,
                'disk_used_kb' => 0,
                'disk_available_kb' => 0,
                'memory_total_mb' => 0,
                'memory_used_mb' => 0,
                'memory_free_mb' => 0,
            ],
            'connection' => [
                'status' => 'neutral',
                'label' => 'inventory',
                'message' => 'Inventory only',
            ],
            'allowed_actions' => $this->listAllowedActions($host),
            'alerts' => [],
        ];

        $probe = $this->probeHost($host);
        if (($probe['ok'] ?? false) !== true) {
            $snapshot['connection'] = [
                'status' => 'warn',
                'label' => 'degraded',
                'message' => (string)($probe['message'] ?? 'Probe unavailable'),
            ];
            return $snapshot;
        }

        $snapshot['connection'] = [
            'status' => 'ok',
            'label' => 'online',
            'message' => (string)($probe['message'] ?? 'Probe OK') . ' via ' . $this->resolveExecutionMode($host),
        ];
        $snapshot['system'] = array_merge($snapshot['system'], (array)($probe['system'] ?? []));
        $snapshot['capabilities'] = array_merge($snapshot['capabilities'], (array)($probe['capabilities'] ?? []));
        $snapshot['resources'] = array_merge($snapshot['resources'], (array)($probe['resources'] ?? []));
        $snapshot['ports'] = array_values(array_map('strval', (array)($probe['ports'] ?? [])));
        $snapshot['containers'] = array_values(array_filter((array)($probe['containers'] ?? []), 'is_array'));

        $serviceStatuses = array_values(array_filter((array)($probe['service_statuses'] ?? []), 'is_array'));
        foreach ($snapshot['services'] as $index => $service) {
            $serviceProbe = $serviceStatuses[$index] ?? null;
            if (is_array($serviceProbe)) {
                $snapshot['services'][$index]['status'] = (string)($serviceProbe['status'] ?? 'unknown');
                $snapshot['services'][$index]['resolved_unit'] = (string)($serviceProbe['resolved_unit'] ?? '');
                $snapshot['services'][$index]['detail'] = (string)($serviceProbe['detail'] ?? '');
            } elseif (($probe['capabilities']['systemctl'] ?? false) !== true) {
                $snapshot['services'][$index]['status'] = 'unavailable';
                $snapshot['services'][$index]['detail'] = 'systemctl unavailable';
            }
        }

        $siteProbes = $this->probeSites($host);
        foreach ($snapshot['sites'] as $index => $site) {
            $siteProbe = $siteProbes[$index] ?? null;
            if (!is_array($siteProbe)) {
                continue;
            }
            $snapshot['sites'][$index] = array_merge($snapshot['sites'][$index], $siteProbe);
        }

        $dnsProbes = $this->probeDnsRecords($host);
        foreach ($snapshot['dns_records'] as $index => $row) {
            $dnsProbe = $dnsProbes[$index] ?? null;
            if (!is_array($dnsProbe)) {
                continue;
            }
            $snapshot['dns_records'][$index] = array_merge($snapshot['dns_records'][$index], $dnsProbe);
        }

        $terminalProbes = $this->probeTerminals($host, $snapshot['services']);
        foreach ($snapshot['terminals'] as $index => $terminal) {
            $terminalProbe = $terminalProbes[$index] ?? null;
            if (!is_array($terminalProbe)) {
                continue;
            }
            $snapshot['terminals'][$index] = array_merge($snapshot['terminals'][$index], $terminalProbe);
        }

        $observabilityProbes = $this->probeObservabilityPanels($host, $snapshot['services']);
        foreach ($snapshot['observability'] as $index => $panel) {
            $panelProbe = $observabilityProbes[$index] ?? null;
            if (!is_array($panelProbe)) {
                continue;
            }
            $snapshot['observability'][$index] = array_merge($snapshot['observability'][$index], $panelProbe);
        }

        $snapshot['alerts'] = $this->buildAlerts($snapshot);

        return $snapshot;
    }

    /**
     * @return array<string, mixed>
     */
    private function probeHost(array $host): array
    {
        $health = $this->executeOnHost($host, $this->healthCommand());
        if (($health['ok'] ?? false) !== true) {
            return [
                'ok' => false,
                'message' => (string)($health['error'] ?? $health['output'] ?? 'Probe failed'),
            ];
        }

        $systemData = $this->parseKeyValueLines((string)($health['output'] ?? ''));
        $serviceStatuses = $this->probeServices($host);
        $containers = $this->probeContainers($host);
        $ports = $this->probePorts($host);

        return [
            'ok' => true,
            'message' => 'Live probe OK',
            'system' => [
                'hostname' => (string)($systemData['hostname'] ?? ''),
                'os' => (string)($systemData['os'] ?? ''),
                'arch' => (string)($systemData['arch'] ?? ''),
                'uptime' => (string)($systemData['uptime'] ?? ''),
                'load' => (string)($systemData['load'] ?? ''),
                'last_probe_at' => gmdate('c'),
            ],
            'resources' => array_merge(
                $this->formatDisk($systemData['disk'] ?? ''),
                $this->formatMemory($systemData['memory'] ?? '')
            ),
            'service_statuses' => $serviceStatuses['statuses'],
            'containers' => $containers['containers'],
            'ports' => $ports['ports'],
            'capabilities' => [
                'systemctl' => (bool)$serviceStatuses['systemctl'],
                'docker' => (bool)$containers['docker'],
            ],
        ];
    }

    private function healthCommand(): string
    {
        return <<<'BASH'
hostname_value="$(hostname 2>/dev/null || uname -n 2>/dev/null || echo unknown)"
os_value="$(uname -s 2>/dev/null || echo unknown)"
arch_value="$(uname -m 2>/dev/null || echo unknown)"
uptime_value="$(uptime 2>/dev/null | tr '\n' ' ' | sed 's/[[:space:]]\+/ /g' || true)"
load_value="$(cat /proc/loadavg 2>/dev/null | awk '{print $1" "$2" "$3}' || uptime 2>/dev/null | awk -F'load averages?: ' 'NF>1{print $2}' | awk '{print $1" "$2" "$3}' || true)"
disk_value="$(df -Pk / 2>/dev/null | awk 'NR==2 {print $2":"$3":"$5}' || true)"
memory_value="$(free -m 2>/dev/null | awk '/^Mem:/ {print $2":"$3":"$4}' || true)"
printf 'hostname=%s\nos=%s\narch=%s\nuptime=%s\nload=%s\ndisk=%s\nmemory=%s\n' "$hostname_value" "$os_value" "$arch_value" "$uptime_value" "$load_value" "$disk_value" "$memory_value"
BASH;
    }

    /**
     * @return array{statuses: array<int, array<string, string>>, systemctl: bool}
     */
    private function probeServices(array $host): array
    {
        $services = array_values(array_filter((array)($host['services'] ?? []), 'is_array'));
        if ($services === []) {
            return ['statuses' => [], 'systemctl' => false];
        }

        $parts = [];
        foreach ($services as $index => $service) {
            $units = array_values(array_filter(array_map(
                static fn($value): string => trim((string)$value),
                (array)($service['unit_candidates'] ?? [$service['name'] ?? ''])
            ), static fn(string $value): bool => $value !== ''));
            if ($units === []) {
                continue;
            }

            $loop = implode(' ', array_map('escapeshellarg', $units));
            $parts[] = "if command -v systemctl >/dev/null 2>&1; then resolved=''; state=''; for unit in {$loop}; do current_state=\"\$(systemctl is-active \"\$unit\" 2>/dev/null || true)\"; if [ -n \"\$current_state\" ] && [ \"\$current_state\" != 'unknown' ]; then resolved=\"\$unit\"; state=\"\$current_state\"; break; fi; done; [ -n \"\$state\" ] || state='unknown'; printf '__SERVICE__|{$index}|%s|%s\n' \"\$resolved\" \"\$state\"; else printf '__SERVICE__|{$index}||unavailable\n'; fi";
        }

        if ($parts === []) {
            return ['statuses' => [], 'systemctl' => false];
        }

        $run = $this->executeOnHost($host, implode('; ', $parts));
        if (($run['ok'] ?? false) !== true && trim((string)($run['output'] ?? '')) === '') {
            return ['statuses' => [], 'systemctl' => false];
        }

        $statuses = [];
        foreach (preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: [] as $line) {
            if (!is_string($line) || trim($line) === '' || !str_starts_with($line, '__SERVICE__|')) {
                continue;
            }
            $parts = array_pad(explode('|', $line, 4), 4, '');
            $index = (int)($parts[1] ?? -1);
            $resolvedUnit = trim((string)($parts[2] ?? ''));
            $status = trim((string)($parts[3] ?? '')) ?: 'unknown';
            $statuses[$index] = [
                'resolved_unit' => $resolvedUnit,
                'status' => $status,
                'detail' => $resolvedUnit !== '' ? ($status . ' via ' . $resolvedUnit) : $status,
            ];
        }

        return [
            'statuses' => $statuses,
            'systemctl' => count($statuses) > 0 && !in_array('unavailable', array_map(static fn(array $row): string => (string)$row['status'], $statuses), true),
        ];
    }

    /**
     * @return array{containers: array<int, array<string, string>>, docker: bool}
     */
    private function probeContainers(array $host): array
    {
        $run = $this->executeOnHost($host, "if command -v docker >/dev/null 2>&1; then docker ps --format '{{.Names}}|{{.Image}}|{{.Status}}|{{.Ports}}'; fi");
        $containers = [];
        foreach (preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: [] as $line) {
            if (!is_string($line) || trim($line) === '') {
                continue;
            }
            $parts = array_pad(explode('|', $line, 4), 4, '');
            $containers[] = [
                'name' => trim($parts[0]),
                'image' => trim($parts[1]),
                'status' => trim($parts[2]),
                'ports' => trim($parts[3]),
            ];
        }

        return [
            'containers' => $containers,
            'docker' => ($run['ok'] ?? false) || trim((string)($run['output'] ?? '')) !== '',
        ];
    }

    /**
     * @return array{ports: array<int, string>}
     */
    private function probePorts(array $host): array
    {
        $run = $this->executeOnHost($host, "if command -v ss >/dev/null 2>&1; then ss -ltn 2>/dev/null | tail -n +2 | head -n 12 | awk '{print \$4}'; elif command -v netstat >/dev/null 2>&1; then netstat -lnt 2>/dev/null | tail -n +3 | head -n 12 | awk '{print \$4}'; fi");
        $ports = array_values(array_filter(array_map(
            static fn(string $line): string => trim($line),
            preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: []
        ), static fn(string $line): bool => $line !== ''));

        return ['ports' => $ports];
    }

    /**
     * @return array<int, array<string, mixed>>
     */
    private function probeSites(array $host): array
    {
        $sites = array_values(array_filter((array)($host['sites'] ?? []), 'is_array'));
        if ($sites === []) {
            return [];
        }

        $probes = [];
        $parts = [];
        foreach ($sites as $index => $site) {
            $url = trim((string)($site['url'] ?? ''));
            if ($url === '') {
                $probes[$index] = [
                    'status' => 'error',
                    'http_status' => 0,
                    'final_url' => '',
                    'content_type' => '',
                    'remote_ip' => '',
                    'response_ms' => null,
                    'detail' => 'Missing site URL',
                ];
                continue;
            }

            $probes[$index] = [
                'status' => 'error',
                'http_status' => 0,
                'final_url' => '',
                'content_type' => '',
                'remote_ip' => '',
                'response_ms' => null,
                'detail' => 'Site probe failed',
            ];
            $parts[] = "if command -v curl >/dev/null 2>&1; then out=\"\$(curl -k -L --max-time 8 -o /dev/null -s -w " . escapeshellarg('%{http_code}|%{url_effective}|%{content_type}|%{remote_ip}|%{time_total}') . ' ' . escapeshellarg($url) . " 2>/dev/null || true)\"; [ -n \"\$out\" ] || out='000||||'; printf '__SITE__|{$index}|%s\n' \"\$out\"; else printf '__SITE__|{$index}|000||||\n'; fi";
        }

        if ($parts === []) {
            return $probes;
        }

        $run = $this->executeOnHost($host, implode('; ', $parts));
        foreach (preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: [] as $line) {
            if (!is_string($line) || !str_starts_with($line, '__SITE__|')) {
                continue;
            }
            $parts = array_pad(explode('|', $line, 7), 7, '');
            $index = (int)($parts[1] ?? -1);
            $httpCode = (int)($parts[2] ?? 0);
            $status = $httpCode >= 200 && $httpCode < 400 ? 'ok' : (($httpCode === 401 || $httpCode === 403) ? 'warning' : 'error');
            $probes[$index] = [
                'status' => $status,
                'http_status' => $httpCode,
                'final_url' => (string)($parts[3] ?? ''),
                'content_type' => (string)($parts[4] ?? ''),
                'remote_ip' => (string)($parts[5] ?? ''),
                'response_ms' => is_numeric($parts[6] ?? null) ? (float)$parts[6] * 1000 : null,
                'detail' => $httpCode > 0 ? ('HTTP ' . $httpCode) : 'Site probe failed',
            ];
        }

        return $probes;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function probeDnsRecords(array $host): array
    {
        $records = array_values(array_filter((array)($host['dns_records'] ?? []), 'is_array'));
        $probes = [];
        foreach ($records as $record) {
            $name = trim((string)($record['name'] ?? ''));
            $type = strtoupper(trim((string)($record['type'] ?? 'A')));
            $value = trim((string)($record['value'] ?? ''));
            if ($name === '') {
                $probes[] = ['status' => 'error', 'resolved_values' => [], 'detail' => 'Missing record name'];
                continue;
            }

            if ($type === 'CNAME') {
                $resolvedTargets = [];
                foreach ((array)(@\dns_get_record($name, DNS_CNAME) ?: []) as $row) {
                    if (!is_array($row) || trim((string)($row['target'] ?? '')) === '') {
                        continue;
                    }
                    $resolvedTargets[] = strtolower(rtrim((string)$row['target'], '.'));
                }
                $resolvedTargets = array_values(array_unique($resolvedTargets));
                $expectedTarget = strtolower(rtrim($value, '.'));
                $matches = $expectedTarget !== '' && in_array($expectedTarget, $resolvedTargets, true);
                if (!$matches && $expectedTarget !== '') {
                    $matches = count(array_intersect($this->resolveHostIps($name), $this->resolveHostIps($expectedTarget))) > 0;
                }
                $probes[] = [
                    'status' => $matches ? 'ok' : ($resolvedTargets === [] ? 'error' : 'warning'),
                    'resolved_values' => $resolvedTargets,
                    'detail' => $matches ? 'DNS matches inventory' : ($resolvedTargets === [] ? 'CNAME unresolved' : ('Resolved to ' . implode(', ', $resolvedTargets))),
                ];
                continue;
            }

            $resolvedIps = $this->resolveHostIps($name);
            $matches = $value !== '' && in_array($value, $resolvedIps, true);
            $probes[] = [
                'status' => $matches ? 'ok' : ($resolvedIps === [] ? 'error' : 'warning'),
                'resolved_values' => $resolvedIps,
                'detail' => $matches ? 'DNS matches inventory' : ($resolvedIps === [] ? 'Record unresolved' : ('Resolved to ' . implode(', ', $resolvedIps))),
            ];
        }

        return $probes;
    }

    /**
     * @param list<array<string, mixed>> $services
     * @return array<int, array<string, mixed>>
     */
    private function probeTerminals(array $host, array $services): array
    {
        return $this->probeControlEndpoints(
            $host,
            array_values(array_filter((array)($host['terminals'] ?? []), 'is_array')),
            $services
        );
    }

    /**
     * @param list<array<string, mixed>> $services
     * @return array<int, array<string, mixed>>
     */
    private function probeObservabilityPanels(array $host, array $services): array
    {
        return $this->probeControlEndpoints(
            $host,
            array_values(array_filter((array)($host['observability'] ?? []), 'is_array')),
            $services,
            true
        );
    }

    /**
     * @param array<string, mixed> $host
     * @param list<array<string, mixed>> $items
     * @param list<array<string, mixed>> $services
     * @return array<int, array<string, mixed>>
     */
    private function probeControlEndpoints(array $host, array $items, array $services, bool $captureBody = false): array
    {
        if ($items === []) {
            return [];
        }

        $statusMap = [];
        foreach ($services as $service) {
            $statusMap[(string)($service['name'] ?? '')] = (string)($service['status'] ?? 'unknown');
        }

        $probes = [];
        $parts = [];
        foreach ($items as $index => $item) {
            $internalUrl = trim((string)($item['internal_url'] ?? ''));
            $serviceStatus = $statusMap[(string)($item['service_name'] ?? '')] ?? 'unknown';
            if ($internalUrl === '') {
                $probes[$index] = [
                    'status' => $serviceStatus === 'active' ? 'warning' : 'error',
                    'http_status' => 0,
                    'content_type' => '',
                    'detail' => $serviceStatus === 'active' ? 'Missing internal probe URL' : ('Service ' . $serviceStatus),
                    'summary' => '',
                    'reachable' => false,
                ];
                continue;
            }

            $probes[$index] = [
                'status' => $serviceStatus === 'active' ? 'warning' : 'error',
                'http_status' => 0,
                'content_type' => '',
                'detail' => $serviceStatus !== '' ? ('service=' . $serviceStatus . ' • endpoint probe failed') : 'endpoint probe failed',
                'summary' => '',
                'reachable' => false,
            ];
            if ($captureBody) {
                $parts[] = "if command -v curl >/dev/null 2>&1; then tmp_file=\"\$(mktemp)\"; meta=\"\$(curl -sS --max-time 6 -o \"\$tmp_file\" -w " . escapeshellarg('%{http_code}|%{content_type}') . ' ' . escapeshellarg($internalUrl) . " 2>/dev/null || true)\"; [ -n \"\$meta\" ] || meta='000|'; body=\"\$(head -c 180 \"\$tmp_file\" 2>/dev/null | tr '\n' ' ' | tr '\r' ' ' | tr '|' ' ')\"; rm -f \"\$tmp_file\"; printf '__CTRL__|{$index}|%s|%s\n' \"\$meta\" \"\$body\"; else printf '__CTRL__|{$index}|000||curl_missing\n'; fi";
            } else {
                $parts[] = "if command -v curl >/dev/null 2>&1; then meta=\"\$(curl -sSI --max-time 5 -o /dev/null -w " . escapeshellarg('%{http_code}|%{content_type}') . ' ' . escapeshellarg($internalUrl) . " 2>/dev/null || true)\"; [ -n \"\$meta\" ] || meta='000|'; printf '__CTRL__|{$index}|%s|\n' \"\$meta\"; else printf '__CTRL__|{$index}|000||curl_missing\n'; fi";
            }
        }

        if ($parts === []) {
            return $probes;
        }

        $run = $this->executeOnHost($host, implode('; ', $parts));
        foreach (preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: [] as $line) {
            if (!is_string($line) || !str_starts_with($line, '__CTRL__|')) {
                continue;
            }
            $parts = array_pad(explode('|', $line, 5), 5, '');
            $index = (int)($parts[1] ?? -1);
            $httpCode = (int)($parts[2] ?? 0);
            $contentType = trim((string)($parts[3] ?? ''));
            $summary = trim((string)($parts[4] ?? ''));
            $item = $items[$index] ?? [];
            $expected = array_map('intval', (array)($item['expected_http_codes'] ?? [200]));
            $serviceStatus = $statusMap[(string)($item['service_name'] ?? '')] ?? 'unknown';
            $reachable = in_array($httpCode, $expected, true);
            $status = ($serviceStatus === 'active' && $reachable) ? 'ok' : (($serviceStatus === 'active' || $reachable) ? 'warning' : 'error');
            $detail = ($serviceStatus !== '' ? ('service=' . $serviceStatus . ' • ') : '') . ($httpCode > 0 ? ('HTTP ' . $httpCode) : 'endpoint probe failed');
            $probes[$index] = [
                'status' => $status,
                'http_status' => $httpCode,
                'content_type' => $contentType,
                'detail' => $detail,
                'summary' => $summary,
                'reachable' => $reachable,
            ];
        }

        return $probes;
    }

    /**
     * @return list<array<string, string>>
     */
    private function buildAlerts(array $snapshot): array
    {
        $alerts = [];
        foreach ((array)($snapshot['services'] ?? []) as $service) {
            if (!is_array($service) || ($service['status'] ?? '') === 'active') {
                continue;
            }
            $alerts[] = [
                'scope' => 'service',
                'label' => (string)($service['label'] ?? $service['name'] ?? 'service'),
                'detail' => (string)($service['detail'] ?? $service['status'] ?? 'unknown'),
            ];
        }
        foreach ((array)($snapshot['dns_records'] ?? []) as $row) {
            if (!is_array($row) || ($row['status'] ?? '') === 'ok') {
                continue;
            }
            $alerts[] = [
                'scope' => 'dns',
                'label' => (string)($row['name'] ?? 'record'),
                'detail' => (string)($row['detail'] ?? 'DNS mismatch'),
            ];
        }
        foreach ((array)($snapshot['sites'] ?? []) as $row) {
            if (!is_array($row) || ($row['status'] ?? '') === 'ok') {
                continue;
            }
            $alerts[] = [
                'scope' => 'site',
                'label' => (string)($row['host'] ?? $row['url'] ?? 'site'),
                'detail' => (string)($row['detail'] ?? 'Site probe failed'),
            ];
        }
        foreach ((array)($snapshot['terminals'] ?? []) as $row) {
            if (!is_array($row) || ($row['status'] ?? '') === 'ok') {
                continue;
            }
            $alerts[] = [
                'scope' => 'terminal',
                'label' => (string)($row['label'] ?? $row['id'] ?? 'terminal'),
                'detail' => (string)($row['detail'] ?? 'Terminal probe failed'),
            ];
        }
        foreach ((array)($snapshot['observability'] ?? []) as $row) {
            if (!is_array($row) || ($row['status'] ?? '') === 'ok') {
                continue;
            }
            $alerts[] = [
                'scope' => 'observability',
                'label' => (string)($row['label'] ?? $row['id'] ?? 'panel'),
                'detail' => (string)($row['detail'] ?? 'Observability probe failed'),
            ];
        }
        return $alerts;
    }

    /**
     * @return list<string>
     */
    private function resolveHostIps(string $host): array
    {
        $host = trim($host);
        if ($host === '') {
            return [];
        }
        if (filter_var($host, FILTER_VALIDATE_IP)) {
            return [$host];
        }
        $ips = @gethostbynamel($host);
        if (!is_array($ips)) {
            return [];
        }
        return array_values(array_unique(array_filter(array_map('strval', $ips), static fn(string $value): bool => $value !== '')));
    }

    private function hostLooksLocal(array $host): bool
    {
        $candidates = [];
        $publicIp = trim((string)($host['public_ip'] ?? ''));
        if ($publicIp !== '') {
            $candidates[] = $publicIp;
        }

        $target = trim((string)($host['ssh_target'] ?? ''));
        if ($target !== '') {
            $targetHost = preg_replace('/^[^@]+@/', '', $target);
            if (is_string($targetHost) && trim($targetHost) !== '') {
                $candidates[] = trim($targetHost);
            }
        }

        $locals = ['127.0.0.1', 'localhost', gethostname() ?: '', php_uname('n') ?: ''];
        $locals = array_merge($locals, $this->resolveHostIps(gethostname() ?: ''));
        $serverAddr = trim((string)($_SERVER['SERVER_ADDR'] ?? ''));
        if ($serverAddr !== '') {
            $locals[] = $serverAddr;
        }

        if ($this->shellAvailable()) {
            try {
                $result = $this->runShellCommand("bash -lc 'hostname -I 2>/dev/null || true'");
                if ($result['exit_code'] === 0 && trim($result['output']) !== '') {
                    $locals = array_merge($locals, preg_split('/\s+/', trim($result['output'])) ?: []);
                }
            } catch (\Throwable) {
            }
        }

        $locals = array_values(array_unique(array_filter(array_map(static fn($value): string => strtolower(trim((string)$value)), $locals), static fn(string $value): bool => $value !== '')));
        foreach ($candidates as $candidate) {
            $candidate = strtolower(trim((string)$candidate));
            if ($candidate === '') {
                continue;
            }
            if (in_array($candidate, $locals, true)) {
                return true;
            }
            foreach ($this->resolveHostIps($candidate) as $ip) {
                if (in_array(strtolower(trim($ip)), $locals, true)) {
                    return true;
                }
            }
        }

        return false;
    }

    private function stageUploadForHost(array $host, string $tmpPath): string
    {
        if ($this->resolveExecutionMode($host) === 'local') {
            return $tmpPath;
        }

        $target = trim((string)($host['ssh_target'] ?? ''));
        if ($target === '') {
            throw new RuntimeException('ssh_target_missing');
        }
        // FOUND-002 FIX: Validate SSH target against SSRF
        $this->validateSshTarget($target);
        if (!$this->shellAvailable()) {
            throw new RuntimeException('exec_unavailable');
        }

        $remoteTmp = '/tmp/mom-vps-upload-' . bin2hex(random_bytes(12));
        $command = implode(' ', [
            'scp',
            '-q',
            '-oBatchMode=yes',
            '-oStrictHostKeyChecking=yes',
            '-oConnectTimeout=8',
            escapeshellarg($tmpPath),
            escapeshellarg($target . ':' . $remoteTmp),
        ]);

        try {
            $result = $this->runShellCommand($command);
        } catch (\Throwable $e) {
            throw new RuntimeException('upload_stage_failed:' . $e->getMessage());
        }
        if ($result['exit_code'] !== 0) {
            throw new RuntimeException('upload_stage_failed:' . trim($result['output']));
        }

        return $remoteTmp;
    }

    private function cleanupStagedUpload(array $host, string $remoteTmp, string $localTmp): void
    {
        if ($remoteTmp === '' || $remoteTmp === $localTmp || $this->resolveExecutionMode($host) === 'local') {
            return;
        }
        try {
            $this->executeOnHost($host, 'rm -f -- ' . escapeshellarg($remoteTmp));
        } catch (\Throwable) {
        }
    }

    /**
     * @return array<string, mixed>
     */
    /**
     * SVC-011 (CRITICAL): Validate command against allowlist before execution.
     * Commands are retrieved from config files which may be writable.
     */
    private function executeOnHost(array $host, string $command): array
    {
        // Validate command is in the hardcoded allowlist
        if (!$this->isAllowedCommand($command)) {
            @error_log('[VpsService] Command rejected: not in allowlist: ' . substr($command, 0, 100));
            return [
                'ok' => false,
                'exit_code' => 1,
                'output' => '',
                'error' => 'command_rejected:not_whitelisted',
            ];
        }

        $built = $this->buildCommand($host, $command);
        if ($built === null) {
            return [
                'ok' => false,
                'exit_code' => 1,
                'output' => '',
                'error' => 'probe_not_configured',
            ];
        }

        if (!$this->shellAvailable()) {
            return [
                'ok' => false,
                'exit_code' => 1,
                'output' => '',
                'error' => 'exec_unavailable',
            ];
        }

        try {
            $result = $this->runShellCommand($built);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'exit_code' => 1,
                'output' => '',
                'error' => $e->getMessage(),
            ];
        }

        return [
            'ok' => $result['exit_code'] === 0,
            'exit_code' => $result['exit_code'],
            'output' => $result['output'],
            'error' => $result['exit_code'] === 0 ? '' : ($result['output'] !== '' ? $result['output'] : 'command_failed'),
        ];
    }

    private function buildCommand(array $host, string $command): ?string
    {
        $mode = $this->resolveExecutionMode($host);
        if ($mode === 'local') {
            return 'bash -lc ' . escapeshellarg($command);
        }

        if ($mode === 'ssh') {
            $target = trim((string)($host['ssh_target'] ?? ''));
            if ($target === '') {
                return null;
            }
            // FOUND-002 FIX: Validate SSH target against SSRF
            $this->validateSshTarget($target);

            $remote = 'bash -lc ' . escapeshellarg($command);
            return implode(' ', [
                'ssh',
                '-oBatchMode=yes',
                '-oStrictHostKeyChecking=yes',
                '-oConnectTimeout=6',
                escapeshellarg($target),
                escapeshellarg($remote),
            ]);
        }

        return null;
    }

    /**
     * FOUND-002 FIX: Validate SSH target to prevent SSRF attacks
     */
    private function validateSshTarget(string $target): void
    {
        // Extract host from user@host or user@host:port format
        $hostPart = preg_replace('/^[^@]*@/', '', $target);
        if (!is_string($hostPart) || $hostPart === '') {
            throw new RuntimeException('invalid_ssh_target_format');
        }

        // Remove port if present
        $host = preg_replace('/:.*$/', '', $hostPart);
        if (!is_string($host) || $host === '') {
            throw new RuntimeException('invalid_ssh_target_host');
        }

        // Validate host format
        if (!preg_match('/^[a-zA-Z0-9\.\-]{1,253}$/', $host)) {
            throw new RuntimeException('invalid_ssh_host_format');
        }

        // Resolve IP and block private/loopback addresses
        $resolvedIp = gethostbyname($host);
        $privateRanges = ['10.', '192.168.', '127.', '172.16.', '172.17.', '172.18.', '172.19.', '172.20.', '172.21.', '172.22.', '172.23.', '172.24.', '172.25.', '172.26.', '172.27.', '172.28.', '172.29.', '172.30.', '172.31.'];
        foreach ($privateRanges as $range) {
            if (str_starts_with($resolvedIp, $range)) {
                // Only allow if it matches configured VPS hosts from env
                $allowedHosts = explode(',', getenv('VPS_ALLOWED_HOSTS') ?: '');
                if (!in_array(trim($host), $allowedHosts, true)) {
                    throw new RuntimeException('ssh_host_resolves_to_private_address');
                }
            }
        }
    }

    private function resolveExecutionMode(array $host): string
    {
        $mode = strtolower(trim((string)($host['mode'] ?? 'local')));
        if ($mode === 'local' || $mode === 'localhost' || $mode === '' || $this->hostLooksLocal($host)) {
            return 'local';
        }
        if ($mode === 'ssh') {
            return 'ssh';
        }
        return $mode;
    }

    private function shellAvailable(): bool
    {
        return \function_exists('shell_exec_available') ? (bool)\shell_exec_available() : false;
    }

    /**
     * @return array{output: string, exit_code: int}
     */
    private function runShellCommand(string $command): array
    {
        if (!$this->shellAvailable()) {
            throw new RuntimeException('exec_unavailable');
        }

        $output = [];
        $exitCode = 0;
        \exec($command . ' 2>&1', $output, $exitCode);

        return [
            'output' => trim(implode("\n", $output)),
            'exit_code' => $exitCode,
        ];
    }

    /**
     * SVC-011: Strict allowlist of permitted commands.
     * Only these hardcoded command strings are permitted to execute.
     * Commands from config files are validated against this list.
     */
    private function isAllowedCommand(string $command): bool
    {
        $allowedCommands = [
            'hostname && echo && uptime && echo && df -h / && echo && (free -m 2>/dev/null || true)',
            "if command -v docker >/dev/null 2>&1; then docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; else echo 'docker_not_available'; fi",
            'test -f /etc/nginx/nginx.conf && echo ok || echo not_found',
            'test -f /etc/php-fpm.conf && echo ok || echo not_found',
            'systemctl is-active nginx',
            'systemctl is-active php-fpm',
            'systemctl is-active docker',
            'du -sh /var/lib/docker 2>/dev/null || echo 0',
            'docker images --format \'table {{.Repository}}\t{{.Tag}}\t{{.Size}}\'' ,
            'ls -la /opt/observability/ 2>/dev/null || echo none',
            'curl -s http://127.0.0.1:19999/api/v1/info 2>/dev/null | head -1 || echo offline',
            'curl -s http://127.0.0.1:3000/api/health 2>/dev/null | head -1 || echo offline',
        ];

        $command = trim($command);
        foreach ($allowedCommands as $allowed) {
            if ($command === trim($allowed)) {
                return true;
            }
        }

        return false;
    }

    /**
     * @return array<string, string>
     */
    private function parseKeyValueLines(string $output): array
    {
        $pairs = [];
        foreach (preg_split("/\r\n|\n|\r/", trim($output)) ?: [] as $line) {
            if (!is_string($line) || trim($line) === '' || !str_contains($line, '=')) {
                continue;
            }
            [$key, $value] = array_pad(explode('=', $line, 2), 2, '');
            $pairs[trim($key)] = trim($value);
        }
        return $pairs;
    }

    /**
     * @return array<string, int|string>
     */
    private function formatDisk(string $raw): array
    {
        $parts = array_pad(explode(':', (string)$raw), 3, '');
        $total = (int)trim($parts[0]);
        $used = (int)trim($parts[1]);
        return [
            'disk_total_kb' => $total,
            'disk_used_kb' => $used,
            'disk_available_kb' => max(0, $total - $used),
            'disk_used_pct' => trim($parts[2]) !== '' ? trim($parts[2]) : '—',
        ];
    }

    /**
     * @return array<string, int|string>
     */
    private function formatMemory(string $raw): array
    {
        $parts = array_pad(explode(':', (string)$raw), 3, '');
        $total = (float)($parts[0] ?? 0);
        $used = (float)($parts[1] ?? 0);
        if ($total <= 0) {
            return [
                'memory_total_mb' => 0,
                'memory_used_mb' => 0,
                'memory_free_mb' => 0,
                'memory_used_pct' => '—',
            ];
        }
        $pct = round(($used / $total) * 100, 1);
        return [
            'memory_total_mb' => (int)$total,
            'memory_used_mb' => (int)$used,
            'memory_free_mb' => (int)($parts[2] ?? 0),
            'memory_used_pct' => $pct . '%',
        ];
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listAllowedActions(array $host): array
    {
        $ids = array_values(array_map('strval', (array)($host['safe_actions'] ?? [])));
        $catalog = $this->actionCatalog();
        $actions = [];
        foreach ($ids as $id) {
            if (!isset($catalog[$id])) {
                continue;
            }
            $actions[] = array_merge(['id' => $id], $catalog[$id]);
        }
        return $actions;
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveAction(array $host, string $actionId): array
    {
        $catalog = $this->actionCatalog();
        if (!isset($catalog[$actionId])) {
            throw new RuntimeException('action_not_found:' . $actionId);
        }

        $allowed = array_values(array_map('strval', (array)($host['safe_actions'] ?? [])));
        if (!in_array($actionId, $allowed, true)) {
            throw new RuntimeException('action_not_allowed:' . $actionId);
        }

        return $catalog[$actionId];
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveTerminal(array $host, string $terminalId): array
    {
        foreach (array_values(array_filter((array)($host['terminals'] ?? []), 'is_array')) as $terminal) {
            if ((string)($terminal['id'] ?? '') !== $terminalId) {
                continue;
            }

            return [
                'id' => (string)($terminal['id'] ?? ''),
                'label' => (string)($terminal['label'] ?? ($terminal['id'] ?? 'terminal')),
                'url' => (string)($terminal['url'] ?? ''),
                'note' => (string)($terminal['note'] ?? ''),
                'embed' => (bool)($terminal['embed'] ?? true),
                'access' => strtolower(trim((string)($terminal['access'] ?? 'read'))),
            ];
        }

        throw new RuntimeException('terminal_not_found:' . $terminalId);
    }

    /**
     * @return array<string, mixed>
     */
    private function resolveObservabilityPanel(array $host, string $panelId): array
    {
        foreach (array_values(array_filter((array)($host['observability'] ?? []), 'is_array')) as $panel) {
            if ((string)($panel['id'] ?? '') !== $panelId) {
                continue;
            }

            return [
                'id' => (string)($panel['id'] ?? ''),
                'label' => (string)($panel['label'] ?? ($panel['id'] ?? 'panel')),
                'url' => (string)($panel['url'] ?? ''),
                'note' => (string)($panel['note'] ?? ''),
                'embed' => (bool)($panel['embed'] ?? true),
                'kind' => strtolower(trim((string)($panel['kind'] ?? 'dashboard'))),
                'access' => strtolower(trim((string)($panel['access'] ?? 'read'))),
            ];
        }

        throw new RuntimeException('observability_panel_not_found:' . $panelId);
    }

    /**
     * @return array<string, array<string, mixed>>
     */
    private function actionCatalog(): array
    {
        return [
            'health' => [
                'label' => 'Health snapshot',
                'command' => 'hostname && echo && uptime && echo && df -h / && echo && (free -m 2>/dev/null || true)',
                'requires_write' => false,
                'emphasis' => true,
            ],
            'docker_ps' => [
                'label' => 'Docker ps',
                'command' => "if command -v docker >/dev/null 2>&1; then docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}\t{{.Ports}}'; else echo 'docker_not_available'; fi",
                'requires_write' => false,
            ],
            'nginx_test' => [
                'label' => 'Nginx config test',
                'command' => "if command -v nginx >/dev/null 2>&1; then nginx -t; else echo 'nginx_not_available'; fi",
                'requires_write' => false,
            ],
            'ports' => [
                'label' => 'Listen ports',
                'command' => "if command -v ss >/dev/null 2>&1; then ss -ltnp | head -n 40; elif command -v netstat >/dev/null 2>&1; then netstat -lnt | head -n 40; else echo 'port_probe_not_available'; fi",
                'requires_write' => false,
            ],
            'recent_logs' => [
                'label' => 'Recent app logs',
                'command' => "tail -n 120 /var/log/nginx/error.log 2>/dev/null || journalctl -u nginx -n 80 --no-pager 2>/dev/null || echo 'no_log_access'",
                'requires_write' => false,
            ],
            'terminal_gateway_logs' => [
                'label' => 'Terminal gateway logs',
                'command' => "journalctl -u hesem-ttyd-primary -u hesem-ttyd-readonly -n 80 --no-pager 2>/dev/null || echo 'terminal_gateway_logs_unavailable'",
                'requires_write' => false,
            ],
            'observability_logs' => [
                'label' => 'Observability logs',
                'command' => "journalctl -u netdata -u grafana-server -n 120 --no-pager 2>/dev/null || echo 'observability_logs_unavailable'",
                'requires_write' => false,
            ],
        ];
    }
}
