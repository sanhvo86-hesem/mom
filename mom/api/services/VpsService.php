<?php

declare(strict_types=1);

namespace MOM\Services;

use RuntimeException;

final class VpsService
{
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
        $reachableHosts = 0;
        $terminalReadyHosts = 0;
        $observabilityReadyHosts = 0;

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
            'dns_records' => $dnsRecords,
            'terminal_ready_hosts' => $terminalReadyHosts,
            'observability_ready_hosts' => $observabilityReadyHosts,
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
        $config['control_assets'] = $this->listControlAssets();

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
            $rawPath = trim((string)($candidate['path'] ?? ''));
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
                'id' => (string)($candidate['id'] ?? $relativePath),
                'label' => (string)($candidate['label'] ?? basename($relativePath)),
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
                    'roles' => ['reverse-proxy', 'portal', 'postgres', 'redis', 'otel', 'terminal-gateway', 'observability'],
                    'services' => [
                        ['name' => 'nginx', 'label' => 'Nginx', 'kind' => 'systemd'],
                        ['name' => 'php8.3-fpm', 'label' => 'PHP-FPM', 'kind' => 'systemd'],
                        ['name' => 'postgresql', 'label' => 'PostgreSQL', 'kind' => 'systemd'],
                        ['name' => 'redis-server', 'label' => 'Redis', 'kind' => 'systemd'],
                        ['name' => 'hesem-ttyd-primary', 'label' => 'Terminal gateway (primary)', 'kind' => 'systemd'],
                        ['name' => 'hesem-ttyd-readonly', 'label' => 'Terminal gateway (readonly)', 'kind' => 'systemd'],
                        ['name' => 'netdata', 'label' => 'Netdata Agent', 'kind' => 'systemd'],
                        ['name' => 'grafana-server', 'label' => 'Grafana', 'kind' => 'systemd'],
                    ],
                    'safe_actions' => ['health', 'docker_ps', 'nginx_test', 'ports', 'recent_logs', 'terminal_gateway_logs', 'observability_logs'],
                    'sites' => [
                        ['host' => 'qms.hesem.com.vn', 'url' => 'https://qms.hesem.com.vn', 'role' => 'Main portal'],
                        ['host' => 'eqms.hesemeng.com', 'url' => 'https://eqms.hesemeng.com', 'role' => 'Legacy portal entry'],
                        ['host' => 'files.hesemeng.com', 'url' => 'https://files.hesemeng.com', 'role' => 'File services'],
                        ['host' => 'portainer.hesemeng.com', 'url' => 'https://portainer.hesemeng.com', 'role' => 'Container console'],
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
                        ],
                        [
                            'id' => 'readonly',
                            'label' => 'Readonly diagnostics',
                            'url' => '/ops/terminal/readonly/',
                            'note' => 'Readonly ttyd diagnostics view for fast triage without write access.',
                            'embed' => true,
                            'access' => 'read',
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
                        ],
                        [
                            'id' => 'grafana',
                            'label' => 'Grafana dashboards',
                            'url' => '/ops/grafana/',
                            'note' => 'Embedded Grafana workspace protected by auth proxy for team dashboards and alerts.',
                            'embed' => true,
                            'kind' => 'dashboard',
                            'access' => 'read',
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
            'ssh_target' => (string)($host['ssh_target'] ?? ''),
            'public_ip' => (string)($host['public_ip'] ?? ''),
            'roles' => array_values(array_map('strval', (array)($host['roles'] ?? []))),
            'services' => array_values(array_map(function (array $service): array {
                return [
                    'name' => (string)($service['name'] ?? ''),
                    'label' => (string)($service['label'] ?? ($service['name'] ?? '')),
                    'kind' => (string)($service['kind'] ?? 'systemd'),
                    'status' => 'unknown',
                ];
            }, array_values(array_filter((array)($host['services'] ?? []), 'is_array')))),
            'containers' => [],
            'ports' => [],
            'sites' => array_values(array_map(fn(array $site): array => [
                'host' => (string)($site['host'] ?? ''),
                'url' => (string)($site['url'] ?? ''),
                'role' => (string)($site['role'] ?? ''),
            ], array_values(array_filter((array)($host['sites'] ?? []), 'is_array')))),
            'dns_records' => array_values(array_map(fn(array $row): array => [
                'name' => (string)($row['name'] ?? ''),
                'type' => (string)($row['type'] ?? ''),
                'value' => (string)($row['value'] ?? ''),
            ], array_values(array_filter((array)($host['dns_records'] ?? []), 'is_array')))),
            'terminals' => array_values(array_map(fn(array $terminal): array => [
                'id' => (string)($terminal['id'] ?? ''),
                'label' => (string)($terminal['label'] ?? ''),
                'url' => (string)($terminal['url'] ?? ''),
                'note' => (string)($terminal['note'] ?? ''),
                'embed' => (bool)($terminal['embed'] ?? true),
                'access' => strtolower(trim((string)($terminal['access'] ?? 'read'))),
            ], array_values(array_filter((array)($host['terminals'] ?? []), 'is_array')))),
            'observability' => array_values(array_map(fn(array $panel): array => [
                'id' => (string)($panel['id'] ?? ''),
                'label' => (string)($panel['label'] ?? ''),
                'url' => (string)($panel['url'] ?? ''),
                'note' => (string)($panel['note'] ?? ''),
                'embed' => (bool)($panel['embed'] ?? true),
                'kind' => strtolower(trim((string)($panel['kind'] ?? 'dashboard'))),
                'access' => strtolower(trim((string)($panel['access'] ?? 'read'))),
            ], array_values(array_filter((array)($host['observability'] ?? []), 'is_array')))),
            'system' => [
                'hostname' => '',
                'os' => '',
                'arch' => '',
                'uptime' => '',
                'load' => '',
                'last_probe_at' => gmdate('c'),
            ],
            'resources' => [
                'disk_used_pct' => '',
                'memory_used_pct' => '',
            ],
            'connection' => [
                'status' => 'neutral',
                'label' => 'inventory',
                'message' => 'Inventory only',
            ],
            'allowed_actions' => $this->listAllowedActions($host),
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
            'message' => (string)($probe['message'] ?? 'Probe OK'),
        ];
        $snapshot['system'] = array_merge($snapshot['system'], (array)($probe['system'] ?? []));
        $snapshot['resources'] = array_merge($snapshot['resources'], (array)($probe['resources'] ?? []));
        $snapshot['ports'] = array_values(array_map('strval', (array)($probe['ports'] ?? [])));
        $snapshot['containers'] = array_values(array_filter((array)($probe['containers'] ?? []), 'is_array'));

        $serviceStatuses = (array)($probe['service_statuses'] ?? []);
        foreach ($snapshot['services'] as &$service) {
            $serviceName = (string)($service['name'] ?? '');
            if ($serviceName !== '' && isset($serviceStatuses[$serviceName])) {
                $service['status'] = (string)$serviceStatuses[$serviceName];
            } elseif (($probe['capabilities']['systemctl'] ?? false) !== true) {
                $service['status'] = 'unavailable';
            }
        }
        unset($service);

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
            'resources' => [
                'disk_used_pct' => $this->formatDisk($systemData['disk'] ?? ''),
                'memory_used_pct' => $this->formatMemory($systemData['memory'] ?? ''),
            ],
            'service_statuses' => $serviceStatuses['statuses'],
            'containers' => $containers['containers'],
            'ports' => $ports['ports'],
            'capabilities' => [
                'systemctl' => (bool)($serviceStatuses['systemctl'] ?? false),
                'docker' => (bool)($containers['docker'] ?? false),
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
     * @return array{statuses: array<string, string>, systemctl: bool}
     */
    private function probeServices(array $host): array
    {
        $services = array_values(array_filter(array_map(
            static fn(array $service): string => trim((string)($service['name'] ?? '')),
            array_values(array_filter((array)($host['services'] ?? []), 'is_array'))
        ), static fn(string $value): bool => $value !== ''));

        if ($services === []) {
            return ['statuses' => [], 'systemctl' => false];
        }

        $parts = [];
        foreach ($services as $service) {
            $parts[] = "printf '%s=' " . escapeshellarg($service) . "; if command -v systemctl >/dev/null 2>&1; then systemctl is-active " . escapeshellarg($service) . " 2>/dev/null || echo inactive; else echo unavailable; fi";
        }

        $run = $this->executeOnHost($host, implode('; ', $parts));
        if (($run['ok'] ?? false) !== true && trim((string)($run['output'] ?? '')) === '') {
            return ['statuses' => [], 'systemctl' => false];
        }

        $statuses = [];
        foreach (preg_split("/\r\n|\n|\r/", trim((string)($run['output'] ?? ''))) ?: [] as $line) {
            if (!is_string($line) || trim($line) === '' || !str_contains($line, '=')) {
                continue;
            }
            [$name, $value] = array_pad(explode('=', $line, 2), 2, '');
            $statuses[trim($name)] = trim($value) !== '' ? trim($value) : 'unknown';
        }

        return [
            'statuses' => $statuses,
            'systemctl' => count($statuses) > 0 && !in_array('unavailable', array_values($statuses), true),
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
     * @return array<string, mixed>
     */
    private function executeOnHost(array $host, string $command): array
    {
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

        $exitCode = 1;
        try {
            $output = (string)\shell_run($built, $exitCode);
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'exit_code' => 1,
                'output' => '',
                'error' => $e->getMessage(),
            ];
        }

        return [
            'ok' => $exitCode === 0,
            'exit_code' => $exitCode,
            'output' => trim($output),
            'error' => $exitCode === 0 ? '' : ($output !== '' ? trim($output) : 'command_failed'),
        ];
    }

    private function buildCommand(array $host, string $command): ?string
    {
        $mode = strtolower(trim((string)($host['mode'] ?? 'local')));
        if ($mode === 'local' || $mode === 'localhost' || $mode === '') {
            return 'bash -lc ' . escapeshellarg($command);
        }

        if ($mode === 'ssh') {
            $target = trim((string)($host['ssh_target'] ?? ''));
            if ($target === '') {
                return null;
            }

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

    private function shellAvailable(): bool
    {
        return \function_exists('shell_exec_available') ? (bool)\shell_exec_available() : false;
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

    private function formatDisk(string $raw): string
    {
        $parts = array_pad(explode(':', (string)$raw), 3, '');
        $percent = trim($parts[2]);
        if ($percent === '') {
            return '—';
        }
        return $percent;
    }

    private function formatMemory(string $raw): string
    {
        $parts = array_pad(explode(':', (string)$raw), 3, '');
        $total = (float)($parts[0] ?? 0);
        $used = (float)($parts[1] ?? 0);
        if ($total <= 0) {
            return '—';
        }
        $pct = round(($used / $total) * 100, 1);
        return $pct . '%';
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
