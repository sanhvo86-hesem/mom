/* ===================================================================
   00e-admin-translation-provider.js
   HESEM MOM Portal — Admin: DCC Translation Provider tab.

   Lets an admin toggle between the on-prem MT engines used to produce
   English locale artifacts for controlled documents:
     • Argos Translate          (lightweight, basic quality)
     • NLLB-200 distilled 600M  (Meta, higher quality, INT8 quantized)

   Reads/writes mom/data/config/dcc-translation-config.json via the
   /api/v1/dcc/admin/translation-provider endpoint pair.

   Loaded eagerly with the rest of the portal scripts; the entry point
   `renderAdminTranslationProvider()` is invoked from
   02-state-auth-ui.js when the user opens the corresponding tab.
   =================================================================== */

(function(){
'use strict';

function _t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }

let _state = {
  loading: false,
  saving: false,
  error: '',
  config: null,
  envFallback: null,
};

window.renderAdminTranslationProvider = function(){
  const el = document.getElementById('admin-content');
  if (!el) return;
  el.innerHTML = _renderShell();
  _load();
};

function _renderShell(){
  return `<div class="tx-prov-wrap" style="max-width:920px;padding:24px;">
    <header style="margin-bottom:20px;">
      <div class="portal-display-kicker">${_t('Engine dịch thuật DCC','DCC translation engine')}</div>
      <h2 style="margin:6px 0 4px 0;">${_t('Chọn engine dịch thuật','Select translation engine')}</h2>
      <p style="color:var(--text-3);margin:0;line-height:1.5;">${_t(
        'Engine được chọn sẽ dùng để tạo artifact tiếng Anh cho mọi tài liệu kiểm soát. Cài đặt này áp dụng cho lần dịch tiếp theo. Các artifact đã sinh trước đó vẫn còn nguyên trong cache cho tới khi tài liệu nguồn được cập nhật hoặc admin chạy lại backfill.',
        'The selected engine produces English artifacts for every controlled document. The setting takes effect on the next translation. Existing artifacts stay cached until their source revision changes or an admin re-runs the backfill.'
      )}</p>
    </header>
    <div id="tx-prov-body" style="min-height:200px;">
      <div style="padding:40px;text-align:center;color:var(--text-3);">
        <span style="display:inline-block;animation:spin 1s linear infinite;">⟳</span>
        ${_t('Đang tải cấu hình...','Loading configuration...')}
      </div>
    </div>
  </div>`;
}

function _load(){
  _state.loading = true;
  _state.error = '';
  const token = window.csrfToken || '';
  fetch('/api/v1/dcc/admin/translation-provider', {
    credentials: 'same-origin',
    headers: { 'X-CSRF-Token': token, 'Accept': 'application/json' }
  })
    .then(r => r.json())
    .then(d => {
      _state.loading = false;
      if (!d || !d.ok) {
        _state.error = (d && d.error && d.error.message) || _t('Không tải được cấu hình.','Could not load configuration.');
        _state.config = null;
        _state.envFallback = null;
      } else {
        _state.config = (d.data && d.data.config) || null;
        _state.envFallback = (d.data && d.data.env_fallback) || null;
      }
      _render();
    })
    .catch(err => {
      _state.loading = false;
      _state.error = String(err);
      _render();
    });
}

function _render(){
  const body = document.getElementById('tx-prov-body');
  if (!body) return;

  if (_state.error) {
    body.innerHTML = `<div style="padding:24px;border:1px solid var(--danger,#c00);border-radius:8px;background:rgba(220,0,0,0.05);color:var(--danger,#c00);">
      <strong>${_t('Lỗi','Error')}:</strong> ${_escape(_state.error)}
      <button onclick="renderAdminTranslationProvider()" style="margin-left:12px;padding:4px 10px;">${_t('Thử lại','Retry')}</button>
    </div>`;
    return;
  }

  if (!_state.config) {
    body.innerHTML = `<div style="padding:24px;color:var(--text-3);">
      ${_t('Không có file cấu hình mom/data/config/dcc-translation-config.json. Đang dùng cấu hình env-var fallback.','No mom/data/config/dcc-translation-config.json file. Using env-var fallback.')}
      <pre style="margin-top:12px;padding:12px;background:var(--surface-2,#f7f7f7);border-radius:6px;overflow:auto;">${_escape(JSON.stringify(_state.envFallback || {}, null, 2))}</pre>
    </div>`;
    return;
  }

  const cfg = _state.config;
  const active = String(cfg.active_provider || '');
  const providers = cfg.providers || {};
  const keys = Object.keys(providers);

  const cards = keys.map(key => {
    const p = providers[key] || {};
    const isActive = active === key;
    const available = p.available !== false;
    const ringColor = isActive ? 'var(--brand-primary,#0a6cff)' : (available ? 'var(--border,#dcdcdc)' : 'var(--border,#dcdcdc)');
    const opacity = available ? 1 : 0.55;
    const qualityLabel = ({basic:_t('Cơ bản','Basic'), high:_t('Cao','High'), premium:_t('Cao cấp','Premium')})[p.expected_quality] || '';
    return `<label class="tx-prov-card" style="display:block;padding:18px;border:2px solid ${ringColor};border-radius:10px;margin-bottom:12px;cursor:${available?'pointer':'not-allowed'};opacity:${opacity};background:${isActive?'rgba(10,108,255,0.04)':'var(--surface,#fff)'};">
      <div style="display:flex;align-items:flex-start;gap:14px;">
        <input type="radio" name="tx_prov_choice" value="${_escape(key)}" ${isActive?'checked':''} ${available?'':'disabled'} style="margin-top:4px;flex:0 0 auto;" onchange="window.__txProvSelect && window.__txProvSelect('${_escape(key)}')">
        <div style="flex:1;">
          <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
            <strong style="font-size:15px;">${_escape(p.label || key)}</strong>
            ${isActive ? `<span style="background:var(--brand-primary,#0a6cff);color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${_t('ĐANG DÙNG','ACTIVE')}</span>` : ''}
            ${qualityLabel ? `<span style="background:var(--surface-2,#eee);color:var(--text-2,#444);padding:2px 8px;border-radius:10px;font-size:11px;">${_t('Chất lượng','Quality')}: ${_escape(qualityLabel)}</span>` : ''}
            ${!available ? `<span style="background:#aa4400;color:#fff;padding:2px 8px;border-radius:10px;font-size:11px;">${_t('Chưa cài','Not installed')}</span>` : ''}
          </div>
          <p style="margin:6px 0 0 0;color:var(--text-2,#444);line-height:1.5;font-size:13px;">${_escape(p.description || '')}</p>
          <div style="margin-top:10px;font-size:12px;color:var(--text-3,#777);">
            <code style="background:var(--surface-2,#f0f0f0);padding:2px 6px;border-radius:4px;">${_escape(p.engine_label || '')}</code>
            ${p.model_size_mb ? ` · ${_t('Model','Model')} ~${p.model_size_mb} MB` : ''}
          </div>
        </div>
      </div>
    </label>`;
  }).join('');

  body.innerHTML = `
    <div>${cards}</div>
    <div style="margin-top:18px;display:flex;align-items:center;gap:12px;">
      <button id="tx-prov-save" onclick="window.__txProvSave && window.__txProvSave()" disabled
        style="padding:8px 18px;border-radius:6px;border:none;background:var(--brand-primary,#0a6cff);color:#fff;font-weight:600;cursor:pointer;opacity:0.5;">
        ${_t('Lưu lựa chọn','Save selection')}
      </button>
      <span id="tx-prov-status" style="color:var(--text-3,#777);font-size:13px;"></span>
    </div>
    ${cfg.updated_at ? `<div style="margin-top:14px;font-size:12px;color:var(--text-3,#777);">${_t('Cập nhật lần cuối','Last updated')}: ${_escape(cfg.updated_at)}${cfg.updated_by ? ' · ' + _escape(cfg.updated_by) : ''}</div>` : ''}
    <details style="margin-top:18px;">
      <summary style="cursor:pointer;color:var(--text-3,#777);font-size:13px;">${_t('Chi tiết kỹ thuật','Technical details')}</summary>
      <pre style="margin-top:8px;padding:12px;background:var(--surface-2,#f7f7f7);border-radius:6px;overflow:auto;font-size:12px;">${_escape(JSON.stringify(cfg, null, 2))}</pre>
    </details>
  `;

  let _selected = active;
  window.__txProvSelect = function(key){
    _selected = String(key || '');
    const btn = document.getElementById('tx-prov-save');
    if (btn) {
      const dirty = _selected !== active && _selected !== '';
      btn.disabled = !dirty || _state.saving;
      btn.style.opacity = (!dirty || _state.saving) ? '0.5' : '1';
    }
  };
  window.__txProvSave = function(){
    if (_state.saving || _selected === active || !_selected) return;
    _state.saving = true;
    const status = document.getElementById('tx-prov-status');
    const btn = document.getElementById('tx-prov-save');
    if (status) status.textContent = _t('Đang lưu...','Saving...');
    if (btn) btn.disabled = true;

    fetch('/api/v1/dcc/admin/translation-provider', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'X-CSRF-Token': window.csrfToken || ''
      },
      body: JSON.stringify({ active_provider: _selected })
    })
      .then(r => r.json())
      .then(d => {
        _state.saving = false;
        if (!d || !d.ok) {
          const msg = (d && d.error && d.error.message) || _t('Lưu thất bại.','Save failed.');
          if (status) status.textContent = msg;
          if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        } else {
          if (status) status.textContent = _t('Đã lưu. Lần dịch kế tiếp sẽ dùng engine mới.','Saved. The next translation will use the new engine.');
          _load();
        }
      })
      .catch(err => {
        _state.saving = false;
        if (status) status.textContent = String(err);
        if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
      });
  };
}

function _escape(s){
  return String(s == null ? '' : s)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

})();
