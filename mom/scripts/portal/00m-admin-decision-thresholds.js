/* ===================================================================
   00m-admin-decision-thresholds.js
   Admin: Decision thresholds for RACI authority documents.
   =================================================================== */

(function(){
'use strict';

var _el = null;
var _lang = 'vi';
var _state = {
  loading: false,
  saving: false,
  error: '',
  message: '',
  config: null,
  draft: null,
  reason: ''
};

window._renderAdminDecisionThresholds = function(el, langCode){
  _el = el;
  _lang = langCode || (typeof lang !== 'undefined' ? lang : 'vi');
  if(!_state.config && !_state.loading) {
    _load();
    return;
  }
  _render();
};

function _t(vi, en){
  return _lang === 'en' ? en : vi;
}

function _esc(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function _clone(value){
  return JSON.parse(JSON.stringify(value || {}));
}

function _items(){
  var draft = _state.draft || {};
  var items = draft.items || {};
  return Object.keys(items).map(function(key){ return items[key]; });
}

function _hasFinanceToken(){
  var text = JSON.stringify((_state.draft && _state.draft.items) || {});
  return /\b(FIN|Finance|Tài chính)\b/i.test(text);
}

function _load(){
  _state.loading = true;
  _state.error = '';
  _state.message = '';
  _render();
  apiCall('admin_decision_thresholds_get', null, 'GET', 45000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'load_failed');
      _state.config = data.config || {};
      _state.draft = _clone(_state.config);
      _state.reason = '';
    })
    .catch(function(err){
      _state.error = _t('Không tải được ngưỡng quyết định.', 'Cannot load decision thresholds.') + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.loading = false;
      _render();
    });
}

function _save(){
  if(_state.saving || _hasFinanceToken()) return;
  _state.saving = true;
  _state.error = '';
  _state.message = '';
  _render();
  apiCall('admin_decision_thresholds_save', {
    config: _state.draft || {},
    reason: _state.reason || ''
  }, 'POST', 90000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'save_failed');
      _state.config = data.config || {};
      _state.draft = _clone(_state.config);
      _state.reason = '';
      _state.message = _updatedDocsText(data.updated_documents || []);
    })
    .catch(function(err){
      _state.error = _t('Không lưu được. ', 'Save failed. ') + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.saving = false;
      _render();
    });
}

function _updatedDocsText(docs){
  if(!docs.length) return _t('Đã lưu cấu hình.', 'Configuration saved.');
  return _t('Đã cập nhật tài liệu: ', 'Updated documents: ')
    + docs.map(function(doc){
      return (doc.doc_code || doc.path || 'doc') + ' ' + (doc.previous_revision || '') + '→' + (doc.new_revision || '');
    }).join('; ');
}

function _setField(key, field, value){
  if(!_state.draft || !_state.draft.items || !_state.draft.items[key]) return;
  _state.draft.items[key][field] = value;
  _state.error = '';
  _state.message = '';
  _syncStatusUi();
}

function _setReason(value){
  _state.reason = value;
}

function _resetDraft(){
  _state.draft = _clone(_state.config || {});
  _state.reason = '';
  _state.error = '';
  _state.message = _t('Đã hoàn tác về cấu hình đang lưu trên máy chủ.', 'Reverted to server configuration.');
  _render();
}

function _render(){
  var el = _el || document.getElementById('admin-content');
  if(!el || !document.contains(el)) return;

  if(_state.loading){
    el.innerHTML = '<div class="hm-empty">'+_t('Đang tải ngưỡng quyết định...', 'Loading decision thresholds...')+'</div>';
    return;
  }

  var cfg = _state.draft || {};
  var financeBlocked = _hasFinanceToken();
  var docs = cfg.managed_documents || [];
  var items = _items();

  el.innerHTML = `
<section class="decision-thresholds-admin">
  <style>
    .decision-thresholds-admin{display:flex;flex-direction:column;gap:16px;color:var(--text-1)}
    .dt-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
    .dt-head h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:0}
    .dt-head p{margin:8px 0 0;color:var(--text-2);max-width:820px}
    .dt-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    .dt-btn{border:1px solid var(--border);background:var(--surface-2);color:var(--text-1);border-radius:7px;padding:9px 12px;font-weight:700;cursor:pointer}
    .dt-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast)}
    .dt-btn:disabled{opacity:.48;cursor:not-allowed}
    .dt-alert{border:1px solid var(--border);border-radius:8px;padding:12px 14px;background:var(--surface);color:var(--text-2)}
    .dt-alert[hidden]{display:none}
    .dt-alert.error{border-color:var(--danger);color:var(--danger)}
    .dt-alert.ok{border-color:var(--success);color:var(--success)}
    .dt-meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .dt-meta{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:12px}
    .dt-meta b{display:block;margin-bottom:5px}
    .dt-meta span{color:var(--text-2)}
    .dt-reason{width:100%;min-height:68px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-1);padding:10px;font:inherit;resize:vertical}
    .dt-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
    .dt-card{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:10px}
    .dt-card-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}
    .dt-card-title{font-size:16px;font-weight:800}
    .dt-cdr{font-weight:800;color:var(--accent)}
    .dt-field{display:flex;flex-direction:column;gap:5px}
    .dt-field label{font-size:12px;font-weight:800;color:var(--text-2);text-transform:uppercase}
    .dt-input,.dt-textarea{width:100%;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-1);font:inherit;padding:8px}
    .dt-textarea{min-height:72px;resize:vertical}
    .dt-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    @media (max-width:1100px){.dt-list,.dt-meta-grid{grid-template-columns:1fr}.dt-head{flex-direction:column}.dt-actions{justify-content:flex-start}.dt-split{grid-template-columns:1fr}}
  </style>
  <div class="dt-head">
    <div>
      <h2>${_t('Ngưỡng quyết định', 'Decision thresholds')}</h2>
      <p>${_t('Nguồn cập nhật cho bảng tra nhanh thẩm quyền và ANNEX-120. Khi lưu, hệ thống xuất lại tài liệu liên quan, tăng phiên bản tài liệu và gắn quyền duyệt cuối cho CEO.', 'Source data for authority lookup and ANNEX-120. Saving republishes related documents, bumps revisions, and assigns final approval to CEO.')}</p>
    </div>
    <div class="dt-actions">
      <button class="dt-btn" type="button" onclick="_dtReload()">${_t('Tải lại', 'Reload')}</button>
      <button class="dt-btn" type="button" onclick="_dtReset()">${_t('Hoàn tác', 'Reset')}</button>
      <button class="dt-btn primary" id="dt-save-btn" type="button" ${financeBlocked || _state.saving ? 'disabled' : ''} onclick="_dtSave()">${_state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu và cập nhật tài liệu', 'Save and publish docs')}</button>
    </div>
  </div>
  <div class="dt-alert error" id="dt-error-alert" ${_state.error ? '' : 'hidden'}>${_esc(_state.error)}</div>
  <div class="dt-alert ok" id="dt-message-alert" ${_state.message ? '' : 'hidden'}>${_esc(_state.message)}</div>
  <div class="dt-alert error" id="dt-finance-alert" ${financeBlocked ? '' : 'hidden'}>${_t('Không được có mã FIN hoặc vai trò tài chính trong ngưỡng quyết định. CEO là người quyết định cuối.', 'FIN/Finance is not allowed in decision thresholds. CEO is the final authority.')}</div>
  <div class="dt-meta-grid">
    <div class="dt-meta"><b>${_t('Người duyệt cuối', 'Final authority')}</b><span>${_esc(cfg.final_authority_role || 'CEO')}</span></div>
    <div class="dt-meta"><b>${_t('Cập nhật lần cuối', 'Last updated')}</b><span>${_esc(cfg.updated_at || _t('Chưa có', 'Not yet'))}</span></div>
    <div class="dt-meta"><b>${_t('Tài liệu tự cập nhật', 'Managed documents')}</b><span>${docs.map(function(d){return _esc(d.doc_code || d.path || 'doc');}).join(', ')}</span></div>
  </div>
  <div class="dt-field">
    <label>${_t('Lý do cập nhật', 'Change reason')}</label>
    <textarea class="dt-reason" oninput="_dtSetReason(this.value)" placeholder="${_t('Ví dụ: bỏ vai trò tài chính khỏi bậc duyệt, CEO quyết định cuối...', 'Example: remove Finance approval, CEO is final decision authority...')}">${_esc(_state.reason || '')}</textarea>
  </div>
  <div class="dt-list">
    ${items.map(_renderItem).join('')}
  </div>
</section>`;
  _syncStatusUi();
}

function _setAlert(id, text){
  var node = document.getElementById(id);
  if(!node) return;
  node.textContent = text || '';
  node.hidden = !text;
}

function _syncStatusUi(){
  var financeBlocked = _hasFinanceToken();
  _setAlert('dt-error-alert', _state.error || '');
  _setAlert('dt-message-alert', _state.message || '');
  _setAlert('dt-finance-alert', financeBlocked
    ? _t('Không được có mã FIN hoặc vai trò tài chính trong ngưỡng quyết định. CEO là người quyết định cuối.', 'FIN/Finance is not allowed in decision thresholds. CEO is the final authority.')
    : ''
  );
  var saveBtn = document.getElementById('dt-save-btn');
  if(saveBtn){
    saveBtn.disabled = !!(_state.saving || financeBlocked);
    saveBtn.textContent = _state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu và cập nhật tài liệu', 'Save and publish docs');
  }
}

function _renderItem(item){
  var key = item.key || '';
  var cdr = Array.isArray(item.cdrs) ? item.cdrs.join(', ') : String(item.cdrs || '');
  return `
<article class="dt-card">
  <div class="dt-card-head">
    <div class="dt-card-title">${_esc(item.label || key)}</div>
    <div class="dt-cdr">${_esc(cdr)}</div>
  </div>
  <div class="dt-field">
    <label>${_t('Quyết định', 'Decision')}</label>
    <input class="dt-input" value="${_esc(item.decision || '')}" oninput="_dtSetField('${_esc(key)}','decision',this.value)">
  </div>
  <div class="dt-field">
    <label>${_t('Điều kiện kích hoạt', 'Trigger')}</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','condition',this.value)">${_esc(item.condition || '')}</textarea>
  </div>
  <div class="dt-field">
    <label>L1</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','l1',this.value)">${_esc(item.l1 || '')}</textarea>
  </div>
  <div class="dt-field">
    <label>L2</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','l2',this.value)">${_esc(item.l2 || '')}</textarea>
  </div>
  <div class="dt-field">
    <label>L3 / CEO</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','l3',this.value)">${_esc(item.l3 || '')}</textarea>
  </div>
  <div class="dt-split">
    <div class="dt-field">
      <label>R</label>
      <input class="dt-input" value="${_esc(item.r || '')}" oninput="_dtSetField('${_esc(key)}','r',this.value)">
    </div>
    <div class="dt-field">
      <label>${_t('Hồ sơ', 'Evidence')}</label>
      <input class="dt-input" value="${_esc(item.evidence || '')}" oninput="_dtSetField('${_esc(key)}','evidence',this.value)">
    </div>
  </div>
  <div class="dt-field">
    <label>${_t('Leo thang nếu', 'Escalate if')}</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','escalation',this.value)">${_esc(item.escalation || '')}</textarea>
  </div>
</article>`;
}

window._dtReload = _load;
window._dtReset = _resetDraft;
window._dtSave = _save;
window._dtSetField = _setField;
window._dtSetReason = _setReason;

})();
