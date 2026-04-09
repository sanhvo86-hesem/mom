(function(){
'use strict';

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function _esc(v){
  var node = document.createElement('div');
  node.appendChild(document.createTextNode(String(v == null ? '' : v)));
  return node.innerHTML;
}
function _api(action, payload, method, timeoutMs){
  if(typeof apiCall === 'function') return apiCall(action, payload || {}, method || 'GET', timeoutMs || 30000);
  var url = 'api.php?action=' + encodeURIComponent(action);
  if((method || 'GET') === 'GET' && payload){
    var params = new URLSearchParams();
    Object.keys(payload || {}).forEach(function(key){
      if(payload[key] == null || payload[key] === '') return;
      params.append(key, String(payload[key]));
    });
    var query = params.toString();
    if(query) url += '&' + query;
  }
  return fetch(url, {
    method: method || 'GET',
    credentials: 'include',
    headers: Object.assign(
      {},
      (method || 'GET') === 'GET' ? {} : {'Content-Type':'application/json'},
      (typeof csrfToken !== 'undefined' && csrfToken ? {'X-CSRF-Token': csrfToken} : {})
    ),
    body: (method || 'GET') === 'GET' ? undefined : JSON.stringify(payload || {})
  }).then(function(r){ return r.json(); });
}
function _toast(message, type){
  if(typeof showToast === 'function') return showToast(message, type);
  console[type === 'error' ? 'error' : 'log'](message);
}
function _statusClass(status){
  var key = String(status || '').toLowerCase();
  if(key === 'ok' || key === 'active' || key === 'online' || key === 'green') return 'good';
  if(key === 'warning' || key === 'warn' || key === 'degraded' || key === 'amber') return 'warn';
  if(key === 'error' || key === 'critical' || key === 'offline' || key === 'inactive' || key === 'red') return 'bad';
  return 'neutral';
}
function _fmtTime(value){
  if(!value) return '—';
  try{
    return new Date(value).toLocaleString(lang === 'en' ? 'en-US' : 'vi-VN');
  }catch(_err){
    return String(value);
  }
}
function _webHref(value){
  var url = String(value || '').trim();
  if(!url) return '';
  if(/^https?:\/\//i.test(url)) return url;
  if(/^\//.test(url)) return url;
  if(/^api\.php\?/i.test(url)) return url;
  return '';
}
function _assetHref(value, download){
  var direct = _webHref(value);
  if(direct) return direct;
  var path = String(value || '').trim();
  if(!path) return '';
  return 'api.php?action=vps_control_asset&path=' + encodeURIComponent(path) + (download ? '&download=1' : '');
}

var state = {
  container: null,
  loading: false,
  tab: 'overview',
  overview: null,
  selectedHostId: '',
  selectedTerminalId: '',
  selectedObservabilityId: '',
  host: null,
  actionBusy: '',
  actionResult: null
};

function _syncTerminalSelection(host){
  var terminals = Array.isArray(host && host.terminals) ? host.terminals : [];
  if(!terminals.length){
    state.selectedTerminalId = '';
    return;
  }
  var exists = terminals.some(function(item){
    return String(item && item.id || '') === String(state.selectedTerminalId || '');
  });
  if(!exists){
    state.selectedTerminalId = String(terminals[0].id || '');
  }
}

function _setTerminal(terminalId){
  if(!terminalId || terminalId === state.selectedTerminalId) return;
  state.selectedTerminalId = terminalId;
  _paint();
}

function _selectedTerminal(host){
  var terminals = Array.isArray(host && host.terminals) ? host.terminals : [];
  for(var i=0;i<terminals.length;i+=1){
    if(String(terminals[i] && terminals[i].id || '') === String(state.selectedTerminalId || '')){
      return terminals[i];
    }
  }
  return terminals[0] || null;
}

function _syncObservabilitySelection(host){
  var panels = Array.isArray(host && host.observability) ? host.observability : [];
  if(!panels.length){
    state.selectedObservabilityId = '';
    return;
  }
  var exists = panels.some(function(item){
    return String(item && item.id || '') === String(state.selectedObservabilityId || '');
  });
  if(!exists){
    state.selectedObservabilityId = String(panels[0].id || '');
  }
}

function _setObservability(panelId){
  if(!panelId || panelId === state.selectedObservabilityId) return;
  state.selectedObservabilityId = panelId;
  _paint();
}

function _selectedObservability(host){
  var panels = Array.isArray(host && host.observability) ? host.observability : [];
  for(var i=0;i<panels.length;i+=1){
    if(String(panels[i] && panels[i].id || '') === String(state.selectedObservabilityId || '')){
      return panels[i];
    }
  }
  return panels[0] || null;
}

function _render(container){
  state.container = container;
  if(!state.overview){
    _loadOverview();
    return;
  }
  _paint();
}

async function _loadOverview(){
  state.loading = true;
  _paint();
  try{
    var res = await _api('vps_control_overview', null, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'overview_failed');
    state.overview = res.overview || {};
    var hosts = Array.isArray(state.overview.hosts) ? state.overview.hosts : [];
    if(!state.selectedHostId && hosts.length) state.selectedHostId = String(hosts[0].id || '');
    if(state.selectedHostId){
      await _loadHost(false);
      return;
    }
  }catch(err){
    state.overview = {error: (err && err.message) || 'overview_failed'};
    _toast(_t('Không thể tải VPS Control Tower.', 'Could not load the VPS Control Tower.'), 'error');
  }finally{
    state.loading = false;
    _paint();
  }
}

async function _loadHost(showSpinner){
  if(!state.selectedHostId){
    state.host = null;
    _paint();
    return;
  }
  if(showSpinner){
    state.loading = true;
    _paint();
  }
  try{
    var res = await _api('vps_control_host', {host_id: state.selectedHostId}, 'GET', 30000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'host_failed');
    state.host = res.host || null;
    _syncTerminalSelection(state.host);
    _syncObservabilitySelection(state.host);
  }catch(err){
    state.host = null;
    state.selectedTerminalId = '';
    state.selectedObservabilityId = '';
    _toast(_t('Không thể tải chi tiết host.', 'Could not load the host detail.'), 'error');
  }finally{
    state.loading = false;
    _paint();
  }
}

async function _runAction(actionId){
  if(!state.selectedHostId || !actionId || state.actionBusy) return;
  state.actionBusy = actionId;
  state.actionResult = null;
  _paint();
  try{
    var res = await _api('vps_control_action', {host_id: state.selectedHostId, action: actionId}, 'POST', 45000);
    if(!res || !res.ok) throw new Error((res && (res.detail || res.error)) || 'action_failed');
    state.actionResult = res.result || null;
    if(state.actionResult && state.actionResult.host_after){
      state.host = state.actionResult.host_after;
    }else{
      await _loadHost(false);
      return;
    }
    _toast(_t('Đã chạy action an toàn.', 'Safe action completed.'), 'success');
  }catch(err){
    state.actionResult = {
      label: actionId,
      ok: false,
      exit_code: 1,
      output: (err && err.message) || 'action_failed',
      executed_at: new Date().toISOString()
    };
    _toast(_t('Action không chạy được.', 'The action could not be executed.'), 'error');
  }finally{
    state.actionBusy = '';
    _paint();
  }
}

function _setTab(tabId){
  if(!tabId || tabId === state.tab) return;
  state.tab = tabId;
  _paint();
}

function _setHost(hostId){
  if(!hostId || hostId === state.selectedHostId) return;
  state.selectedHostId = hostId;
  state.selectedTerminalId = '';
  state.selectedObservabilityId = '';
  state.actionResult = null;
  _loadHost(true);
}

function _summaryCards(metrics){
  metrics = metrics || {};
  var items = [
    {
      title: _t('Host reachability', 'Host reachability'),
      value: (metrics.reachable_hosts || 0) + '/' + (metrics.host_count || 0),
      detail: _t('Host probe đang mở được qua local runner hoặc SSH.', 'Hosts that currently answer the local runner or SSH probe.')
    },
    {
      title: _t('Critical services', 'Critical services'),
      value: (metrics.active_services || 0) + '/' + (metrics.declared_services || 0),
      detail: _t('Nginx, PHP-FPM, PostgreSQL, Redis, Docker, OTel.', 'Nginx, PHP-FPM, PostgreSQL, Redis, Docker, OTel.')
    },
    {
      title: _t('Running containers', 'Running containers'),
      value: String(metrics.running_containers || 0),
      detail: _t('Container đang chạy trên inventory đã khai báo.', 'Containers running across the declared inventory.')
    },
    {
      title: _t('DNS records in scope', 'DNS records in scope'),
      value: String(metrics.dns_records || 0),
      detail: _t('Record mà dashboard này phải điều phối và theo dõi.', 'Records this dashboard needs to govern and track.')
    },
    {
      title: _t('Terminal ready hosts', 'Terminal ready hosts'),
      value: String(metrics.terminal_ready_hosts || 0),
      detail: _t('Host đã gắn URL terminal riêng thay vì chỉ chạy action whitelisted.', 'Hosts that already expose a dedicated terminal URL instead of read-only actions only.')
    },
    {
      title: _t('Observability ready hosts', 'Observability ready hosts'),
      value: String(metrics.observability_ready_hosts || 0),
      detail: _t('Host đã gắn Netdata hoặc Grafana trực tiếp vào control plane.', 'Hosts that already expose Netdata or Grafana directly inside the control plane.')
    }
  ];
  return '<div class="vps-summary-grid">' + items.map(function(item){
    return '<div class="vps-summary-card"><small>' + _esc(item.title) + '</small><strong>' + _esc(item.value) + '</strong><span>' + _esc(item.detail) + '</span></div>';
  }).join('') + '</div>';
}

function _hero(overview){
  overview = overview || {};
  var dns = overview.dns_strategy || {};
  var command = overview.quick_command || 'ssh root@103.110.87.55';
  var architectureHref = _assetHref(overview.architecture_doc);
  var setupHref = _assetHref(overview.setup_script);
  return '' +
    '<section class="vps-hero">' +
      '<div class="vps-hero-grid">' +
        '<div class="vps-hero-copy">' +
          '<span class="vps-kicker">HESEM OPS • VPS CONTROL PLANE</span>' +
          '<h1 class="vps-title">' + _esc(_t('VPS Control Tower', 'VPS Control Tower')) + '</h1>' +
          '<p>' + _esc(_t(
            'Một điểm điều khiển duy nhất cho host, service, Docker, ingress, DNS strategy và terminal. Mục tiêu là bỏ kiểu vận hành phải mở AZDIGI rồi lại quay sang SSH thủ công.',
            'A single control surface for hosts, services, Docker, ingress, DNS strategy, and terminal access. The goal is to eliminate the AZDIGI web tab plus manual SSH hop workflow.'
          )) + '</p>' +
          ((architectureHref || setupHref) ? '<div class="vps-hero-actions">' +
            (architectureHref ? '<a class="primary" href="' + _esc(architectureHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở spec kiến trúc', 'Open architecture spec')) + '</a>' : '') +
            (setupHref ? '<a href="' + _esc(setupHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Xem bootstrap VPS', 'Open VPS bootstrap')) + '</a>' : '') +
          '</div>' : '') +
        '</div>' +
        '<div class="vps-hero-side">' +
          '<div class="vps-hero-side-card">' +
            '<small>' + _esc(_t('DNS reality check', 'DNS reality check')) + '</small>' +
            '<strong>' + _esc(dns.current_mode || _t('AZDIGI portal', 'AZDIGI portal')) + '</strong>' +
            '<div>' + _esc(dns.recommended_next || _t('Chuyển sang DNS có API.', 'Move to an API-first DNS provider.')) + '</div>' +
          '</div>' +
          '<div class="vps-command-card">' +
            '<small>' + _esc(_t('Quick jump', 'Quick jump')) + '</small>' +
            '<div>' + _esc(_t('Nếu terminal bastion chưa bật, đây là lệnh nhanh để vào host theo inventory hiện tại.', 'If the bastion terminal is not live yet, this is the fastest way to enter the host described in the current inventory.')) + '</div>' +
            '<code>' + _esc(command) + '</code>' +
          '</div>' +
        '</div>' +
      '</div>' +
    '</section>';
}

function _hostPicker(hosts){
  if(!hosts || !hosts.length) return '';
  return '<div class="vps-host-strip">' + hosts.map(function(host){
    var active = String(host.id || '') === String(state.selectedHostId || '');
    return '<button class="vps-host-pill' + (active ? ' active' : '') + '" data-host-id="' + _esc(host.id) + '">' +
      '<span>' + _esc(host.label || host.id) + '</span>' +
      '<span class="vps-status ' + _statusClass(host.connection && host.connection.status) + '">' + _esc(host.connection && host.connection.label ? host.connection.label : host.connection && host.connection.status ? host.connection.status : 'inventory') + '</span>' +
    '</button>';
  }).join('') + '</div>';
}

function _architectureCards(overview){
  var cards = Array.isArray(overview && overview.architecture_layers) ? overview.architecture_layers : [];
  if(!cards.length) return '<div class="vps-empty">' + _esc(_t('Chưa có layer kiến trúc.', 'No architecture layers declared yet.')) + '</div>';
  return '<div class="vps-card-grid">' + cards.map(function(card){
    return '<article class="vps-card dark"><strong>' + _esc(card.title || '') + '</strong><p>' + _esc(card.body || '') + '</p><ul>' +
      (Array.isArray(card.points) ? card.points.map(function(point){ return '<li>' + _esc(point) + '</li>'; }).join('') : '') +
    '</ul></article>';
  }).join('') + '</div>';
}

function _referenceCards(overview){
  var refs = Array.isArray(overview && overview.references) ? overview.references : [];
  if(!refs.length) return '';
  return '<div class="vps-reference-list">' + refs.map(function(ref){
    return '<article class="vps-ref-card"><a href="' + _esc(ref.url || '#') + '" target="_blank" rel="noopener noreferrer">' + _esc(ref.title || ref.url || '') + '</a><p>' + _esc(ref.note || '') + '</p></article>';
  }).join('') + '</div>';
}

function _nextFeatureCards(overview){
  var items = Array.isArray(overview && overview.next_features) ? overview.next_features : [];
  if(!items.length) return '';
  return '<div class="vps-card-grid">' + items.map(function(item){
    var href = _webHref(item.url);
    var status = String(item.status || 'next');
    return '<article class="vps-card">' +
      '<strong>' + (href ? '<a href="' + _esc(href) + '" target="_blank" rel="noopener noreferrer">' + _esc(item.title || '') + '</a>' : _esc(item.title || '')) + '</strong>' +
      '<p>' + _esc(item.body || '') + '</p>' +
      '<span class="vps-status ' + _statusClass(status === 'next' ? 'ok' : 'warning') + '">' + _esc(status) + '</span>' +
    '</article>';
  }).join('') + '</div>';
}

function _assetCards(overview){
  var items = Array.isArray(overview && overview.control_assets) ? overview.control_assets : [];
  if(!items.length) return '';
  return '<div class="vps-card-grid">' + items.map(function(item){
    var openHref = _assetHref(item.path);
    var downloadHref = _assetHref(item.path, true);
    return '<article class="vps-card">' +
      '<strong>' + _esc(item.label || item.id || '') + '</strong>' +
      '<p>' + _esc(item.relative_path || item.path || '') + '</p>' +
      '<span class="vps-status ' + _statusClass(item.exists ? 'ok' : 'warning') + '">' + _esc(item.kind || 'asset') + (item.exists ? '' : ' • missing') + '</span>' +
      '<div class="vps-inline-actions">' +
        (openHref ? '<a class="vps-link-btn primary" href="' + _esc(openHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở trong portal', 'Open in portal')) + '</a>' : '') +
        (downloadHref ? '<a class="vps-link-btn" href="' + _esc(downloadHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Tải raw file', 'Download raw file')) + '</a>' : '') +
      '</div>' +
    '</article>';
  }).join('') + '</div>';
}

function _overviewTab(overview){
  overview = overview || {};
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel dark">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('4 lớp control plane', 'Four control-plane layers')) + '</h2><p>' + _esc(_t('Không nhồi tất cả vào một PHP terminal. Tách rõ UI, terminal, telemetry và DNS/API mới đi được đường dài.', 'Do not cram everything into a single PHP terminal. Separate UI, terminal, telemetry, and DNS/API if you want a durable system.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' + _architectureCards(overview) + '</div>' +
      '</section>' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Quyết định nền tảng', 'Platform decisions')) + '</h2><p>' + _esc(_t('Phần này chốt những thứ phải đổi nếu muốn bỏ hoàn toàn quy trình “AZDIGI tab + SSH tab”.', 'These are the non-negotiable changes required if you want to fully eliminate the “AZDIGI tab + SSH tab” workflow.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          '<div class="vps-card-grid">' +
            '<article class="vps-card"><strong>' + _esc(_t('DNS', 'DNS')) + '</strong><p>' + _esc((overview.dns_strategy && overview.dns_strategy.limitation) || _t('Nếu zone vẫn giữ ở portal nhà cung cấp không có API ổn định, dashboard chỉ dừng ở mức nhắc việc hoặc scrape tạm.', 'If the zone stays inside a provider portal without a stable API, the dashboard cannot become a real control plane.')) + '</p></article>' +
            '<article class="vps-card"><strong>' + _esc(_t('Terminal', 'Terminal')) + '</strong><p>' + _esc(_t('Giao diện terminal nên dùng xterm.js phía browser và một terminal gateway kiểu ttyd ở bastion hoặc trên từng host.', 'The terminal UX should use xterm.js in the browser and a ttyd-style terminal gateway on a bastion or each host.')) + '</p></article>' +
            '<article class="vps-card"><strong>' + _esc(_t('Container control', 'Container control')) + '</strong><p>' + _esc(_t('Nếu host chạy Docker nhiều, Portainer Edge hợp lý cho lớp điều phối container; đừng bắt portal PHP làm hết phần này.', 'If the host runs a real Docker estate, Portainer Edge is the right layer for container control; do not force the PHP portal to own everything.')) + '</p></article>' +
            '<article class="vps-card"><strong>' + _esc(_t('Observability', 'Observability')) + '</strong><p>' + _esc(_t('Repo này đã có OTel collector local. Hướng nâng cấp đúng là gắn host metrics/alerts chuẩn, không phải chỉ đọc log thủ công.', 'This repo already includes a local OTel collector. The correct next step is proper host metrics and alerts, not manual log reading forever.')) + '</p></article>' +
          '</div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<section class="vps-panel" style="margin-top:16px">' +
      '<div class="vps-panel-head"><div><h2>' + _esc(_t('Nguồn tham chiếu chính thức', 'Official reference stack')) + '</h2><p>' + _esc(_t('Những nguồn này là xương sống cho terminal, observability, container control và DNS/API.', 'These are the backbone sources for terminal, observability, container control, and DNS/API decisions.')) + '</p></div></div>' +
      '<div class="vps-panel-body">' + _referenceCards(overview) + '</div>' +
    '</section>' +
    '<section class="vps-panel" style="margin-top:16px">' +
      '<div class="vps-panel-head"><div><h2>' + _esc(_t('Tính năng nên làm tiếp', 'Next capabilities')) + '</h2><p>' + _esc(_t('Các tính năng này là bước nâng cấp hợp lý tiếp theo nếu muốn control plane này quản được nhiều host hơn và ít thao tác tay hơn.', 'These are the next sensible upgrades if you want this control plane to govern more hosts with less manual work.')) + '</p></div></div>' +
      '<div class="vps-panel-body">' + _nextFeatureCards(overview) + '</div>' +
    '</section>';
}

function _keyval(system, resources){
  return '<div class="vps-keyval">' +
    '<div class="vps-kv"><small>' + _esc(_t('Hostname', 'Hostname')) + '</small><strong>' + _esc(system.hostname || '—') + '</strong></div>' +
    '<div class="vps-kv"><small>' + _esc(_t('OS / arch', 'OS / arch')) + '</small><strong>' + _esc([system.os, system.arch].filter(Boolean).join(' / ') || '—') + '</strong></div>' +
    '<div class="vps-kv"><small>' + _esc(_t('Load', 'Load')) + '</small><strong>' + _esc(system.load || '—') + '</strong></div>' +
    '<div class="vps-kv"><small>' + _esc(_t('Disk root', 'Disk root')) + '</small><strong>' + _esc(resources.disk_used_pct || '—') + '</strong></div>' +
    '<div class="vps-kv"><small>' + _esc(_t('Memory', 'Memory')) + '</small><strong>' + _esc(resources.memory_used_pct || '—') + '</strong></div>' +
    '<div class="vps-kv"><small>' + _esc(_t('Last probe', 'Last probe')) + '</small><strong>' + _esc(_fmtTime(system.last_probe_at)) + '</strong></div>' +
  '</div>';
}

function _servicesTable(host){
  var services = Array.isArray(host && host.services) ? host.services : [];
  if(!services.length) return '<div class="vps-empty">' + _esc(_t('Chưa khai báo service.', 'No services declared.')) + '</div>';
  return '<table class="vps-service-table"><thead><tr><th>' + _esc(_t('Service', 'Service')) + '</th><th>' + _esc(_t('Status', 'Status')) + '</th><th>' + _esc(_t('Type', 'Type')) + '</th></tr></thead><tbody>' +
    services.map(function(item){
      return '<tr><td><strong>' + _esc(item.label || item.name || '') + '</strong><br><span>' + _esc(item.name || '') + '</span></td>' +
        '<td><span class="vps-status ' + _statusClass(item.status) + '">' + _esc(item.status || 'unknown') + '</span></td>' +
        '<td>' + _esc(item.kind || 'systemd') + '</td></tr>';
    }).join('') +
  '</tbody></table>';
}

function _dnsAndSites(host){
  var sites = Array.isArray(host && host.sites) ? host.sites : [];
  var dnsRecords = Array.isArray(host && host.dns_records) ? host.dns_records : [];
  return '' +
    '<div class="vps-site-grid">' +
      '<article class="vps-site-card"><a href="#">' + _esc(_t('Ingress & domains', 'Ingress & domains')) + '</a><p>' + _esc(_t('Những domain/site đang buộc control plane phải theo dõi.', 'The domains and sites this control plane needs to keep alive.')) + '</p>' +
        '<table class="vps-list-table"><thead><tr><th>' + _esc(_t('Site', 'Site')) + '</th><th>' + _esc(_t('Role', 'Role')) + '</th></tr></thead><tbody>' +
        (sites.length ? sites.map(function(site){
          var href = site.url || '#';
          return '<tr><td><a href="' + _esc(href) + '" target="_blank" rel="noopener noreferrer">' + _esc(site.host || site.label || href) + '</a></td><td>' + _esc(site.role || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="2">' + _esc(_t('Chưa có site.', 'No sites declared.')) + '</td></tr>') +
        '</tbody></table></article>' +
      '<article class="vps-site-card"><a href="#">DNS</a><p>' + _esc(_t('Đây là inventory DNS cần chuyển sang API-first nếu muốn điều khiển thật từ dashboard.', 'This is the DNS inventory that needs to move to an API-first model if you want true dashboard control.')) + '</p>' +
        '<table class="vps-list-table"><thead><tr><th>' + _esc(_t('Name', 'Name')) + '</th><th>' + _esc(_t('Type', 'Type')) + '</th><th>' + _esc(_t('Target', 'Target')) + '</th></tr></thead><tbody>' +
        (dnsRecords.length ? dnsRecords.map(function(row){
          return '<tr><td>' + _esc(row.name || '') + '</td><td>' + _esc(row.type || '') + '</td><td>' + _esc(row.value || '') + '</td></tr>';
        }).join('') : '<tr><td colspan="3">' + _esc(_t('Chưa có record.', 'No records declared.')) + '</td></tr>') +
        '</tbody></table></article>' +
    '</div>';
}

function _console(result){
  if(!result){
    return '<div class="vps-console"><div class="vps-console-head"><span>' + _esc(_t('Action output', 'Action output')) + '</span><span>' + _esc(_t('Chọn một action an toàn để xem output.', 'Select a safe action to see command output.')) + '</span></div><pre>' + _esc(_t('Chưa có output nào. Gợi ý: chạy Health snapshot hoặc Nginx config test.', 'No output yet. Suggested first actions: Health snapshot or Nginx config test.')) + '</pre></div>';
  }
  return '<div class="vps-console"><div class="vps-console-head"><span>' + _esc(result.label || result.action || 'command') + '</span><span>' + _esc(_fmtTime(result.executed_at)) + ' • exit ' + _esc(result.exit_code) + '</span></div><pre>' + _esc(result.output || _t('Không có output.', 'No output.')) + '</pre></div>';
}

function _hostTab(host){
  if(!host){
    return '<div class="vps-panel"><div class="vps-panel-body"><div class="vps-empty">' + _esc(_t('Chưa chọn host hoặc host chưa phản hồi.', 'No host selected or the host has not answered yet.')) + '</div></div></div>';
  }
  var actions = Array.isArray(host.allowed_actions) ? host.allowed_actions : [];
  var system = host.system || {};
  var resources = host.resources || {};
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(host.label || host.id || '') + '</h2><p>' + _esc((host.provider || '') + (host.public_ip ? ' • ' + host.public_ip : '')) + '</p></div>' +
          '<span class="vps-status ' + _statusClass(host.connection && host.connection.status) + '">' + _esc(host.connection && host.connection.message ? host.connection.message : (host.connection && host.connection.status ? host.connection.status : _t('inventory only', 'inventory only'))) + '</span>' +
        '</div>' +
        '<div class="vps-panel-body">' +
          _keyval(system, resources) +
          '<div style="margin-top:16px"></div>' +
          _dnsAndSites(host) +
        '</div>' +
      '</section>' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Safe action runner', 'Safe action runner')) + '</h2><p>' + _esc(_t('Chỉ cho chạy action whitelisted. Không mở arbitrary shell trực tiếp trong PHP layer.', 'Only whitelisted actions are allowed. No arbitrary shell is exposed directly from the PHP layer.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          '<div class="vps-actions">' +
            (actions.length ? actions.map(function(action){
              var active = state.actionBusy && state.actionBusy === action.id;
              return '<button class="vps-action-btn' + (action.emphasis ? ' primary' : '') + '" data-action="' + _esc(action.id) + '"' + (active ? ' disabled' : '') + '>' + _esc(active ? _t('Đang chạy...', 'Running...') : action.label || action.id) + '</button>';
            }).join('') : '<div class="vps-note warn">' + _esc(_t('Host này chưa khai báo safe action.', 'No safe action is declared for this host yet.')) + '</div>') +
          '</div>' +
          '<div style="margin-top:16px">' + _console(state.actionResult) + '</div>' +
        '</div>' +
      '</section>' +
    '</div>' +
    '<section class="vps-panel" style="margin-top:16px">' +
      '<div class="vps-panel-head"><div><h2>' + _esc(_t('Service health', 'Service health')) + '</h2><p>' + _esc(_t('Status đọc từ probe local/SSH. Nếu connection fail, bảng này vẫn giữ inventory để bạn biết host cần gì.', 'Status is derived from the local/SSH probe. If the connection fails, the table still shows the declared inventory so you know what the host is supposed to run.')) + '</p></div></div>' +
      '<div class="vps-panel-body">' + _servicesTable(host) + '</div>' +
    '</section>';
}

function _terminalTab(host, overview){
  var terminals = Array.isArray(host && host.terminals) ? host.terminals : [];
  var quickCommands = Array.isArray(overview && overview.quick_commands) ? overview.quick_commands : [];
  var gateway = overview && overview.terminal_gateway ? overview.terminal_gateway : {};
  var selected = _selectedTerminal(host);
  var selectedUrl = selected && selected.url ? String(selected.url) : '';
  var canEmbed = !!(selected && selected.embed !== false && selectedUrl);
  var setupDocHref = _assetHref(gateway.setup_doc);
  var installScriptHref = _assetHref(gateway.install_script);
  var installScriptDownloadHref = _assetHref(gateway.install_script, true);
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Terminal plane', 'Terminal plane')) + '</h2><p>' + _esc(_t('Dashboard này không nên tự làm PTY server trong PHP. Nó chỉ nên nhúng hoặc mở terminal gateway đã hardened.', 'This dashboard should not become a PTY server inside PHP. It should embed or open a hardened terminal gateway.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          (terminals.length ? (
            '<div class="vps-terminal-picker">' + terminals.map(function(item){
              var active = String(item.id || '') === String(state.selectedTerminalId || '');
              return '<button class="vps-terminal-tile' + (active ? ' active' : '') + '" data-terminal-id="' + _esc(item.id || '') + '">' +
                '<strong>' + _esc(item.label || item.id || '') + '</strong>' +
                '<span class="vps-status ' + _statusClass((item.access || '') === 'write' ? 'warn' : 'ok') + '">' + _esc((item.access || '') === 'write' ? _t('write', 'write') : _t('read-only', 'read-only')) + '</span>' +
                '<p>' + _esc(item.note || '') + '</p>' +
              '</button>';
            }).join('') + '</div>' +
            (selected ? (
              '<div class="vps-terminal-workspace">' +
                '<div class="vps-terminal-toolbar">' +
                  '<div><strong>' + _esc(selected.label || selected.id || '') + '</strong><span>' + _esc(gateway.auth_model || _t('Portal session bảo vệ terminal qua gateway.', 'Portal session protects the terminal via the gateway.')) + '</span></div>' +
                  '<div class="vps-terminal-actions">' +
                    (selectedUrl ? '<a class="vps-link-btn primary" href="' + _esc(selectedUrl) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở terminal', 'Open terminal')) + '</a>' : '') +
                    (setupDocHref ? '<a class="vps-link-btn" href="' + _esc(setupDocHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Xem setup', 'Open setup doc')) + '</a>' : '') +
                    (installScriptHref ? '<a class="vps-link-btn" href="' + _esc(installScriptHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở script', 'Open install script')) + '</a>' : '') +
                  '</div>' +
                '</div>' +
                (canEmbed
                  ? '<iframe class="vps-terminal-frame" src="' + _esc(selectedUrl) + '" title="' + _esc(selected.label || selected.id || 'terminal') + '" loading="lazy" referrerpolicy="same-origin"></iframe>'
                  : '<div class="vps-note warn">' + _esc(_t('Terminal này chưa có URL để nhúng. Hãy chạy script cài terminal gateway và cấu hình lại inventory.', 'This terminal does not have an embeddable URL yet. Run the terminal gateway installer and update the inventory.')) + '</div>'
                ) +
              '</div>'
            ) : '') 
          ) : '<div class="vps-note warn">' + _esc(_t('Chưa có terminal URL nào được cấu hình. Hãy dựng ttyd ở bastion hoặc trên từng host rồi gắn URL vào inventory.', 'No terminal URL is configured yet. Deploy ttyd on the bastion or each host, then attach the URL to the inventory.')) + '</div>') +
        '</div>' +
      '</section>' +
      '<section class="vps-panel dark">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Quick commands', 'Quick commands')) + '</h2><p>' + _esc(_t('Dùng cho giai đoạn chuyển tiếp trước khi terminal gateway hoàn thiện.', 'Use these during the transition phase before the terminal gateway is fully deployed.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          '<div class="vps-note">' + _esc((gateway.stack || _t('ttyd sau Nginx reverse proxy.', 'ttyd behind an Nginx reverse proxy.')) + ' • ' + (gateway.auth_model || _t('Portal session auth.', 'Portal session auth.'))) + '</div>' +
          (gateway.install_script ? '<div class="vps-command-card" style="margin:12px 0"><small>' + _esc(_t('Install gateway', 'Install gateway')) + '</small><code>' + _esc(gateway.install_script) + '</code></div>' : '') +
          ((setupDocHref || installScriptDownloadHref) ? '<div class="vps-inline-actions" style="margin:12px 0 16px">' +
            (setupDocHref ? '<a class="vps-link-btn primary" href="' + _esc(setupDocHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Đọc setup', 'Read setup doc')) + '</a>' : '') +
            (installScriptDownloadHref ? '<a class="vps-link-btn" href="' + _esc(installScriptDownloadHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Tải script', 'Download script')) + '</a>' : '') +
          '</div>' : '') +
          (quickCommands.length ? quickCommands.map(function(cmd){
            return '<div class="vps-command-card" style="margin-bottom:12px"><small>' + _esc(cmd.label || '') + '</small><code>' + _esc(cmd.command || '') + '</code></div>';
          }).join('') : '<div class="vps-empty">' + _esc(_t('Chưa có quick command.', 'No quick command declared.')) + '</div>') +
        '</div>' +
      '</section>' +
    '</div>';
}

function _observabilityTab(host, overview){
  var panels = Array.isArray(host && host.observability) ? host.observability : [];
  var stack = overview && overview.observability_stack ? overview.observability_stack : {};
  var selected = _selectedObservability(host);
  var selectedUrl = selected && selected.url ? String(selected.url) : '';
  var canEmbed = !!(selected && selected.embed !== false && selectedUrl);
  var setupDocHref = _assetHref(stack.setup_doc);
  var installScriptHref = _assetHref(stack.install_script);
  var installScriptDownloadHref = _assetHref(stack.install_script, true);
  var quickCommands = Array.isArray(overview && overview.quick_commands) ? overview.quick_commands.filter(function(cmd){
    return /observability|grafana|netdata/i.test(String(cmd && cmd.label || '') + ' ' + String(cmd && cmd.command || ''));
  }) : [];
  return '' +
    '<div class="vps-shell-grid">' +
      '<section class="vps-panel">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Observability plane', 'Observability plane')) + '</h2><p>' + _esc(_t('Live metrics và dashboard phải được xem ngay trong control plane, không chỉ là link tham khảo.', 'Live metrics and dashboards should be visible inside the control plane, not merely linked as references.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          (panels.length ? (
            '<div class="vps-terminal-picker">' + panels.map(function(item){
              var active = String(item.id || '') === String(state.selectedObservabilityId || '');
              return '<button class="vps-terminal-tile' + (active ? ' active' : '') + '" data-observability-id="' + _esc(item.id || '') + '">' +
                '<strong>' + _esc(item.label || item.id || '') + '</strong>' +
                '<span class="vps-status ' + _statusClass((item.kind || '') === 'metrics' ? 'ok' : 'warn') + '">' + _esc(item.kind || 'dashboard') + '</span>' +
                '<p>' + _esc(item.note || '') + '</p>' +
              '</button>';
            }).join('') + '</div>' +
            (selected ? (
              '<div class="vps-terminal-workspace">' +
                '<div class="vps-terminal-toolbar">' +
                  '<div><strong>' + _esc(selected.label || selected.id || '') + '</strong><span>' + _esc(stack.auth_model || _t('Portal session bảo vệ observability stack qua Nginx.', 'Portal session protects the observability stack through Nginx.')) + '</span></div>' +
                  '<div class="vps-terminal-actions">' +
                    (selectedUrl ? '<a class="vps-link-btn primary" href="' + _esc(selectedUrl) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở panel', 'Open panel')) + '</a>' : '') +
                    (setupDocHref ? '<a class="vps-link-btn" href="' + _esc(setupDocHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Xem setup', 'Open setup doc')) + '</a>' : '') +
                    (installScriptHref ? '<a class="vps-link-btn" href="' + _esc(installScriptHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Mở script', 'Open install script')) + '</a>' : '') +
                  '</div>' +
                '</div>' +
                (canEmbed
                  ? '<iframe class="vps-terminal-frame" src="' + _esc(selectedUrl) + '" title="' + _esc(selected.label || selected.id || 'observability') + '" loading="lazy" referrerpolicy="same-origin"></iframe>'
                  : '<div class="vps-note warn">' + _esc(_t('Panel này chưa có URL để nhúng. Hãy chạy script cài observability stack và cấu hình lại inventory.', 'This panel does not have an embeddable URL yet. Run the observability installer and update the inventory.')) + '</div>'
                ) +
              '</div>'
            ) : '')
          ) : '<div class="vps-note warn">' + _esc(_t('Chưa có observability panel nào được cấu hình cho host này.', 'No observability panel is configured for this host yet.')) + '</div>') +
        '</div>' +
      '</section>' +
      '<section class="vps-panel dark">' +
        '<div class="vps-panel-head"><div><h2>' + _esc(_t('Monitoring stack', 'Monitoring stack')) + '</h2><p>' + _esc(_t('Netdata cho host telemetry tức thời, Grafana cho dashboard và alerting cùng domain.', 'Netdata provides instant host telemetry, while Grafana handles dashboards and alerting under the same domain.')) + '</p></div></div>' +
        '<div class="vps-panel-body">' +
          '<div class="vps-note">' + _esc((stack.stack || _t('Netdata và Grafana sau Nginx reverse proxy.', 'Netdata and Grafana behind an Nginx reverse proxy.')) + ' • ' + (stack.auth_model || _t('Portal session auth.', 'Portal session auth.'))) + '</div>' +
          (stack.install_script ? '<div class="vps-command-card" style="margin:12px 0"><small>' + _esc(_t('Install stack', 'Install stack')) + '</small><code>' + _esc(stack.install_script) + '</code></div>' : '') +
          ((setupDocHref || installScriptDownloadHref) ? '<div class="vps-inline-actions" style="margin:12px 0 16px">' +
            (setupDocHref ? '<a class="vps-link-btn primary" href="' + _esc(setupDocHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Đọc setup', 'Read setup doc')) + '</a>' : '') +
            (installScriptDownloadHref ? '<a class="vps-link-btn" href="' + _esc(installScriptDownloadHref) + '" target="_blank" rel="noopener noreferrer">' + _esc(_t('Tải script', 'Download script')) + '</a>' : '') +
          '</div>' : '') +
          (quickCommands.length ? quickCommands.map(function(cmd){
            return '<div class="vps-command-card" style="margin-bottom:12px"><small>' + _esc(cmd.label || '') + '</small><code>' + _esc(cmd.command || '') + '</code></div>';
          }).join('') : '<div class="vps-empty">' + _esc(_t('Chưa có quick command observability.', 'No observability quick command declared.')) + '</div>') +
        '</div>' +
      '</section>' +
    '</div>';
}

function _runbookTab(overview){
  var steps = Array.isArray(overview && overview.runbook_steps) ? overview.runbook_steps : [];
  return '<section class="vps-panel"><div class="vps-panel-head"><div><h2>' + _esc(_t('Phased rollout', 'Phased rollout')) + '</h2><p>' + _esc(_t('Đây là thứ tự nên làm để từ một portal nội bộ đi tới control plane thật cho VPS.', 'This is the correct sequence to move from an internal portal to a real VPS control plane.')) + '</p></div></div><div class="vps-panel-body"><div class="vps-runbook-list">' +
    (steps.length ? steps.map(function(step){
      return '<article class="vps-runbook-step"><strong>' + _esc(step.phase || '') + '</strong><div><h3>' + _esc(step.title || '') + '</h3><p>' + _esc(step.body || '') + '</p></div></article>';
    }).join('') : '<div class="vps-empty">' + _esc(_t('Chưa có rollout step.', 'No rollout steps declared.')) + '</div>') +
  '</div>' +
  '<div style="margin-top:18px"><h3 style="margin:0 0 12px">' + _esc(_t('Ops assets', 'Ops assets')) + '</h3>' + _assetCards(overview) + '</div>' +
  '</div></section>';
}

function _body(){
  var overview = state.overview || {};
  if(overview.error){
    return '<div class="vps-panel"><div class="vps-panel-body"><div class="vps-empty">' + _esc(overview.error) + '</div></div></div>';
  }
  var hosts = Array.isArray(overview.hosts) ? overview.hosts : [];
  var body = _hero(overview) + _summaryCards(overview.metrics || {});
  body += '<div class="vps-tabs">' +
    '<button class="vps-tab' + (state.tab === 'overview' ? ' active' : '') + '" data-vps-tab="overview">' + _esc(_t('Kiến trúc', 'Architecture')) + '</button>' +
    '<button class="vps-tab' + (state.tab === 'hosts' ? ' active' : '') + '" data-vps-tab="hosts">' + _esc(_t('Host & service', 'Hosts & services')) + '</button>' +
    '<button class="vps-tab' + (state.tab === 'observability' ? ' active' : '') + '" data-vps-tab="observability">' + _esc(_t('Observability', 'Observability')) + '</button>' +
    '<button class="vps-tab' + (state.tab === 'terminal' ? ' active' : '') + '" data-vps-tab="terminal">' + _esc(_t('Terminal', 'Terminal')) + '</button>' +
    '<button class="vps-tab' + (state.tab === 'runbook' ? ' active' : '') + '" data-vps-tab="runbook">' + _esc(_t('Roadmap', 'Roadmap')) + '</button>' +
  '</div>';
  body += _hostPicker(hosts);
  body += '<div style="margin-top:16px"></div>';
  if(state.tab === 'overview') body += _overviewTab(overview);
  if(state.tab === 'hosts') body += _hostTab(state.host);
  if(state.tab === 'observability') body += _observabilityTab(state.host || {}, overview);
  if(state.tab === 'terminal') body += _terminalTab(state.host || {}, overview);
  if(state.tab === 'runbook') body += _runbookTab(overview);
  return body;
}

function _paint(){
  if(!state.container) return;
  if(state.loading && !state.overview){
    state.container.innerHTML = '<div class="vps-ct"><div class="vps-panel"><div class="vps-panel-body"><div class="vps-empty">' + _esc(_t('Đang tải control plane VPS...', 'Loading VPS control plane...')) + '</div></div></div></div>';
    return;
  }
  state.container.innerHTML = '<div class="vps-ct">' + _body() + '</div>';
  _bind();
}

function _bind(){
  if(!state.container) return;
  state.container.querySelectorAll('[data-vps-tab]').forEach(function(btn){
    btn.onclick = function(){ _setTab(btn.getAttribute('data-vps-tab')); };
  });
  state.container.querySelectorAll('[data-host-id]').forEach(function(btn){
    btn.onclick = function(){ _setHost(btn.getAttribute('data-host-id')); };
  });
  state.container.querySelectorAll('[data-action]').forEach(function(btn){
    btn.onclick = function(){ _runAction(btn.getAttribute('data-action')); };
  });
  state.container.querySelectorAll('[data-terminal-id]').forEach(function(btn){
    btn.onclick = function(){ _setTerminal(btn.getAttribute('data-terminal-id')); };
  });
  state.container.querySelectorAll('[data-observability-id]').forEach(function(btn){
    btn.onclick = function(){ _setObservability(btn.getAttribute('data-observability-id')); };
  });
}

window._renderVpsControlTower = _render;
})();
