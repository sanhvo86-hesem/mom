/* ===================================================================
   00n-admin-raci-matrix.js
   Admin: RACI Console — single control point for the four RACI datasets
   inside the controlled ANNEX-121 document.
     • Ma trận cổng    — §5 gate matrix G0→G7 (A/R/C/I editor)
     • Chuỗi giá trị   — §4 value-stream RACI
     • Tài liệu        — §6 document-level RACI
     • Bảng phụ trợ    — support-function supplement
   Saving validates the gate-matrix RACI invariants and regenerates every
   marked region inside ANNEX-121 (and the embedded SOP/JD regions).
   =================================================================== */

(function(){
'use strict';

var _el = null;
var _lang = 'vi';
var ROLES = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
var LETTERS = ['', 'A', 'R', 'C', 'I'];

/* Auxiliary-dataset section descriptors — column headers mirror ANNEX-121. */
var AUX = {
  value_stream: {
    vi: 'Chuỗi giá trị §4', en: 'Value stream §4',
    headVi: ['Hoạt động ngang', 'A', 'R', 'C/I', 'Bằng chứng'],
    headEn: ['Horizontal activity', 'A', 'R', 'C/I', 'Evidence'],
    descVi: 'RACI mục 4 — các hoạt động RACI chạy ngang chuỗi giá trị, không gắn cổng.',
    descEn: 'Section 4 RACI — horizontal value-stream activities not tied to a gate.'
  },
  document_level: {
    vi: 'Tài liệu §6', en: 'Document level §6',
    headVi: ['Tài liệu', 'A', 'R', 'C', 'Duyệt', 'Người dùng chính'],
    headEn: ['Document', 'A', 'R', 'C', 'Approve', 'Primary user'],
    descVi: 'RACI mục 6 — quyền sở hữu, duyệt và sử dụng từng tài liệu thẩm quyền.',
    descEn: 'Section 6 RACI — ownership, approval and use of each authority document.'
  },
  support: {
    vi: 'Bảng phụ trợ', en: 'Support supplement',
    headVi: ['Cổng', 'CDR', 'Hoạt động', 'Vai trò hỗ trợ', 'RACI', 'Lý do tham gia'],
    headEn: ['Gate', 'CDR', 'Activity', 'Support role', 'RACI', 'Reason for involvement'],
    descVi: 'Bảng phụ trợ — vai trò hỗ trợ (Tài chính, Bảo trì…) tham vấn tại các cổng.',
    descEn: 'Support supplement — support roles (Finance, Maintenance…) consulted at gates.'
  }
};
var AUX_KEYS = ['value_stream', 'document_level', 'support'];

var _state = {
  loading: false,
  saving: false,
  error: '',
  message: '',
  config: null,
  draft: null,
  reason: '',
  activeGate: 'all',
  activeSection: 'gate'
};

window._renderAdminRaciMatrix = function(el, langCode){
  _el = el;
  _lang = langCode || (typeof lang !== 'undefined' ? lang : 'vi');
  if(!_state.config && !_state.loading){
    _load();
    return;
  }
  _render();
};

function _t(vi, en){ return _lang === 'en' ? en : vi; }

function _esc(value){
  return String(value == null ? '' : value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}

function _clone(value){ return JSON.parse(JSON.stringify(value || {})); }

function _rows(){
  var d = _state.draft || {};
  return Array.isArray(d.rows) ? d.rows : [];
}

function _auxRows(key){
  var d = _state.draft || {};
  return Array.isArray(d[key]) ? d[key] : [];
}

function _gates(){
  var seen = [], out = [];
  _rows().forEach(function(row){
    var g = String(row.gate || '').trim();
    if(g && seen.indexOf(g) < 0){ seen.push(g); out.push(g); }
  });
  out.sort();
  return out;
}

/* ── RACI invariants (gate matrix only) ───────────────────────────── */
function _rowFlags(row){
  var a = 0, r = 0;
  ROLES.forEach(function(role){
    var v = (row.roles && row.roles[role]) || '';
    if(v === 'A') a++;
    if(v === 'R') r++;
  });
  return { a: a, r: r, invalid: (a !== 1 || r < 1) };
}

function _invalidCount(){
  return _rows().filter(function(row){ return _rowFlags(row).invalid; }).length;
}

/* ── Data ─────────────────────────────────────────────────────────── */
function _load(){
  _state.loading = true;
  _state.error = '';
  _state.message = '';
  _render();
  apiCall('admin_raci_matrix_get', null, 'GET', 45000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'load_failed');
      _state.config = data.config || {};
      _state.draft = _clone(_state.config);
      _state.reason = '';
    })
    .catch(function(err){
      _state.error = _t('Không tải được Console RACI.', 'Cannot load the RACI console.') + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.loading = false;
      _render();
    });
}

function _save(){
  if(_state.saving) return;
  if(_invalidCount() > 0){
    _state.error = _t('Còn dòng vi phạm bất biến RACI — mỗi dòng ma trận cổng phải có đúng 1 chữ A và ít nhất 1 chữ R.',
                      'Some gate-matrix rows violate the RACI invariants — each needs exactly one A and at least one R.');
    _syncStatus();
    return;
  }
  _state.saving = true;
  _state.error = '';
  _state.message = '';
  _render();
  apiCall('admin_raci_matrix_save', {
    config: _state.draft || {},
    reason: _state.reason || ''
  }, 'POST', 90000)
    .then(function(data){
      if(!data || data.ok === false) throw new Error((data && (data.message || data.error)) || 'save_failed');
      _state.config = data.config || {};
      _state.draft = _clone(_state.config);
      _state.reason = '';
      _state.message = _t('Đã lưu và tái tạo cả bốn vùng RACI trong ANNEX-121.',
                          'Saved and regenerated all four RACI regions inside ANNEX-121.');
    })
    .catch(function(err){
      _state.error = _t('Không lưu được. ', 'Save failed. ') + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.saving = false;
      _render();
    });
}

function _setRole(idx, role, value){
  var rows = _rows();
  if(!rows[idx]) return;
  if(!rows[idx].roles) rows[idx].roles = {};
  rows[idx].roles[role] = LETTERS.indexOf(value) >= 0 ? value : '';
  _state.error = '';
  _state.message = '';
  var card = document.querySelector('.rm-card[data-rm-idx="' + idx + '"]');
  if(card) card.classList.toggle('rm-card--invalid', _rowFlags(rows[idx]).invalid);
  _syncStatus();
}

function _setAuxCell(key, rowIdx, colIdx, value){
  var rows = _auxRows(key);
  if(!rows[rowIdx] || !Array.isArray(rows[rowIdx].cells)) return;
  rows[rowIdx].cells[colIdx] = value;
  _state.error = '';
  _state.message = '';
}

function _setReason(value){ _state.reason = value; }

function _resetDraft(){
  _state.draft = _clone(_state.config || {});
  _state.reason = '';
  _state.error = '';
  _state.message = _t('Đã hoàn tác về bản đang lưu trên máy chủ.', 'Reverted to the server copy.');
  _render();
}

function _setGate(gate){
  _state.activeGate = gate || 'all';
  _render();
}

function _setSection(section){
  _state.activeSection = section || 'gate';
  _render();
}

/* ── Rendering ────────────────────────────────────────────────────── */
function _setAlert(id, text){
  var node = document.getElementById(id);
  if(!node) return;
  node.textContent = text || '';
  node.hidden = !text;
}

function _syncStatus(){
  _setAlert('rm-error-alert', _state.error || '');
  _setAlert('rm-message-alert', _state.message || '');
  var bad = _invalidCount();
  _setAlert('rm-invalid-alert', bad > 0
    ? _t(bad + ' dòng ma trận cổng vi phạm bất biến RACI (cần đúng 1 A và ≥ 1 R).',
         bad + ' gate-matrix row(s) violate the RACI invariants (need exactly one A and at least one R).')
    : '');
  var saveBtn = document.getElementById('rm-save-btn');
  if(saveBtn){
    saveBtn.disabled = !!(_state.saving || bad > 0);
    saveBtn.textContent = _state.saving
      ? _t('Đang lưu...', 'Saving...')
      : _t('Lưu và cập nhật ANNEX-121', 'Save and publish ANNEX-121');
  }
}

function _render(){
  var el = _el || document.getElementById('admin-content');
  if(!el || !document.contains(el)) return;

  if(_state.loading){
    el.innerHTML = '<div class="hm-empty">' + _t('Đang tải Console RACI...', 'Loading RACI console...') + '</div>';
    return;
  }

  var cfg = _state.draft || {};
  var rows = _rows();
  var gates = _gates();
  if(_state.activeGate !== 'all' && gates.indexOf(_state.activeGate) < 0){
    _state.activeGate = 'all';
  }
  if(_state.activeSection !== 'gate' && AUX_KEYS.indexOf(_state.activeSection) < 0){
    _state.activeSection = 'gate';
  }
  var badCount = _invalidCount();

  el.innerHTML = `
<section class="raci-matrix-admin">
  <style>
    .raci-matrix-admin{display:flex;flex-direction:column;gap:16px;color:var(--text-1)}
    .rm-head{display:flex;justify-content:space-between;gap:16px;align-items:flex-start;padding:18px;border:1px solid var(--border);border-radius:8px;background:var(--surface)}
    .rm-head h2{margin:0;font-size:22px;line-height:1.2}
    .rm-head p{margin:8px 0 0;color:var(--text-2);max-width:880px}
    .rm-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end}
    .rm-btn{border:1px solid var(--border);background:var(--surface-2);color:var(--text-1);border-radius:7px;padding:9px 12px;font-weight:700;cursor:pointer}
    .rm-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast)}
    .rm-btn:disabled{opacity:.48;cursor:not-allowed}
    .rm-alert{border:1px solid var(--border);border-radius:8px;padding:12px 14px;background:var(--surface);color:var(--text-2)}
    .rm-alert[hidden]{display:none}
    .rm-alert.error{border-color:var(--danger);color:var(--danger)}
    .rm-alert.ok{border-color:var(--success);color:var(--success)}
    .rm-tabs{display:flex;flex-wrap:wrap;gap:6px;border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:6px}
    .rm-tab{flex:1 1 auto;display:flex;flex-direction:column;gap:2px;text-align:left;border:1px solid transparent;border-radius:6px;background:transparent;color:var(--text-2);padding:8px 11px;cursor:pointer;font-weight:800}
    .rm-tab b{font-size:13px;color:var(--text-1)}
    .rm-tab span{font-size:11px;font-weight:700}
    .rm-tab.active{border-color:var(--accent);background:var(--surface-2)}
    .rm-tab.active b{color:var(--accent)}
    .rm-meta-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
    .rm-meta{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:12px}
    .rm-meta b{display:block;margin-bottom:5px}
    .rm-meta span{color:var(--text-2)}
    .rm-reason{width:100%;min-height:64px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-1);padding:10px;font:inherit;resize:vertical}
    .rm-field label{font-size:12px;font-weight:800;color:var(--text-2);text-transform:uppercase;display:block;margin-bottom:5px}
    .rm-workbench{display:grid;grid-template-columns:240px minmax(0,1fr);gap:16px;align-items:start}
    .rm-sidebar{position:sticky;top:12px;border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:12px;max-height:calc(100vh - 120px);overflow:auto}
    .rm-sidebar-head b{display:block;font-size:13px;text-transform:uppercase;color:var(--text-2);letter-spacing:.04em}
    .rm-sidebar-head span{display:block;margin-top:4px;color:var(--text-2);font-size:12px;line-height:1.45;padding-bottom:10px;border-bottom:1px solid var(--border);margin-bottom:10px}
    .rm-gate-list{display:flex;flex-direction:column;gap:7px}
    .rm-gate-btn{width:100%;display:flex;justify-content:space-between;gap:8px;align-items:center;text-align:left;border:1px solid var(--border);border-radius:7px;background:var(--surface-2);color:var(--text-1);padding:9px 11px;cursor:pointer;font-weight:700}
    .rm-gate-btn span{font-size:12px;font-weight:800;color:var(--accent)}
    .rm-gate-btn.active{border-color:var(--accent);background:var(--surface)}
    .rm-editor{display:flex;flex-direction:column;gap:12px;min-width:0}
    .rm-card{border:1px solid var(--border);border-radius:8px;background:var(--surface);padding:13px;display:flex;flex-direction:column;gap:10px}
    .rm-card--invalid{border-color:var(--danger);box-shadow:inset 3px 0 0 var(--danger)}
    .rm-card-head{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
    .rm-gate-tag{font-weight:800;font-size:11px;color:var(--accent-contrast);background:var(--accent);border-radius:4px;padding:2px 7px}
    .rm-cdr{font-weight:800;color:var(--accent)}
    .rm-activity{color:var(--text-1);font-size:13px}
    .rm-activity a{color:var(--accent)}
    .rm-role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:8px}
    .rm-role{display:flex;flex-direction:column;gap:3px;border:1px solid var(--border);border-radius:6px;background:var(--surface-2);padding:6px 7px}
    .rm-role label{font-size:11px;font-weight:800;color:var(--text-2)}
    .rm-role select{border:1px solid var(--border);border-radius:5px;background:var(--surface);color:var(--text-1);font:inherit;padding:4px;font-weight:800}
    .rm-role select[data-val="A"]{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent)}
    .rm-role select[data-val="R"]{border-color:var(--accent);color:var(--accent)}
    .rm-role select[data-val="C"]{border-color:var(--warning,var(--accent))}
    .rm-role select[data-val="I"]{border-color:var(--success,var(--accent))}
    .rm-flag{font-size:11px;font-weight:800}
    .rm-flag.bad{color:var(--danger)}
    .rm-flag.ok{color:var(--success)}
    .rm-aux{border:1px solid var(--border);border-radius:8px;background:var(--surface);overflow:hidden}
    .rm-aux-head{padding:13px 14px;border-bottom:1px solid var(--border)}
    .rm-aux-head b{display:block;font-size:14px}
    .rm-aux-head span{display:block;margin-top:3px;color:var(--text-2);font-size:12px;line-height:1.5}
    .rm-aux-scroll{overflow:auto}
    table.rm-aux-table{width:100%;border-collapse:collapse;font-size:12.5px}
    table.rm-aux-table th{background:var(--surface-2);color:var(--text-2);text-transform:uppercase;font-size:11px;letter-spacing:.03em;text-align:left;padding:8px 10px;border-bottom:1px solid var(--border);position:sticky;top:0}
    table.rm-aux-table td{vertical-align:top;padding:6px 8px;border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
    table.rm-aux-table td:last-child{border-right:none}
    table.rm-aux-table tr:last-child td{border-bottom:none}
    .rm-rownum{color:var(--text-2);font-weight:800;text-align:right;width:34px}
    .rm-cell-ta{width:100%;min-width:120px;min-height:46px;border:1px solid var(--border);border-radius:5px;background:var(--surface-2);color:var(--text-1);font:inherit;font-size:12px;padding:5px 6px;resize:vertical;line-height:1.45}
    .rm-cell-ta:focus{border-color:var(--accent);background:var(--surface);outline:none}
    .rm-aux-note{padding:9px 14px;color:var(--text-2);font-size:11.5px;line-height:1.5;border-top:1px solid var(--border)}
    .rm-docs{border:1px solid var(--border);border-radius:8px;background:var(--surface)}
    .rm-docs>summary{cursor:pointer;padding:12px 14px;font-weight:800;list-style:none}
    .rm-docs>summary::-webkit-details-marker{display:none}
    .rm-docs>summary::before{content:'▸ ';color:var(--text-2)}
    .rm-docs[open]>summary::before{content:'▾ '}
    .rm-docs-note{padding:0 14px 10px;color:var(--text-2);font-size:12px;line-height:1.5}
    .rm-docs-list{display:flex;flex-direction:column;border-top:1px solid var(--border)}
    .rm-doc{display:flex;align-items:center;gap:10px;padding:9px 14px;border-bottom:1px solid var(--border)}
    .rm-doc:last-child{border-bottom:none}
    .rm-doc-main{flex:1 1 auto;min-width:0;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
    .rm-doc-code{font-weight:800;font-size:11px;color:var(--accent-contrast);background:var(--accent);border-radius:4px;padding:2px 7px;white-space:nowrap}
    .rm-doc-title{color:var(--text-1);font-size:12.5px}
    .rm-doc-rel{font-size:11px;font-weight:700;border-radius:5px;padding:3px 8px;white-space:nowrap;border:1px solid var(--border);color:var(--text-2)}
    .rm-doc-rel--ok{color:var(--success);border-color:var(--success)}
    .rm-doc-rel--warn{color:var(--warning,var(--accent));border-color:var(--warning,var(--accent))}
    .rm-doc-open{font-size:12px;font-weight:700;color:var(--accent);text-decoration:none;white-space:nowrap}
    .rm-doc-open--none{color:var(--text-2)}
    @media (max-width:1150px){.rm-workbench{grid-template-columns:1fr}.rm-sidebar{position:static;max-height:none}.rm-gate-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.rm-meta-grid{grid-template-columns:1fr}.rm-head{flex-direction:column}.rm-doc{flex-wrap:wrap}}
  </style>
  <div class="rm-head">
    <div>
      <h2>${_t('Console RACI', 'RACI console')}</h2>
      <p>${_t('Điểm điều khiển duy nhất cho cả bốn tập RACI trong tài liệu kiểm soát ANNEX-121: ma trận cổng G0→G7, RACI chuỗi giá trị mục 4, RACI tài liệu mục 6 và bảng phụ trợ. Khi lưu, hệ thống kiểm tra bất biến ma trận cổng rồi tái tạo cả bốn vùng trong ANNEX-121 và các bảng RACI nhúng trong SOP/JD.', 'The single control point for all four RACI datasets inside the controlled ANNEX-121 document: the G0→G7 gate matrix, the §4 value-stream RACI, the §6 document-level RACI and the support supplement. On save the gate-matrix invariants are checked and all four ANNEX-121 regions — plus the embedded SOP/JD RACI tables — are regenerated.')}</p>
    </div>
    <div class="rm-actions">
      <button class="rm-btn" type="button" onclick="_rmReload()">${_t('Tải lại', 'Reload')}</button>
      <button class="rm-btn" type="button" onclick="_rmReset()">${_t('Hoàn tác', 'Reset')}</button>
      <button class="rm-btn primary" id="rm-save-btn" type="button" ${(_state.saving || badCount > 0) ? 'disabled' : ''} onclick="_rmSave()">${_state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu và cập nhật ANNEX-121', 'Save and publish ANNEX-121')}</button>
    </div>
  </div>
  <div class="rm-alert error" id="rm-error-alert" ${_state.error ? '' : 'hidden'}>${_esc(_state.error)}</div>
  <div class="rm-alert ok" id="rm-message-alert" ${_state.message ? '' : 'hidden'}>${_esc(_state.message)}</div>
  <div class="rm-alert error" id="rm-invalid-alert" ${badCount > 0 ? '' : 'hidden'}>${_esc(badCount + ' ' + _t('dòng ma trận cổng vi phạm bất biến RACI (cần đúng 1 A và ≥ 1 R).', 'gate-matrix row(s) violate the RACI invariants (need exactly one A and at least one R).'))}</div>
  ${_renderTabs(cfg)}
  <div class="rm-meta-grid">
    <div class="rm-meta"><b>${_t('Cập nhật lần cuối', 'Last updated')}</b><span>${_esc(cfg.updated_at || _t('Chưa có', 'Not yet'))} · ${_esc(cfg.updated_by || '—')}</span></div>
    <div class="rm-meta"><b>${_t('Lý do gần nhất', 'Last reason')}</b><span>${_esc(cfg.reason || '—')}</span></div>
    <div class="rm-meta"><b>${_t('Tài liệu đồng bộ', 'Published document')}</b><span>ANNEX-121 §4·§5·§6 + ${_t('bảng phụ trợ', 'support')}</span></div>
  </div>
  ${_renderLinkedDocs(cfg)}
  <div class="rm-field">
    <label>${_t('Lý do cập nhật', 'Change reason')}</label>
    <textarea class="rm-reason" oninput="_rmSetReason(this.value)" placeholder="${_t('Ví dụ: chuyển PD thành R cho A5 theo IATF 16949 §8.2.3.1.3...', 'Example: set PD to R on A5 per IATF 16949 §8.2.3.1.3...')}">${_esc(_state.reason || '')}</textarea>
  </div>
  ${_state.activeSection === 'gate' ? _renderGateSection(rows, gates) : _renderAuxSection(_state.activeSection)}
</section>`;
  _syncStatus();
}

function _renderTabs(cfg){
  var defs = [{
    key: 'gate', vi: 'Ma trận cổng §5', en: 'Gate matrix §5',
    count: _rows().length
  }];
  AUX_KEYS.forEach(function(k){
    defs.push({ key: k, vi: AUX[k].vi, en: AUX[k].en, count: _auxRows(k).length });
  });
  var html = '<div class="rm-tabs">';
  defs.forEach(function(d){
    html += `
    <button class="rm-tab ${_state.activeSection === d.key ? 'active' : ''}" type="button" onclick="_rmSetSection('${d.key}')">
      <b>${_t(d.vi, d.en)}</b><span>${d.count} ${_t('dòng', 'rows')}</span>
    </button>`;
  });
  return html + '</div>';
}

function _renderGateSection(rows, gates){
  var visible = rows.map(function(row, idx){ return { row: row, idx: idx }; })
    .filter(function(rec){
      return _state.activeGate === 'all' || String(rec.row.gate || '') === _state.activeGate;
    });
  return `
  <div class="rm-workbench">
    ${_renderGateNav(gates, rows)}
    <div class="rm-editor">
      ${visible.map(function(rec){ return _renderCard(rec.row, rec.idx); }).join('')}
    </div>
  </div>`;
}

function _renderGateNav(gates, rows){
  var html = `
<aside class="rm-sidebar">
  <div class="rm-sidebar-head">
    <b>${_t('Cổng kiểm soát', 'Control gates')}</b>
    <span>${_t('Chọn cổng để lọc các hoạt động cần sửa.', 'Pick a gate to filter the activities.')}</span>
  </div>
  <div class="rm-gate-list">
    <button class="rm-gate-btn ${_state.activeGate === 'all' ? 'active' : ''}" type="button" onclick="_rmSetGate('all')">
      <span>${_t('Tất cả', 'All')}</span><span>${rows.length}</span>
    </button>`;
  gates.forEach(function(g){
    var n = rows.filter(function(row){ return String(row.gate || '') === g; }).length;
    html += `
    <button class="rm-gate-btn ${_state.activeGate === g ? 'active' : ''}" type="button" onclick="_rmSetGate('${_esc(g)}')">
      <span>${_esc(g)}</span><span>${n}</span>
    </button>`;
  });
  return html + `
  </div>
</aside>`;
}

function _renderCard(row, idx){
  var flags = _rowFlags(row);
  var roles = row.roles || {};
  var rolesHtml = ROLES.map(function(role){
    var cur = roles[role] || '';
    var opts = LETTERS.map(function(L){
      return '<option value="' + L + '"' + (L === cur ? ' selected' : '') + '>' + (L || '—') + '</option>';
    }).join('');
    return `
    <div class="rm-role">
      <label>${_esc(role)}</label>
      <select data-val="${_esc(cur)}" onchange="_rmSetRole(${idx},'${_esc(role)}',this.value);this.setAttribute('data-val',this.value)">${opts}</select>
    </div>`;
  }).join('');
  return `
<article class="rm-card${flags.invalid ? ' rm-card--invalid' : ''}" data-rm-idx="${idx}">
  <div class="rm-card-head">
    <span class="rm-gate-tag">${_esc(row.gate || '')}</span>
    <span class="rm-cdr">${_esc(row.cdr || '')}</span>
    <span class="rm-flag ${flags.invalid ? 'bad' : 'ok'}">${flags.invalid
      ? _t('⚠ ' + flags.a + ' A · ' + flags.r + ' R', '⚠ ' + flags.a + ' A · ' + flags.r + ' R')
      : _t('✓ 1 A · ' + flags.r + ' R', '✓ 1 A · ' + flags.r + ' R')}</span>
  </div>
  <div class="rm-activity">${row.activity_html || _esc(row.cdr || '')}</div>
  <div class="rm-role-grid">${rolesHtml}</div>
</article>`;
}

/* ── Auxiliary RACI datasets (§4 / §6 / support) ──────────────────── */
function _renderAuxSection(key){
  var def = AUX[key];
  var rows = _auxRows(key);
  var head = _lang === 'en' ? def.headEn : def.headVi;
  var cols = head.length;

  var thead = '<tr><th class="rm-rownum">#</th>';
  head.forEach(function(h){ thead += '<th>' + _esc(h) + '</th>'; });
  thead += '</tr>';

  var body = '';
  rows.forEach(function(row, ri){
    var cells = Array.isArray(row.cells) ? row.cells : [];
    body += '<tr><td class="rm-rownum">' + (ri + 1) + '</td>';
    for(var ci = 0; ci < cols; ci++){
      var val = cells[ci] == null ? '' : String(cells[ci]);
      body += '<td><textarea class="rm-cell-ta" spellcheck="false"'
        + ' oninput="_rmSetAuxCell(\'' + key + '\',' + ri + ',' + ci + ',this.value)">'
        + _esc(val) + '</textarea></td>';
    }
    body += '</tr>';
  });
  if(!rows.length){
    body = '<tr><td colspan="' + (cols + 1) + '" style="padding:14px;color:var(--text-2)">'
      + _t('Chưa có dòng nào.', 'No rows yet.') + '</td></tr>';
  }

  return `
  <div class="rm-aux">
    <div class="rm-aux-head">
      <b>${_t(def.vi, def.en)}</b>
      <span>${_t(def.descVi, def.descEn)}</span>
    </div>
    <div class="rm-aux-scroll">
      <table class="rm-aux-table">
        <thead>${thead}</thead>
        <tbody>${body}</tbody>
      </table>
    </div>
    <div class="rm-aux-note">${_t('Ô chứa HTML gốc của ANNEX-121 (giữ liên kết vai trò/tài liệu). Khi lưu, mã script và thuộc tính sự kiện bị loại bỏ; số dòng và số cột phải giữ nguyên để cập nhật được chấp nhận.', 'Cells hold the original ANNEX-121 HTML (role/document links preserved). On save, scripts and event attributes are stripped; the row and column count must stay unchanged for the update to be accepted.')}</div>
  </div>`;
}

/* ── Linked documents (RACI ecosystem hub) ────────────────────────── */
function _docHref(url){
  if(!url) return '';
  var base = location.pathname.replace(/[^/]*$/, '');
  return location.origin + base + url;
}

function _relationMeta(rel){
  var m = {
    auto:    {vi:'Tự cập nhật khi lưu',                  en:'Auto-updated on save',            cls:'ok'},
    live:    {vi:'Tự phản ánh — đọc ANNEX-121 trực tiếp', en:'Live — reads ANNEX-121',          cls:'ok'},
    summary: {vi:'Tóm tắt — đồng bộ thủ công',           en:'Summary — manual sync',           cls:'warn'},
    sibling: {vi:'Tài liệu thẩm quyền anh em',           en:'Sibling authority document',      cls:'neutral'},
    derived: {vi:'Bản phái sinh — ANNEX-121 quyết định', en:'Derived view — ANNEX-121 governs', cls:'neutral'},
    guard:   {vi:'Cơ chế kiểm tra tự động',              en:'Automated guard',                 cls:'neutral'}
  };
  return m[rel] || {vi:rel, en:rel, cls:'neutral'};
}

function _renderLinkedDocs(cfg){
  var docs = Array.isArray(cfg.linked_documents) ? cfg.linked_documents : [];
  if(!docs.length) return '';
  var rows = docs.map(function(d){
    var meta = _relationMeta(d.relation);
    var href = _docHref(d.url);
    var link = href
      ? `<a class="rm-doc-open" href="${_esc(href)}" target="_blank" rel="noopener">${_t('Mở', 'Open')} ↗</a>`
      : `<span class="rm-doc-open rm-doc-open--none">—</span>`;
    return `
    <div class="rm-doc">
      <div class="rm-doc-main">
        <span class="rm-doc-code">${_esc(d.code)}</span>
        <span class="rm-doc-title">${_esc(d.title)}</span>
      </div>
      <span class="rm-doc-rel rm-doc-rel--${_esc(meta.cls)}">${_esc(_t(meta.vi, meta.en))}</span>
      ${link}
    </div>`;
  }).join('');
  return `
  <details class="rm-docs" open>
    <summary>${_t('Tài liệu liên quan trong hệ sinh thái RACI', 'Linked documents in the RACI ecosystem')} (${docs.length})</summary>
    <div class="rm-docs-note">${_t('Lưu ở Console này tái tạo cả bốn vùng RACI của ANNEX-121; sidebar “Thẩm quyền &amp; RACI” trên mọi SOP/JD đọc ANNEX-121 nên tự phản ánh thay đổi. Tài liệu tóm tắt và anh em được đồng bộ theo cơ chế riêng.', 'Saving here regenerates all four ANNEX-121 RACI regions; the “Authority &amp; RACI” sidebar on every SOP/JD reads ANNEX-121 so it reflects the change live. Summary and sibling documents sync via their own mechanism.')}</div>
    <div class="rm-docs-list">${rows}</div>
  </details>`;
}

window._rmReload = _load;
window._rmReset = _resetDraft;
window._rmSave = _save;
window._rmSetRole = _setRole;
window._rmSetAuxCell = _setAuxCell;
window._rmSetReason = _setReason;
window._rmSetGate = _setGate;
window._rmSetSection = _setSection;

})();
