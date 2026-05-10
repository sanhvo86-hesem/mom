/* ===================================================================
   00d-admin-ai-control.js
   HESEM MOM Portal — Admin: AI Control Tab
   Provides full AI engine configuration: on/off, model, API key,
   feature toggles, usage stats, circuit breaker, rate limiting.
   Loaded on-demand by renderAdminAiControl() in 02-state-auth-ui.js.
   =================================================================== */

(function(){
'use strict';

/* ── i18n helper ──────────────────────────────────────────────── */
function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }

/* ── State ────────────────────────────────────────────────────── */
var _cfg = null;       // loaded config object
var _usage = null;     // usage stats from server
var _saving = false;
var _testing = false;
var _container = null; // element passed by caller; prevents stale getElementById stomping later tabs

/* ── Supported models ─────────────────────────────────────────── */
var AI_MODELS = [
  { id:'claude-opus-4-7',             label:'Claude Opus 4.7',             provider:'anthropic', tier:'premium',  ctx:200000 },
  { id:'claude-sonnet-4-6',           label:'Claude Sonnet 4.6',           provider:'anthropic', tier:'balanced', ctx:200000 },
  { id:'claude-haiku-4-5-20251001',   label:'Claude Haiku 4.5',            provider:'anthropic', tier:'fast',     ctx:200000 },
  { id:'claude-opus-4-5',             label:'Claude Opus 4.5 (legacy)',     provider:'anthropic', tier:'premium',  ctx:200000 },
  { id:'claude-sonnet-4-5',           label:'Claude Sonnet 4.5 (legacy)',   provider:'anthropic', tier:'balanced', ctx:200000 },
  { id:'claude-sonnet-4-20250514',    label:'Claude Sonnet 4 (20250514, legacy)', provider:'anthropic', tier:'balanced', ctx:200000 },
  { id:'claude-haiku-3-5',            label:'Claude Haiku 3.5 (legacy)',    provider:'anthropic', tier:'fast',     ctx:200000 },
  { id:'claude-haiku-3-20240307',     label:'Claude Haiku 3 (legacy)',      provider:'anthropic', tier:'fast',     ctx:200000 },
];

/* ── Main render entry point ──────────────────────────────────── */
window._renderAdminAiControl = function(el){
  _container = el;
  el.innerHTML = _skeleton();
  _load();
};

/* ── Skeleton while loading ───────────────────────────────────── */
function _skeleton(){
  return `<div class="ai-ctrl-wrap">
    <div class="ai-ctrl-loading">
      <span class="spin-icon">⟳</span>
      ${_t('Đang tải cấu hình AI...','Loading AI configuration...')}
    </div>
  </div>`;
}

/* ── Load config from server ──────────────────────────────────── */
function _load(){
  _fetchCfg(function(cfg){
    _cfg = cfg;
    _fetchUsage(function(usage){
      _usage = usage;
      _render();
    });
  });
}

function _fetchCfg(cb){
  var token = window.csrfToken || '';
  fetch('api.php?action=admin_ai_config_get', {
    credentials:'same-origin',
    headers:{'X-CSRF-Token': token}
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    cb(d.ok ? (d.config || {}) : {});
  })
  .catch(function(){ cb({}); });
}

function _fetchUsage(cb){
  var token = window.csrfToken || '';
  fetch('api.php?action=admin_ai_usage_get', {
    credentials:'same-origin',
    headers:{'X-CSRF-Token': token}
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    cb(d.ok ? (d.usage || {}) : {});
  })
  .catch(function(){ cb({}); });
}

/* ── Main render ──────────────────────────────────────────────── */
function _render(){
  var el = _container || document.getElementById('admin-content');
  if(!el || !document.contains(el)) return;

  var cfg = _cfg || {};
  var enabled  = cfg.enabled === true || cfg.enabled === 'true';
  var model    = cfg.model || 'claude-sonnet-4-20250514';
  var apiKey   = cfg.api_key || '';
  var maxTok   = parseInt(cfg.max_tokens) || 4096;
  var timeout  = parseInt(cfg.timeout) || 30;
  var cacheTtl = parseInt(cfg.cache_ttl) || 300;
  var rpmLimit = parseInt(cfg.rpm_limit) || 60;
  var userRpm  = parseInt(cfg.user_rpm_limit) || 20;

  var feats = cfg.features || {};
  var featRealtime  = feats.realtime  !== false;
  var featRecommend = feats.recommendations !== false;
  var featChat      = feats.chat      !== false;
  var featPredict   = feats.predictions !== false;
  var featSchedule  = feats.schedule  !== false;
  var featSummarise = feats.summarise !== false;
  var featRca       = feats.rca       !== false;

  var usage  = _usage || {};
  var cb     = usage.circuit_breaker || {};
  var cbOpen = cb.state === 'open';

  el.innerHTML = `
<div class="ai-ctrl-wrap">

  <!-- ══ Header ══════════════════════════════════════════════ -->
  <div class="ai-ctrl-header">
    <div class="ai-ctrl-title">
      <span class="ai-ctrl-icon">🤖</span>
      <div>
        <h2>${_t('Điều khiển AI','AI Control')}</h2>
        <p class="ai-ctrl-subtitle">${_t('Cấu hình AI engine, model, tính năng và giới hạn sử dụng','Configure AI engine, model, features and usage limits')}</p>
      </div>
    </div>
    <div class="ai-ctrl-master">
      <span class="ai-ctrl-master-label">${_t('AI Engine','AI Engine')}</span>
      <label class="ai-toggle-switch ai-toggle-lg ${enabled?'on':'off'}" id="ai-master-toggle-wrap" title="${_t('Bật/tắt toàn bộ AI','Enable/disable all AI')}">
        <input type="checkbox" id="ai-master-enabled" ${enabled?'checked':''} onchange="_aiToggleMaster(this.checked)">
        <span class="ai-toggle-track"><span class="ai-toggle-thumb"></span></span>
      </label>
      <span class="ai-status-badge ${enabled?'enabled':'disabled'}" id="ai-master-badge">
        ${enabled ? _t('BẬT','ON') : _t('TẮT','OFF')}
      </span>
    </div>
  </div>

  <!-- ══ Alert when disabled ══════════════════════════════════ -->
  <div class="ai-ctrl-disabled-notice" id="ai-disabled-notice" style="display:${enabled?'none':'flex'}">
    <span>⚠️</span>
    <span>${_t('AI Engine đang TẮT. Tất cả tính năng AI sẽ không hoạt động.','AI Engine is OFF. All AI features are disabled.')}</span>
  </div>

  <!-- ══ Circuit Breaker Alert ════════════════════════════════ -->
  <div class="ai-ctrl-cb-alert" id="ai-cb-alert" style="display:${cbOpen?'flex':'none'}">
    <span>🔴</span>
    <span>${_t('Circuit breaker đang MỞ — AI tạm thời bị tắt do lỗi liên tiếp.','Circuit breaker is OPEN — AI temporarily disabled due to repeated failures.')}</span>
    <button class="btn-sm btn-warning" onclick="_aiResetCb()">${_t('Reset','Reset')}</button>
  </div>

  <div class="ai-ctrl-body ${enabled?'':'ai-ctrl-body-disabled'}" id="ai-ctrl-body">

    <!-- ══ Section 1: Model Configuration ══════════════════════ -->
    <section class="ai-ctrl-section">
      <h3 class="ai-ctrl-section-title">
        <span>🧠</span> ${_t('Cấu hình Model','Model Configuration')}
      </h3>
      <div class="ai-ctrl-grid">

        <!-- Provider -->
        <div class="ai-ctrl-field ai-ctrl-field-full">
          <label>${_t('Nhà cung cấp','Provider')}</label>
          <div class="ai-provider-pills">
            <button class="ai-provider-pill active" data-provider="anthropic">
              <img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24'%3E%3Cpath fill='%23D4A27F' d='M13.33 4h-2.66L4 19h3.25l1.42-3.75h6.66L16.75 19H20L13.33 4zm-3.75 8.5L12 7.25l2.42 5.25H9.58z'/%3E%3C/svg%3E" width="16" height="16" alt="">
              Anthropic Claude
            </button>
            <button class="ai-provider-pill" data-provider="openai" disabled title="${_t('Sắp ra mắt','Coming soon')}">
              <span>🔒</span> OpenAI GPT
            </button>
            <button class="ai-provider-pill" data-provider="local" disabled title="${_t('Sắp ra mắt','Coming soon')}">
              <span>🔒</span> Local LLM
            </button>
          </div>
        </div>

        <!-- Model selection -->
        <div class="ai-ctrl-field ai-ctrl-field-full">
          <label for="ai-model-select">${_t('Model','Model')}</label>
          <div class="ai-model-select-wrap">
            <select id="ai-model-select" class="ai-ctrl-select" onchange="_aiModelChange(this.value)">
              ${AI_MODELS.map(function(m){
                return `<option value="${m.id}" ${m.id===model?'selected':''}
                  data-tier="${m.tier}" data-ctx="${m.ctx}">
                  ${m.label}
                </option>`;
              }).join('')}
            </select>
            <div class="ai-model-badge-wrap" id="ai-model-badges">
              ${_modelBadges(model)}
            </div>
          </div>
        </div>

        <!-- API Key -->
        <div class="ai-ctrl-field ai-ctrl-field-full">
          <label for="ai-api-key">${_t('API Key','API Key')}
            <span class="ai-field-note">${_t('Lưu mã hoá trong server, không hiển thị toàn bộ','Stored encrypted server-side, partially masked')}</span>
          </label>
          <div class="ai-api-key-wrap">
            <input type="password" id="ai-api-key" class="ai-ctrl-input ai-api-key-input"
              placeholder="${apiKey ? '••••••••' + apiKey.slice(-4) : _t('Nhập Anthropic API key...','Enter Anthropic API key...')}"
              autocomplete="off" spellcheck="false">
            <button class="ai-key-toggle" type="button" onclick="_aiToggleKeyVis()" title="${_t('Hiện/ẩn','Show/Hide')}">👁</button>
            <button class="ai-key-test" type="button" id="ai-test-btn" onclick="_aiTestKey()">${_t('Kiểm tra kết nối','Test connection')}</button>
          </div>
          <div class="ai-key-status" id="ai-key-status"></div>
        </div>

        <!-- Max tokens -->
        <div class="ai-ctrl-field">
          <label for="ai-max-tokens">${_t('Số token tối đa','Max tokens')}
            <span class="ai-field-badge" id="ai-tok-val">${maxTok.toLocaleString()}</span>
          </label>
          <input type="range" id="ai-max-tokens" class="ai-ctrl-range"
            min="512" max="16000" step="512" value="${maxTok}"
            oninput="document.getElementById('ai-tok-val').textContent=parseInt(this.value).toLocaleString()">
          <div class="ai-range-labels"><span>512</span><span>4K</span><span>8K</span><span>16K</span></div>
        </div>

        <!-- Timeout -->
        <div class="ai-ctrl-field">
          <label for="ai-timeout">${_t('Timeout (giây)','Timeout (seconds)')}
            <span class="ai-field-badge" id="ai-tout-val">${timeout}s</span>
          </label>
          <input type="range" id="ai-timeout" class="ai-ctrl-range"
            min="10" max="120" step="5" value="${timeout}"
            oninput="document.getElementById('ai-tout-val').textContent=this.value+'s'">
          <div class="ai-range-labels"><span>10s</span><span>30s</span><span>60s</span><span>120s</span></div>
        </div>

        <!-- Cache TTL -->
        <div class="ai-ctrl-field">
          <label for="ai-cache-ttl">${_t('Cache TTL','Cache TTL')}
            <span class="ai-field-badge" id="ai-ttl-val">${_fmtTtl(cacheTtl)}</span>
          </label>
          <input type="range" id="ai-cache-ttl" class="ai-ctrl-range"
            min="0" max="3600" step="60" value="${cacheTtl}"
            oninput="document.getElementById('ai-ttl-val').textContent=_fmtTtl(parseInt(this.value))">
          <div class="ai-range-labels"><span>${_t('Tắt','Off')}</span><span>5ph</span><span>30ph</span><span>60ph</span></div>
        </div>

      </div>
    </section>

    <!-- ══ Section 2: Feature Toggles ══════════════════════════ -->
    <section class="ai-ctrl-section">
      <h3 class="ai-ctrl-section-title">
        <span>🔌</span> ${_t('Bật/tắt tính năng','Feature Toggles')}
      </h3>
      <div class="ai-feat-grid">
        ${_featRow('ai-feat-realtime',   featRealtime,  '📡', _t('AI Realtime Stream','AI Realtime Stream'),      _t('SSE stream dự đoán, cảnh báo và sự kiện AI theo thời gian thực','SSE stream for real-time AI predictions, alerts and events'))}
        ${_featRow('ai-feat-recommend',  featRecommend, '💡', _t('AI Recommendations','AI Recommendations'),      _t('Panel gợi ý AI và phân tích nguyên nhân gốc rễ','AI suggestion panel and root cause analysis'))}
        ${_featRow('ai-feat-chat',       featChat,      '💬', _t('AI Chat Interface','AI Chat Interface'),         _t('Giao diện chat ngôn ngữ tự nhiên để truy vấn dữ liệu','Natural language chat interface for data queries'))}
        ${_featRow('ai-feat-predict',    featPredict,   '🔮', _t('AI Predictions','AI Predictions'),              _t('Dự đoán chất lượng, sự cố thiết bị và xu hướng SPC','Quality, equipment failure and SPC trend predictions'))}
        ${_featRow('ai-feat-schedule',   featSchedule,  '📅', _t('AI Schedule Optimisation','AI Schedule Optimisation'), _t('Tối ưu hoá lịch bảo trì và sản xuất bằng AI','AI-driven maintenance and production schedule optimisation'))}
        ${_featRow('ai-feat-summarise',  featSummarise, '📝', _t('AI Document Summarisation','AI Document Summarisation'), _t('Tóm tắt tài liệu và SOP tự động bằng AI','Automatic AI summarisation of documents and SOPs'))}
        ${_featRow('ai-feat-rca',        featRca,       '🔍', _t('AI Root Cause Analysis','AI Root Cause Analysis'), _t('Phân tích nguyên nhân gốc rễ tự động cho NCR và CAPA','Automated root cause analysis for NCR and CAPA'))}
      </div>
    </section>

    <!-- ══ Section 3: Rate Limiting ════════════════════════════ -->
    <section class="ai-ctrl-section">
      <h3 class="ai-ctrl-section-title">
        <span>⚡</span> ${_t('Giới hạn tốc độ','Rate Limiting')}
      </h3>
      <div class="ai-ctrl-grid">
        <div class="ai-ctrl-field">
          <label for="ai-rpm-limit">${_t('Giới hạn toàn hệ thống (req/phút)','System-wide limit (req/min)')}
            <span class="ai-field-badge" id="ai-rpm-val">${rpmLimit}</span>
          </label>
          <input type="range" id="ai-rpm-limit" class="ai-ctrl-range"
            min="5" max="300" step="5" value="${rpmLimit}"
            oninput="document.getElementById('ai-rpm-val').textContent=this.value">
          <div class="ai-range-labels"><span>5</span><span>60</span><span>150</span><span>300</span></div>
        </div>
        <div class="ai-ctrl-field">
          <label for="ai-user-rpm">${_t('Giới hạn mỗi user (req/phút)','Per-user limit (req/min)')}
            <span class="ai-field-badge" id="ai-urpm-val">${userRpm}</span>
          </label>
          <input type="range" id="ai-user-rpm" class="ai-ctrl-range"
            min="1" max="60" step="1" value="${userRpm}"
            oninput="document.getElementById('ai-urpm-val').textContent=this.value">
          <div class="ai-range-labels"><span>1</span><span>10</span><span>30</span><span>60</span></div>
        </div>
      </div>
    </section>

    <!-- ══ Section 4: Usage & Cost ══════════════════════════════ -->
    <section class="ai-ctrl-section">
      <h3 class="ai-ctrl-section-title">
        <span>📊</span> ${_t('Thống kê sử dụng','Usage Statistics')}
        <button class="ai-refresh-btn" onclick="_aiRefreshUsage()" title="${_t('Làm mới','Refresh')}">⟳</button>
      </h3>
      <div class="ai-usage-grid" id="ai-usage-grid">
        ${_usageCards(usage)}
      </div>

      <!-- Circuit Breaker Status -->
      <div class="ai-cb-status">
        <h4>${_t('Circuit Breaker','Circuit Breaker')}</h4>
        <div class="ai-cb-grid" id="ai-cb-grid">
          ${_cbStatus(cb)}
        </div>
      </div>
    </section>

  </div><!-- /ai-ctrl-body -->

  <!-- ══ Footer Actions ════════════════════════════════════════ -->
  <div class="ai-ctrl-footer">
    <div class="ai-ctrl-footer-left">
      <button class="btn-secondary" onclick="_aiClearCache()">${_t('Xoá cache AI','Clear AI cache')}</button>
    </div>
    <div class="ai-ctrl-footer-right">
      <span id="ai-dirty-notice" style="display:none;font-size:12px;font-weight:600;color:var(--brand-2,#1565c0);padding:5px 10px;border-radius:6px;background:color-mix(in srgb,var(--brand-2,#1565c0) 8%,var(--bg-surface,#fff));border:1px solid color-mix(in srgb,var(--brand-2,#1565c0) 20%,transparent)">⚠ ${_t('Có thay đổi chưa lưu','Unsaved changes')}</span>
      <span class="ai-save-msg" id="ai-save-msg"></span>
      <button class="btn-primary ai-save-btn" id="ai-save-btn" onclick="_aiSave()">
        💾 ${_t('Lưu cấu hình','Save configuration')}
      </button>
    </div>
  </div>

</div><!-- /ai-ctrl-wrap -->

${_styles()}
`;

  /* Wire delegated input/change listener to show dirty notice */
  el.removeEventListener('input', _aiMarkDirty);
  el.removeEventListener('change', _aiMarkDirty);
  el.addEventListener('input', _aiMarkDirty);
  el.addEventListener('change', _aiMarkDirty);
}

/* ── Helper renderers ─────────────────────────────────────────── */
function _featRow(id, checked, icon, label, note){
  return `<div class="ai-feat-row">
    <label class="ai-toggle-switch ${checked?'on':'off'}" title="${note}">
      <input type="checkbox" id="${id}" ${checked?'checked':''}
        onchange="this.closest('.ai-toggle-switch').className='ai-toggle-switch '+(this.checked?'on':'off')">
      <span class="ai-toggle-track"><span class="ai-toggle-thumb"></span></span>
    </label>
    <span class="ai-feat-icon">${icon}</span>
    <div class="ai-feat-text">
      <span class="ai-feat-label">${label}</span>
      <span class="ai-feat-note">${note}</span>
    </div>
  </div>`;
}

function _modelBadges(modelId){
  var m = AI_MODELS.find(function(x){ return x.id === modelId; });
  if(!m) return '';
  var tierCss = {
    premium:'color-mix(in srgb,var(--brand,#0c2d48) 60%,var(--brand-2,#1565c0) 40%)',
    balanced:'var(--brand-2,#1565c0)',
    fast:'var(--green,#2e7d32)'
  };
  var tierLabels = {premium:'Premium', balanced:'Balanced', fast:'Fast'};
  return `<span class="ai-badge" style="background:${tierCss[m.tier]||'var(--text-secondary,#475569)'}">${tierLabels[m.tier]||m.tier}</span>
          <span class="ai-badge ai-badge-ctx">${(m.ctx/1000).toFixed(0)}K ctx</span>`;
}

function _fmtTtl(s){
  if(s === 0) return _t('Tắt','Off');
  if(s < 60) return s + 's';
  return Math.round(s/60) + _t('ph','min');
}

function _usageCards(u){
  var today = u.today || {};
  var total = u.total || {};
  return `
    <div class="ai-usage-card">
      <div class="ai-usage-num">${(today.requests||0).toLocaleString()}</div>
      <div class="ai-usage-lbl">${_t('Request hôm nay','Requests today')}</div>
    </div>
    <div class="ai-usage-card">
      <div class="ai-usage-num">${_fmtTok(today.tokens_in||0)}</div>
      <div class="ai-usage-lbl">${_t('Token đầu vào hôm nay','Input tokens today')}</div>
    </div>
    <div class="ai-usage-card">
      <div class="ai-usage-num">${_fmtTok(today.tokens_out||0)}</div>
      <div class="ai-usage-lbl">${_t('Token đầu ra hôm nay','Output tokens today')}</div>
    </div>
    <div class="ai-usage-card ai-usage-card-cost">
      <div class="ai-usage-num">$${_fmtCost(today.cost_usd||0)}</div>
      <div class="ai-usage-lbl">${_t('Chi phí hôm nay (USD)','Cost today (USD)')}</div>
    </div>
    <div class="ai-usage-card">
      <div class="ai-usage-num">${(total.requests||0).toLocaleString()}</div>
      <div class="ai-usage-lbl">${_t('Tổng request','Total requests')}</div>
    </div>
    <div class="ai-usage-card ai-usage-card-total">
      <div class="ai-usage-num">$${_fmtCost(total.cost_usd||0)}</div>
      <div class="ai-usage-lbl">${_t('Tổng chi phí (USD)','Total cost (USD)')}</div>
    </div>
  `;
}

function _fmtTok(n){
  if(n >= 1000000) return (n/1000000).toFixed(1) + 'M';
  if(n >= 1000)    return (n/1000).toFixed(1) + 'K';
  return n.toString();
}

function _fmtCost(v){
  return parseFloat(v||0).toFixed(4);
}

function _cbStatus(cb){
  var state  = cb.state || 'closed';
  var fails  = cb.failure_count || 0;
  var thresh = cb.failure_threshold || 5;
  var recov  = cb.recovery_timeout || 120;
  var stateColor = state === 'open' ? '#ef4444' : state === 'half_open' ? '#f59e0b' : '#10b981';
  var stateLabel = {open: _t('MỞ (AI bị tắt tạm thời)','OPEN (AI temporarily disabled)'), half_open: _t('NỬA MỞ (đang phục hồi)','HALF-OPEN (recovering)'), closed: _t('ĐÓNG (hoạt động bình thường)','CLOSED (operating normally)')}[state] || state;
  return `
    <div class="ai-cb-item">
      <span class="ai-cb-dot" style="background:${stateColor}"></span>
      <span class="ai-cb-state">${stateLabel}</span>
    </div>
    <div class="ai-cb-item">
      <span class="ai-cb-key">${_t('Số lỗi liên tiếp','Consecutive failures')}</span>
      <span class="ai-cb-val">${fails} / ${thresh}</span>
    </div>
    <div class="ai-cb-item">
      <span class="ai-cb-key">${_t('Thời gian phục hồi','Recovery timeout')}</span>
      <span class="ai-cb-val">${recov}s</span>
    </div>
    ${state !== 'closed' ? `<div class="ai-cb-item ai-cb-item-full">
      <button class="btn-sm btn-warning" onclick="_aiResetCb()">${_t('Reset circuit breaker','Reset circuit breaker')}</button>
    </div>` : ''}
  `;
}

/* ── Actions ──────────────────────────────────────────────────── */
window._aiToggleMaster = function(checked){
  var badge = document.getElementById('ai-master-badge');
  var wrap  = document.getElementById('ai-master-toggle-wrap');
  var notice= document.getElementById('ai-disabled-notice');
  var body  = document.getElementById('ai-ctrl-body');
  if(badge){
    badge.textContent = checked ? _t('BẬT','ON') : _t('TẮT','OFF');
    badge.className = 'ai-status-badge ' + (checked ? 'enabled' : 'disabled');
  }
  if(wrap) wrap.className = 'ai-toggle-switch ai-toggle-lg ' + (checked ? 'on' : 'off');
  if(notice) notice.style.display = checked ? 'none' : 'flex';
  if(body) body.className = 'ai-ctrl-body' + (checked ? '' : ' ai-ctrl-body-disabled');
};

window._aiModelChange = function(val){
  var wrap = document.getElementById('ai-model-badges');
  if(wrap) wrap.innerHTML = _modelBadges(val);
};

window._aiToggleKeyVis = function(){
  var inp = document.getElementById('ai-api-key');
  if(!inp) return;
  inp.type = inp.type === 'password' ? 'text' : 'password';
};

window._aiTestKey = function(){
  if(_testing) return;
  _testing = true;
  var btn = document.getElementById('ai-test-btn');
  var st  = document.getElementById('ai-key-status');
  var key = document.getElementById('ai-api-key');
  if(btn) btn.disabled = true;
  if(st) { st.className='ai-key-status testing'; st.textContent=_t('Đang kiểm tra...','Testing...'); }

  var token = window.csrfToken || '';
  fetch('api.php?action=admin_ai_test_connection', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-CSRF-Token':token},
    body: JSON.stringify({ api_key: (key && key.value) || null, model: document.getElementById('ai-model-select')?.value })
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    _testing = false;
    if(btn) btn.disabled = false;
    if(d.ok){
      if(st){ st.className='ai-key-status ok'; st.textContent='✓ ' + _t('Kết nối thành công. Model: ','Connection OK. Model: ') + (d.model||''); }
    } else {
      if(st){ st.className='ai-key-status error'; st.textContent='✗ ' + (d.message || d.error || _t('Kết nối thất bại','Connection failed')); }
    }
  })
  .catch(function(e){
    _testing = false;
    if(btn) btn.disabled = false;
    if(st){ st.className='ai-key-status error'; st.textContent='✗ ' + _t('Lỗi mạng','Network error'); }
  });
};

function _aiMarkDirty(){
  var notice = document.getElementById('ai-dirty-notice');
  if(notice) notice.style.display = '';
}

function _aiClearDirty(){
  var notice = document.getElementById('ai-dirty-notice');
  if(notice) notice.style.display = 'none';
}

window._aiSave = function(){
  if(_saving) return;
  _saving = true;
  var btn = document.getElementById('ai-save-btn');
  var msg = document.getElementById('ai-save-msg');
  if(btn){ btn.disabled=true; btn.textContent=_t('Đang lưu...','Saving...'); }

  var cfg = _collectForm();
  var token = window.csrfToken || '';
  fetch('api.php?action=admin_ai_config_save', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-CSRF-Token':token},
    body: JSON.stringify(cfg)
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    _saving = false;
    if(btn){ btn.disabled=false; btn.textContent='💾 '+_t('Lưu cấu hình','Save configuration'); }
    if(d.ok){
      _cfg = cfg;
      _aiClearDirty();
      if(msg){ msg.className='ai-save-msg ok'; msg.textContent='✓ '+_t('Đã lưu thành công','Saved successfully'); }
      setTimeout(function(){ if(msg) msg.textContent=''; }, 4000);
      // Notify the AI stream to reconnect with new settings
      if(window.HmAiStream && typeof HmAiStream.disconnect === 'function' && cfg.features && cfg.features.realtime){
        setTimeout(function(){ HmAiStream.connect(); }, 1000);
      }
    } else {
      if(msg){ msg.className='ai-save-msg error'; msg.textContent='✗ '+(d.error||_t('Lưu thất bại','Save failed')); }
    }
  })
  .catch(function(){
    _saving = false;
    if(btn){ btn.disabled=false; btn.textContent='💾 '+_t('Lưu cấu hình','Save configuration'); }
    if(msg){ msg.className='ai-save-msg error'; msg.textContent='✗ '+_t('Lỗi mạng','Network error'); }
  });
};

window._aiClearCache = function(){
  var token = window.csrfToken || '';
  fetch('api.php?action=admin_clear_site_cache', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-CSRF-Token':token},
    body: JSON.stringify({scope:'ai'})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(typeof showToast === 'function'){
      showToast(d.ok ? _t('Cache AI đã được xoá','AI cache cleared') : _t('Xoá cache thất bại','Failed to clear cache'), d.ok?'success':'error');
    }
  })
  .catch(function(){});
};

window._aiResetCb = function(){
  var token = window.csrfToken || '';
  fetch('api.php?action=admin_ai_reset_circuit_breaker', {
    method:'POST',
    credentials:'same-origin',
    headers:{'Content-Type':'application/json','X-CSRF-Token':token},
    body: JSON.stringify({})
  })
  .then(function(r){ return r.json(); })
  .then(function(d){
    if(typeof showToast === 'function'){
      showToast(d.ok ? _t('Circuit breaker đã được reset','Circuit breaker reset') : _t('Reset thất bại','Reset failed'), d.ok?'success':'error');
    }
    if(d.ok){ _aiRefreshUsage(); }
    var alert = document.getElementById('ai-cb-alert');
    if(alert && d.ok) alert.style.display = 'none';
  })
  .catch(function(){});
};

window._aiRefreshUsage = function(){
  _fetchUsage(function(u){
    _usage = u;
    var grid = document.getElementById('ai-usage-grid');
    var cbg  = document.getElementById('ai-cb-grid');
    var cba  = document.getElementById('ai-cb-alert');
    if(grid) grid.innerHTML = _usageCards(u);
    var cb = (u||{}).circuit_breaker || {};
    if(cbg)  cbg.innerHTML = _cbStatus(cb);
    if(cba)  cba.style.display = cb.state === 'open' ? 'flex' : 'none';
  });
};

function _fmtTtl(s){ // re-declare for inner scope use
  if(s === 0) return _t('Tắt','Off');
  if(s < 60)  return s + 's';
  return Math.round(s/60) + _t('ph','min');
}

function _collectForm(){
  var g = function(id){ return document.getElementById(id); };
  var cb = function(id){ var el=g(id); return el ? el.checked : false; };
  var num= function(id){ var el=g(id); return el ? parseInt(el.value)||0 : 0; };
  var key= (g('ai-api-key') && g('ai-api-key').value) ? g('ai-api-key').value.trim() : null;

  return {
    enabled:    g('ai-master-enabled') ? g('ai-master-enabled').checked : false,
    model:      g('ai-model-select') ? g('ai-model-select').value : 'claude-sonnet-4-20250514',
    api_key:    key,
    max_tokens: num('ai-max-tokens'),
    timeout:    num('ai-timeout'),
    cache_ttl:  num('ai-cache-ttl'),
    rpm_limit:  num('ai-rpm-limit'),
    user_rpm_limit: num('ai-user-rpm'),
    features: {
      realtime:        cb('ai-feat-realtime'),
      recommendations: cb('ai-feat-recommend'),
      chat:            cb('ai-feat-chat'),
      predictions:     cb('ai-feat-predict'),
      schedule:        cb('ai-feat-schedule'),
      summarise:       cb('ai-feat-summarise'),
      rca:             cb('ai-feat-rca'),
    }
  };
}

/* ── Embedded styles ──────────────────────────────────────────── */
function _styles(){
  if(document.getElementById('ai-ctrl-styles')) return '';
  return `<style id="ai-ctrl-styles">
.ai-ctrl-wrap{display:flex;flex-direction:column;gap:0;height:100%;overflow:auto;background:var(--surface,#f8fafc);}
.ai-ctrl-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px 16px;background:var(--surface-card,#fff);border-bottom:1px solid var(--border,#e2e8f0);flex-shrink:0;gap:16px;flex-wrap:wrap;}
.ai-ctrl-title{display:flex;align-items:center;gap:14px;}
.ai-ctrl-icon{font-size:2rem;line-height:1;}
.ai-ctrl-title h2{margin:0;font-size:1.25rem;font-weight:700;color:var(--text,#0f172a);}
.ai-ctrl-subtitle{margin:2px 0 0;font-size:.8125rem;color:var(--text-muted,#64748b);}
.ai-ctrl-master{display:flex;align-items:center;gap:10px;}
.ai-ctrl-master-label{font-size:.875rem;font-weight:600;color:var(--text,#0f172a);}
.ai-toggle-switch{display:inline-flex;align-items:center;cursor:pointer;position:relative;}
.ai-toggle-switch input{position:absolute;opacity:0;width:0;height:0;}
.ai-toggle-track{display:block;width:44px;height:24px;border-radius:12px;background:var(--border,#cbd5e1);transition:background .2s;position:relative;}
.ai-toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:var(--bg-surface,#fff);box-shadow:0 1px 3px rgba(0,0,0,.2);transition:transform .2s;}
.ai-toggle-switch.on .ai-toggle-track{background:var(--brand-2,#1565c0);}
.ai-toggle-switch.on .ai-toggle-thumb{transform:translateX(20px);}
.ai-toggle-lg .ai-toggle-track{width:56px;height:30px;border-radius:15px;}
.ai-toggle-lg .ai-toggle-thumb{width:24px;height:24px;top:3px;}
.ai-toggle-lg.on .ai-toggle-thumb{transform:translateX(26px);}
.ai-status-badge{padding:3px 10px;border-radius:20px;font-size:.75rem;font-weight:700;letter-spacing:.05em;}
.ai-status-badge.enabled{background:color-mix(in srgb,var(--green,#2e7d32) 14%,var(--bg-surface,#fff));color:var(--green,#166534);}
.ai-status-badge.disabled{background:color-mix(in srgb,var(--red,#c62828) 12%,var(--bg-surface,#fff));color:var(--red,#991b1b);}
.ai-ctrl-disabled-notice,.ai-ctrl-cb-alert{display:flex;align-items:center;gap:10px;padding:10px 24px;font-size:.875rem;flex-shrink:0;}
.ai-ctrl-disabled-notice{background:color-mix(in srgb,var(--amber,#f57f17) 10%,var(--bg-surface,#fff));color:color-mix(in srgb,var(--amber,#f57f17) 60%,#000 40%);border-bottom:1px solid color-mix(in srgb,var(--amber,#f57f17) 32%,transparent);}
.ai-ctrl-cb-alert{background:color-mix(in srgb,var(--red,#c62828) 12%,var(--bg-surface,#fff));color:var(--red,#991b1b);border-bottom:1px solid color-mix(in srgb,var(--red,#c62828) 28%,transparent);}
.ai-ctrl-body{display:flex;flex-direction:column;gap:0;flex:1;}
.ai-ctrl-body-disabled{opacity:.5;pointer-events:none;}
.ai-ctrl-section{background:var(--surface-card,#fff);border-bottom:1px solid var(--border,#e2e8f0);padding:20px 24px;}
.ai-ctrl-section-title{display:flex;align-items:center;gap:8px;margin:0 0 16px;font-size:1rem;font-weight:600;color:var(--text,#0f172a);}
.ai-ctrl-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:20px;}
.ai-ctrl-field{display:flex;flex-direction:column;gap:6px;}
.ai-ctrl-field-full{grid-column:1/-1;}
.ai-ctrl-field label{font-size:.8125rem;font-weight:600;color:var(--text,#0f172a);display:flex;align-items:center;gap:8px;}
.ai-field-note{font-weight:400;color:var(--text-muted,#64748b);font-size:.75rem;}
.ai-field-badge{background:color-mix(in srgb,var(--brand-2,#1565c0) 12%,var(--bg-surface,#fff));color:var(--brand,#0c2d48);padding:1px 7px;border-radius:10px;font-size:.75rem;font-weight:600;min-width:32px;text-align:center;}
.ai-ctrl-select,.ai-ctrl-input{width:100%;padding:8px 12px;border:1px solid var(--border,#e2e8f0);border-radius:6px;background:var(--surface,#f8fafc);color:var(--text,#0f172a);font-size:.875rem;box-sizing:border-box;transition:border-color .15s;}
.ai-ctrl-select:focus,.ai-ctrl-input:focus{outline:none;border-color:var(--brand-2,#1565c0);box-shadow:0 0 0 3px color-mix(in srgb,var(--brand-2,#1565c0) 18%,transparent);}
.ai-model-select-wrap{display:flex;flex-direction:column;gap:8px;}
.ai-model-badge-wrap{display:flex;gap:6px;flex-wrap:wrap;}
.ai-badge{display:inline-block;padding:2px 10px;border-radius:20px;font-size:.7rem;font-weight:700;color:var(--text-inverse,#fff);letter-spacing:.04em;}
.ai-badge-ctx{background:var(--text-secondary,#475569) !important;}
.ai-provider-pills{display:flex;gap:8px;flex-wrap:wrap;}
.ai-provider-pill{display:flex;align-items:center;gap:6px;padding:7px 14px;border:2px solid transparent;border-radius:8px;background:var(--surface,#f8fafc);cursor:pointer;font-size:.8125rem;font-weight:500;color:var(--text-muted,#64748b);transition:all .15s;}
.ai-provider-pill.active{border-color:var(--brand-2,#1565c0);background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,var(--bg-surface,#fff));color:var(--brand-2,#1565c0);}
.ai-provider-pill:disabled,.ai-provider-pill[disabled]{opacity:.4;cursor:not-allowed;}
.ai-api-key-wrap{display:flex;gap:8px;align-items:center;}
.ai-api-key-input{flex:1;font-family:monospace;letter-spacing:.05em;}
.ai-key-toggle,.ai-key-test{padding:7px 12px;border:1px solid var(--border,#e2e8f0);border-radius:6px;background:var(--surface,#f8fafc);cursor:pointer;font-size:.8125rem;white-space:nowrap;transition:all .15s;}
.ai-key-test{background:var(--brand-2,#1565c0);color:var(--text-inverse,#fff);border-color:var(--brand-2,#1565c0);font-weight:600;}
.ai-key-test:hover{background:color-mix(in srgb,var(--brand-2,#1565c0) 88%,#000 12%);}
.ai-key-test:disabled{opacity:.5;cursor:not-allowed;}
.ai-key-status{font-size:.8125rem;padding:4px 0;min-height:20px;}
.ai-key-status.ok{color:var(--green,#166534);}
.ai-key-status.error{color:var(--red,#dc2626);}
.ai-key-status.testing{color:color-mix(in srgb,var(--amber,#f57f17) 60%,#000 40%);}
.ai-ctrl-range{width:100%;accent-color:var(--brand-2,#1565c0);cursor:pointer;}
.ai-range-labels{display:flex;justify-content:space-between;font-size:.7rem;color:var(--text-muted,#64748b);}
.ai-feat-grid{display:flex;flex-direction:column;gap:2px;}
.ai-feat-row{display:flex;align-items:center;gap:12px;padding:10px 12px;border-radius:8px;transition:background .15s;}
.ai-feat-row:hover{background:var(--surface,#f8fafc);}
.ai-feat-icon{font-size:1.1rem;flex-shrink:0;}
.ai-feat-text{flex:1;display:flex;flex-direction:column;gap:2px;}
.ai-feat-label{font-size:.875rem;font-weight:600;color:var(--text,#0f172a);}
.ai-feat-note{font-size:.75rem;color:var(--text-muted,#64748b);}
.ai-usage-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-bottom:20px;}
.ai-usage-card{background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:10px;padding:16px;text-align:center;}
.ai-usage-card-cost{border-color:var(--amber,#f57f17);background:color-mix(in srgb,var(--amber,#f57f17) 8%,var(--bg-surface,#fff));}
.ai-usage-card-total{border-color:color-mix(in srgb,var(--brand,#0c2d48) 60%,var(--brand-2,#1565c0) 40%);background:color-mix(in srgb,var(--brand,#0c2d48) 6%,var(--bg-surface,#fff));}
.ai-usage-num{font-size:1.5rem;font-weight:700;color:var(--text,#0f172a);}
.ai-usage-lbl{font-size:.7rem;color:var(--text-muted,#64748b);margin-top:4px;}
.ai-cb-status h4{margin:0 0 12px;font-size:.875rem;font-weight:600;color:var(--text,#0f172a);}
.ai-cb-grid{display:flex;flex-wrap:wrap;gap:12px 24px;align-items:center;}
.ai-cb-item{display:flex;align-items:center;gap:8px;font-size:.8125rem;}
.ai-cb-item-full{width:100%;}
.ai-cb-dot{width:10px;height:10px;border-radius:50%;flex-shrink:0;}
.ai-cb-state{font-weight:600;color:var(--text,#0f172a);}
.ai-cb-key{color:var(--text-muted,#64748b);}
.ai-cb-val{font-weight:600;color:var(--text,#0f172a);}
.ai-ctrl-footer{display:flex;align-items:center;justify-content:space-between;padding:14px 24px;background:var(--surface-card,#fff);border-top:1px solid var(--border,#e2e8f0);flex-shrink:0;flex-wrap:wrap;gap:10px;}
.ai-ctrl-footer-right{display:flex;align-items:center;gap:12px;}
.ai-save-msg{font-size:.8125rem;}
.ai-save-msg.ok{color:var(--green,#166534);}
.ai-save-msg.error{color:var(--red,#dc2626);}
.ai-save-btn{display:flex;align-items:center;gap:6px;padding:9px 20px;background:var(--brand-2,#1565c0);color:var(--text-inverse,#fff);border:none;border-radius:7px;font-size:.875rem;font-weight:600;cursor:pointer;transition:background .15s;}
.ai-save-btn:hover{background:color-mix(in srgb,var(--brand-2,#1565c0) 88%,#000 12%);}
.ai-save-btn:disabled{opacity:.5;cursor:not-allowed;}
.btn-secondary{padding:8px 16px;background:var(--surface,#f8fafc);border:1px solid var(--border,#e2e8f0);border-radius:7px;font-size:.8125rem;font-weight:500;cursor:pointer;color:var(--text,#0f172a);transition:all .15s;}
.btn-secondary:hover{background:var(--bg-hover,var(--border,#e2e8f0));}
.btn-sm{padding:4px 10px;border-radius:5px;font-size:.75rem;font-weight:600;cursor:pointer;border:none;}
.btn-warning{background:var(--amber,#f57f17);color:var(--text-inverse,#fff);}
.btn-warning:hover{background:color-mix(in srgb,var(--amber,#f57f17) 88%,#000 12%);}
.ai-refresh-btn{margin-left:auto;background:none;border:none;font-size:1rem;cursor:pointer;opacity:.5;transition:opacity .15s;padding:0 4px;}
.ai-refresh-btn:hover{opacity:1;}
.ai-ctrl-loading{display:flex;align-items:center;gap:10px;padding:40px 24px;font-size:.875rem;color:var(--text-muted,#64748b);}
.spin-icon{display:inline-block;animation:spin 1s linear infinite;}
@keyframes spin{to{transform:rotate(360deg);}}
</style>`;
}

})();
