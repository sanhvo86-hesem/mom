/* ===================================================================
   00n-admin-raci-matrix.js
   Admin: editable RACI gate matrix (ANNEX-121 §5 G0→G7).
   Saving validates the RACI invariants and regenerates the marked
   gate-matrix region inside the controlled ANNEX-121 document.
   =================================================================== */

(function(){
'use strict';

var _el = null;
var _lang = 'vi';
var ROLES = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR/IT'];
var LETTERS = ['', 'A', 'R', 'C', 'I'];
var _state = {
  loading: false,
  saving: false,
  error: '',
  message: '',
  config: null,
  draft: null,
  reason: '',
  activeGate: 'all'
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

function _gates(){
  var seen = [], out = [];
  _rows().forEach(function(row){
    var g = String(row.gate || '').trim();
    if(g && seen.indexOf(g) < 0){ seen.push(g); out.push(g); }
  });
  out.sort();
  return out;
}

/* ── RACI invariants ──────────────────────────────────────────────── */
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
      _state.error = _t('Không tải được ma trận RACI.', 'Cannot load RACI matrix.') + ' ' + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.loading = false;
      _render();
    });
}

function _save(){
  if(_state.saving) return;
  if(_invalidCount() > 0){
    _state.error = _t('Còn dòng vi phạm bất biến RACI — mỗi dòng phải có đúng 1 chữ A và ít nhất 1 chữ R.',
                      'Some rows violate the RACI invariants — each row needs exactly one A and at least one R.');
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
      _state.message = _t('Đã lưu và cập nhật bảng RACI trong ANNEX-121.',
                          'Saved and regenerated the RACI matrix inside ANNEX-121.');
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
  // light update — refresh the card's invalid marker + global status only
  var card = document.querySelector('.rm-card[data-rm-idx="' + idx + '"]');
  if(card) card.classList.toggle('rm-card--invalid', _rowFlags(rows[idx]).invalid);
  _syncStatus();
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
    ? _t(bad + ' dòng vi phạm bất biến RACI (cần đúng 1 A và ≥ 1 R).',
         bad + ' row(s) violate the RACI invariants (need exactly one A and at least one R).')
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
    el.innerHTML = '<div class="hm-empty">' + _t('Đang tải ma trận RACI...', 'Loading RACI matrix...') + '</div>';
    return;
  }

  var cfg = _state.draft || {};
  var rows = _rows();
  var gates = _gates();
  if(_state.activeGate !== 'all' && gates.indexOf(_state.activeGate) < 0){
    _state.activeGate = 'all';
  }
  var visible = rows.map(function(row, idx){ return { row: row, idx: idx }; })
    .filter(function(rec){
      return _state.activeGate === 'all' || String(rec.row.gate || '') === _state.activeGate;
    });
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
    @media (max-width:1150px){.rm-workbench{grid-template-columns:1fr}.rm-sidebar{position:static;max-height:none}.rm-gate-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}.rm-meta-grid{grid-template-columns:1fr}.rm-head{flex-direction:column}}
  </style>
  <div class="rm-head">
    <div>
      <h2>${_t('Ma trận RACI', 'RACI matrix')}</h2>
      <p>${_t('Sửa phân công A/R/C/I cho 46 hoạt động theo cổng G0→G7. Khi lưu, hệ thống kiểm tra bất biến (đúng 1 chữ A, ít nhất 1 chữ R mỗi dòng) rồi tự cập nhật bảng RACI mục 5 trong tài liệu kiểm soát ANNEX-121.', 'Edit the A/R/C/I assignment for 46 gated activities (G0→G7). On save the RACI invariants are checked (exactly one A, at least one R per row) and the §5 matrix inside the controlled ANNEX-121 document is regenerated.')}</p>
    </div>
    <div class="rm-actions">
      <button class="rm-btn" type="button" onclick="_rmReload()">${_t('Tải lại', 'Reload')}</button>
      <button class="rm-btn" type="button" onclick="_rmReset()">${_t('Hoàn tác', 'Reset')}</button>
      <button class="rm-btn primary" id="rm-save-btn" type="button" ${(_state.saving || badCount > 0) ? 'disabled' : ''} onclick="_rmSave()">${_state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu và cập nhật ANNEX-121', 'Save and publish ANNEX-121')}</button>
    </div>
  </div>
  <div class="rm-alert error" id="rm-error-alert" ${_state.error ? '' : 'hidden'}>${_esc(_state.error)}</div>
  <div class="rm-alert ok" id="rm-message-alert" ${_state.message ? '' : 'hidden'}>${_esc(_state.message)}</div>
  <div class="rm-alert error" id="rm-invalid-alert" ${badCount > 0 ? '' : 'hidden'}>${_esc(badCount + ' ' + _t('dòng vi phạm bất biến RACI (cần đúng 1 A và ≥ 1 R).', 'row(s) violate the RACI invariants (need exactly one A and at least one R).'))}</div>
  <div class="rm-meta-grid">
    <div class="rm-meta"><b>${_t('Số hoạt động', 'Activities')}</b><span>${rows.length}</span></div>
    <div class="rm-meta"><b>${_t('Cập nhật lần cuối', 'Last updated')}</b><span>${_esc(cfg.updated_at || _t('Chưa có', 'Not yet'))} · ${_esc(cfg.updated_by || '—')}</span></div>
    <div class="rm-meta"><b>${_t('Tài liệu đồng bộ', 'Published document')}</b><span>ANNEX-121 §5</span></div>
  </div>
  <div class="rm-field">
    <label>${_t('Lý do cập nhật', 'Change reason')}</label>
    <textarea class="rm-reason" oninput="_rmSetReason(this.value)" placeholder="${_t('Ví dụ: chuyển PD thành R cho A5 theo IATF 16949 §8.2.3.1.3...', 'Example: set PD to R on A5 per IATF 16949 §8.2.3.1.3...')}">${_esc(_state.reason || '')}</textarea>
  </div>
  <div class="rm-workbench">
    ${_renderGateNav(gates, rows)}
    <div class="rm-editor">
      ${visible.map(function(rec){ return _renderCard(rec.row, rec.idx); }).join('')}
    </div>
  </div>
</section>`;
  _syncStatus();
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

window._rmReload = _load;
window._rmReset = _resetDraft;
window._rmSave = _save;
window._rmSetRole = _setRole;
window._rmSetReason = _setReason;
window._rmSetGate = _setGate;

})();
