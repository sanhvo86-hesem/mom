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
  reason: '',
  activeGroup: 'all'
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

function _decisionGroups(){
  return [
    {
      id: 'commercial',
      label: _t('Thương mại', 'Commercial'),
      summary: _t('Báo giá, chiết khấu, điều kiện thanh toán', 'Quote, discount, payment terms'),
      keys: ['quote', 'discount', 'payment_terms']
    },
    {
      id: 'customer',
      label: _t('Thay đổi khách hàng', 'Customer change'),
      summary: _t('CCR và ảnh hưởng cam kết khách', 'CCR and customer commitment impact'),
      keys: ['customer_change']
    },
    {
      id: 'production',
      label: _t('Sản xuất', 'Production'),
      summary: _t('Tải máy, tăng ca, tiến độ xưởng', 'Capacity, overtime, shopfloor schedule'),
      keys: ['overtime']
    },
    {
      id: 'quality',
      label: _t('Chất lượng', 'Quality'),
      summary: _t('Phế phẩm, giữ hàng, chặn giao hàng', 'Scrap, hold release, stop ship'),
      keys: ['scrap', 'hold_release', 'stop_ship']
    },
    {
      id: 'supply',
      label: _t('Cung ứng', 'Supply'),
      summary: _t('PO, mua khẩn, gia công ngoài', 'PO, emergency buy, outsource'),
      keys: ['purchase_order', 'outsource', 'emergency_po']
    },
    {
      id: 'system',
      label: _t('Hệ thống', 'System'),
      summary: _t('Truy cập ERP khẩn cấp', 'Emergency ERP access'),
      keys: ['erp_breakglass']
    }
  ];
}

function _groupForItem(item){
  var groups = _decisionGroups();
  var key = item && item.key ? String(item.key) : '';
  for(var i = 0; i < groups.length; i++){
    if(groups[i].keys.indexOf(key) >= 0) return groups[i];
  }
  return {
    id: 'other',
    label: _t('Khác', 'Other'),
    summary: _t('Quyết định chưa phân nhóm', 'Ungrouped decisions'),
    keys: []
  };
}

function _itemsByGroup(items){
  var grouped = {};
  _decisionGroups().forEach(function(group){ grouped[group.id] = []; });
  items.forEach(function(item){
    var group = _groupForItem(item);
    if(!grouped[group.id]) grouped[group.id] = [];
    grouped[group.id].push(item);
  });
  return grouped;
}

function _cdrText(items){
  var values = [];
  items.forEach(function(item){
    (Array.isArray(item.cdrs) ? item.cdrs : [item.cdrs]).forEach(function(cdr){
      cdr = String(cdr || '').trim();
      if(cdr && values.indexOf(cdr) < 0) values.push(cdr);
    });
  });
  return values.join(', ');
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
  var groups = _decisionGroups();
  var grouped = _itemsByGroup(items);
  if(_state.activeGroup !== 'all' && !groups.some(function(group){ return group.id === _state.activeGroup; })){
    _state.activeGroup = 'all';
  }
  var visibleGroups = groups.filter(function(group){
    return _state.activeGroup === 'all' ? (grouped[group.id] || []).length : group.id === _state.activeGroup;
  });

  el.innerHTML = `
<section class="decision-thresholds-admin">
  <style>
    .decision-thresholds-admin{display:flex;flex-direction:column;gap:16px;color:var(--text-1)}
    .dt-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
    .dt-head h2{margin:0;font-size:22px;line-height:1.2;letter-spacing:0}
    .dt-head p{margin:8px 0 0;color:var(--text-2);max-width:880px}
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
    .dt-workbench{display:grid;grid-template-columns:280px minmax(0,1fr);gap:16px;align-items:start}
    .dt-sidebar{position:sticky;top:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:12px;max-height:calc(100vh - 120px);overflow:auto}
    .dt-sidebar-head{padding:4px 4px 12px;border-bottom:1px solid var(--border);margin-bottom:10px}
    .dt-sidebar-head b{display:block;font-size:13px;text-transform:uppercase;color:var(--text-2);letter-spacing:.04em}
    .dt-sidebar-head span{display:block;margin-top:4px;color:var(--text-2);font-size:12px;line-height:1.45}
    .dt-group-list{display:flex;flex-direction:column;gap:7px}
    .dt-group-btn{width:100%;display:grid;grid-template-columns:minmax(0,1fr) auto;gap:8px;align-items:start;text-align:left;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-1);padding:10px;cursor:pointer}
    .dt-group-btn strong{display:block;font-size:13px;line-height:1.25}
    .dt-group-btn small{display:block;margin-top:4px;color:var(--text-2);line-height:1.35}
    .dt-group-btn span{font-size:12px;font-weight:800;color:var(--accent);white-space:nowrap}
    .dt-group-btn.active{border-color:var(--accent);background:var(--surface)}
    .dt-editor{display:flex;flex-direction:column;gap:18px;min-width:0}
    .dt-section{display:flex;flex-direction:column;gap:10px;min-width:0}
    .dt-section-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border);padding:2px 2px 10px}
    .dt-section-head h3{margin:0;font-size:17px;line-height:1.25}
    .dt-section-head p{margin:4px 0 0;color:var(--text-2)}
    .dt-section-meta{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:6px;min-width:140px}
    .dt-chip{display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:6px;background:var(--surface-2);padding:4px 8px;font-size:12px;font-weight:800;color:var(--text-2)}
    .dt-card{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:14px;display:flex;flex-direction:column;gap:12px}
    .dt-card-head{display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-bottom:1px solid var(--border);padding-bottom:10px}
    .dt-card-title{font-size:16px;font-weight:800;line-height:1.3}
    .dt-card-sub{margin-top:4px;color:var(--text-2);font-size:12px;line-height:1.45}
    .dt-cdr{font-weight:800;color:var(--accent);white-space:nowrap}
    .dt-field{display:flex;flex-direction:column;gap:5px}
    .dt-field label{font-size:12px;font-weight:800;color:var(--text-2);text-transform:uppercase}
    .dt-input,.dt-textarea{width:100%;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-1);font:inherit;padding:8px}
    .dt-textarea{min-height:72px;resize:vertical}
    .dt-context-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
    .dt-level-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .dt-level-panel{border:1px solid var(--border);border-left-width:4px;border-radius:8px;background:var(--surface-2);padding:10px;display:flex;flex-direction:column;gap:8px;min-width:0}
    .dt-level-panel.l1{border-left-color:var(--accent)}
    .dt-level-panel.l2{border-left-color:var(--success,var(--green,var(--accent)))}
    .dt-level-panel.l3{border-left-color:var(--warning,var(--gold,var(--accent)))}
    .dt-level-head{display:flex;align-items:flex-start;gap:8px;min-height:34px}
    .dt-level-badge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;border:1px solid var(--border);border-radius:6px;background:var(--surface);padding:4px 7px;font-weight:900;color:var(--text-1)}
    .dt-level-head strong{display:block;font-size:12px;line-height:1.25}
    .dt-level-head span{display:block;color:var(--text-2);font-size:11px;line-height:1.35;margin-top:2px}
    .dt-level-panel .dt-textarea{min-height:112px;background:var(--surface)}
    .dt-escalation-panel{border:1px solid var(--danger,var(--red,var(--accent)));border-left:4px solid var(--danger,var(--red,var(--accent)));border-radius:8px;background:var(--surface-2);padding:10px;display:flex;flex-direction:column;gap:8px}
    .dt-escalation-panel label{color:var(--danger,var(--red,var(--accent)))}
    .dt-escalation-panel .dt-textarea{min-height:68px;background:var(--surface)}
    .dt-split{display:grid;grid-template-columns:1fr 1fr;gap:8px}
    @media (max-width:1250px){.dt-workbench{grid-template-columns:1fr}.dt-sidebar{position:static;max-height:none}.dt-group-list{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.dt-level-grid,.dt-context-grid,.dt-meta-grid{grid-template-columns:1fr}.dt-head{flex-direction:column}.dt-actions{justify-content:flex-start}.dt-split{grid-template-columns:1fr}}
    @media (max-width:760px){.dt-group-list{grid-template-columns:1fr}.dt-card-head,.dt-section-head{flex-direction:column}.dt-section-meta{justify-content:flex-start}}
  </style>
  <div class="dt-head">
    <div>
      <h2>${_t('Ngưỡng quyết định', 'Decision thresholds')}</h2>
      <p>${_t('Nguồn cập nhật cho bảng tra nhanh thẩm quyền và ANNEX-120. Mỗi loại quyết định được nhập theo L1, L2, L3/CEO và điều kiện leo thang riêng để tránh nhập lẫn trách nhiệm.', 'Source data for authority lookup and ANNEX-120. Each decision type is maintained by L1, L2, L3/CEO, and escalation condition.')}</p>
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
  <div class="dt-workbench">
    ${_renderGroupNav(groups, grouped, items)}
    <div class="dt-editor">
      ${visibleGroups.map(function(group){ return _renderGroupSection(group, grouped[group.id] || []); }).join('')}
    </div>
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

function _renderGroupNav(groups, grouped, items){
  var total = items.length;
  var allActive = _state.activeGroup === 'all';
  var html = `
<aside class="dt-sidebar">
  <div class="dt-sidebar-head">
    <b>${_t('Nhóm quyết định', 'Decision groups')}</b>
    <span>${_t('Chọn đúng nhóm trước khi sửa để không nhập nhầm loại thẩm quyền.', 'Select the correct group before editing authority thresholds.')}</span>
  </div>
  <div class="dt-group-list">
    <button class="dt-group-btn ${allActive ? 'active' : ''}" type="button" onclick="_dtSetGroup('all')">
      <div><strong>${_t('Tất cả', 'All')}</strong><small>${_t('Toàn bộ ngưỡng đang công bố', 'All published thresholds')}</small></div>
      <span>${total}</span>
    </button>`;

  groups.forEach(function(group){
    var groupItems = grouped[group.id] || [];
    if(!groupItems.length) return;
    html += `
    <button class="dt-group-btn ${_state.activeGroup === group.id ? 'active' : ''}" type="button" onclick="_dtSetGroup('${_esc(group.id)}')">
      <div><strong>${_esc(group.label)}</strong><small>${_esc(group.summary)}</small></div>
      <span>${_esc(_cdrText(groupItems) || String(groupItems.length))}</span>
    </button>`;
  });

  return html + `
  </div>
</aside>`;
}

function _renderGroupSection(group, items){
  if(!items.length) return '';
  return `
<section class="dt-section" data-dt-group="${_esc(group.id)}">
  <div class="dt-section-head">
    <div>
      <h3>${_esc(group.label)}</h3>
      <p>${_esc(group.summary)}</p>
    </div>
    <div class="dt-section-meta">
      <span class="dt-chip">${items.length} ${_t('quyết định', 'decisions')}</span>
      <span class="dt-chip">${_esc(_cdrText(items))}</span>
    </div>
  </div>
  ${items.map(function(item){ return _renderItem(item, group); }).join('')}
</section>`;
}

function _renderLevelField(item, field, badge, title, note, cls){
  var key = item.key || '';
  return `
  <div class="dt-level-panel ${_esc(cls)}">
    <div class="dt-level-head">
      <span class="dt-level-badge">${_esc(badge)}</span>
      <div><strong>${_esc(title)}</strong><span>${_esc(note)}</span></div>
    </div>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','${_esc(field)}',this.value)">${_esc(item[field] || '')}</textarea>
  </div>`;
}

function _renderItem(item){
  var key = item.key || '';
  var cdr = Array.isArray(item.cdrs) ? item.cdrs.join(', ') : String(item.cdrs || '');
  return `
<article class="dt-card">
  <div class="dt-card-head">
    <div>
      <div class="dt-card-title">${_esc(item.label || key)}</div>
      <div class="dt-card-sub">${_esc(item.condition || '')}</div>
    </div>
    <div class="dt-cdr">${_esc(cdr)}</div>
  </div>
  <div class="dt-context-grid">
    <div class="dt-field">
      <label>${_t('Quyết định', 'Decision')}</label>
      <input class="dt-input" value="${_esc(item.decision || '')}" oninput="_dtSetField('${_esc(key)}','decision',this.value)">
    </div>
    <div class="dt-field">
      <label>${_t('Điều kiện kích hoạt', 'Trigger')}</label>
      <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','condition',this.value)">${_esc(item.condition || '')}</textarea>
    </div>
  </div>
  <div class="dt-level-grid">
    ${_renderLevelField(item, 'l1', 'L1', _t('Trong ngưỡng chuẩn', 'Standard threshold'), _t('Người xử lý tuyến đầu hoặc xác nhận điều kiện.', 'Frontline owner or condition check.'), 'l1')}
    ${_renderLevelField(item, 'l2', 'L2', _t('Ngưỡng kiểm soát', 'Control threshold'), _t('Trưởng chức năng xác nhận trước khi chốt.', 'Function owner confirms before close.'), 'l2')}
    ${_renderLevelField(item, 'l3', 'L3 / CEO', _t('Vượt ngưỡng', 'Above threshold'), _t('CEO quyết định cuối khi vượt L2 hoặc rủi ro hệ thống.', 'CEO makes final decision above L2 or system risk.'), 'l3')}
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
  <div class="dt-field dt-escalation-panel">
    <label>${_t('Leo thang nếu', 'Escalate if')}</label>
    <textarea class="dt-textarea" oninput="_dtSetField('${_esc(key)}','escalation',this.value)">${_esc(item.escalation || '')}</textarea>
  </div>
</article>`;
}

function _setGroup(groupId){
  _state.activeGroup = groupId || 'all';
  _render();
}

window._dtReload = _load;
window._dtReset = _resetDraft;
window._dtSave = _save;
window._dtSetField = _setField;
window._dtSetReason = _setReason;
window._dtSetGroup = _setGroup;

})();
