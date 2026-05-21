/* ===================================================================
   00n-admin-raci-matrix.js
   Admin: RACI Console — single control point for every RACI dataset in
   the controlled QMS document set. Dashboard landing + six datasets:
     • Ma trận cổng §5   — gate matrix G0→G7 (A/R/C/I editor)
     • Chuỗi giá trị §4  — value-stream RACI (ANNEX-121)
     • Tài liệu §6       — document-level RACI (ANNEX-121)
     • Bảng phụ trợ      — support-function supplement (ANNEX-121)
     • Giao diện JD      — per-JD §6 interface RACI table (39 JD)
     • Vai trò SOP §4    — per-SOP §4 role / authority RACI table (37 SOP)
   Saving validates the gate-matrix invariants and regenerates every
   marked region across ANNEX-121 and the embedded SOP/JD documents.
   =================================================================== */

(function(){
'use strict';

var _el = null;
var _lang = 'vi';
var ROLES = ['CS','EST','ENG','PPL','WKM','PD','QA','SCM','CEO','EHS','HR','IT'];
var LETTERS = ['', 'A', 'R', 'C', 'I'];

/* Cell-table datasets (ANNEX-121 §4 / §6 / support supplement). */
var AUX = {
  value_stream: {
    headVi: ['Hoạt động ngang', 'A', 'R', 'C/I', 'Bằng chứng'],
    headEn: ['Horizontal activity', 'A', 'R', 'C/I', 'Evidence']
  },
  document_level: {
    headVi: ['Tài liệu', 'A', 'R', 'C', 'Duyệt', 'Người dùng chính'],
    headEn: ['Document', 'A', 'R', 'C', 'Approve', 'Primary user']
  },
  support: {
    headVi: ['Cổng', 'CDR', 'Hoạt động', 'Vai trò hỗ trợ', 'RACI', 'Lý do tham gia'],
    headEn: ['Gate', 'CDR', 'Activity', 'Support role', 'RACI', 'Reason']
  }
};

/* Document-keyed HTML datasets (one verbatim table per source document). */
var DOCMAP = {
  jd: {
    stateKey: 'jd_interface', active: 'activeJd',
    labelVi: 'Bản mô tả công việc', labelEn: 'Job description',
    fieldVi: 'HTML bảng giao diện RACI', fieldEn: 'Interface RACI table HTML'
  },
  sop_roles: {
    stateKey: 'sop_roles', active: 'activeSop',
    labelVi: 'Quy trình (SOP)', labelEn: 'Procedure (SOP)',
    fieldVi: 'HTML mục §4 Vai trò &amp; RACI', fieldEn: 'Section 4 role / RACI HTML'
  }
};

/* Six datasets — drives the dashboard tiles and the section navigator. */
var DATASETS = [
  { key:'gate', code:'§5', kind:'gate',
    vi:'Ma trận cổng', en:'Gate matrix',
    descVi:'Phân công A/R/C/I cho 46 hoạt động kiểm soát theo cổng G0→G7.',
    descEn:'A/R/C/I assignment for 46 gated activities, G0→G7.',
    unitVi:'hoạt động', unitEn:'activities', sync:'ANNEX-121 §5' },
  { key:'value_stream', code:'§4', kind:'aux',
    vi:'Chuỗi giá trị', en:'Value stream',
    descVi:'RACI các hoạt động chạy ngang chuỗi giá trị, không gắn cổng.',
    descEn:'RACI for horizontal value-stream activities.',
    unitVi:'dòng', unitEn:'rows', sync:'ANNEX-121 §4' },
  { key:'document_level', code:'§6', kind:'aux',
    vi:'Tài liệu', en:'Document level',
    descVi:'Quyền sở hữu, duyệt và sử dụng từng tài liệu thẩm quyền.',
    descEn:'Ownership, approval and use of each authority document.',
    unitVi:'dòng', unitEn:'rows', sync:'ANNEX-121 §6' },
  { key:'support', code:'SUP', kind:'aux',
    vi:'Bảng phụ trợ', en:'Support supplement',
    descVi:'Vai trò hỗ trợ (Tài chính, Bảo trì…) tham vấn tại các cổng.',
    descEn:'Support roles consulted at the control gates.',
    unitVi:'dòng', unitEn:'rows', sync:'ANNEX-121 phụ lục' },
  { key:'jd', code:'JD', kind:'docmap',
    vi:'Giao diện JD', en:'JD interface',
    descVi:'Bảng “Giao diện liên phòng ban — RACI / Bàn giao” trong từng JD.',
    descEn:'The cross-department interface RACI table inside each JD.',
    unitVi:'tài liệu', unitEn:'documents', sync:'39 tài liệu JD' },
  { key:'sop_roles', code:'SOP', kind:'docmap',
    vi:'Vai trò SOP §4', en:'SOP §4 roles',
    descVi:'Bảng “Vai trò, quyền hạn & RACI” mục §4 trong từng quy trình SOP.',
    descEn:'The §4 role / authority / RACI table inside each SOP.',
    unitVi:'tài liệu', unitEn:'documents', sync:'37 tài liệu SOP' }
];

var _state = {
  loading: false,
  saving: false,
  error: '',
  message: '',
  config: null,
  draft: null,
  reason: '',
  activeGate: 'all',
  activeSection: 'overview',
  activeJd: '',
  activeSop: ''
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

/* ── Dataset accessors ────────────────────────────────────────────── */
function _rows(){
  var d = _state.draft || {};
  return Array.isArray(d.rows) ? d.rows : [];
}

function _auxRows(key){
  var d = _state.draft || {};
  return Array.isArray(d[key]) ? d[key] : [];
}

function _docMap(key){
  var d = _state.draft || {};
  var sk = DOCMAP[key].stateKey;
  return (d[sk] && typeof d[sk] === 'object') ? d[sk] : {};
}

function _docSlugs(key){ return Object.keys(_docMap(key)).sort(); }

function _datasetCount(ds){
  if(ds.kind === 'gate') return _rows().length;
  if(ds.kind === 'aux') return _auxRows(ds.key).length;
  return _docSlugs(ds.key).length;
}

function _datasetById(key){
  for(var i = 0; i < DATASETS.length; i++){
    if(DATASETS[i].key === key) return DATASETS[i];
  }
  return null;
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

/* ── Data load / save ─────────────────────────────────────────────── */
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
    _state.error = _t('Còn dòng ma trận cổng vi phạm bất biến RACI — mỗi dòng cần đúng 1 chữ A và ít nhất 1 chữ R.',
                      'Gate-matrix rows violate the RACI invariants — each needs exactly one A and at least one R.');
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
      _state.message = _t('Đã lưu và tái tạo các vùng RACI trong ANNEX-121, JD và SOP liên quan.',
                          'Saved and regenerated the RACI regions across ANNEX-121, the JDs and the SOPs.');
    })
    .catch(function(err){
      _state.error = _t('Không lưu được. ', 'Save failed. ') + (err && err.message ? err.message : '');
    })
    .finally(function(){
      _state.saving = false;
      _render();
    });
}

/* ── Mutators ─────────────────────────────────────────────────────── */
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

function _setDocSel(key, slug){
  _state[DOCMAP[key].active] = slug || '';
  _render();
}

function _setDocHtml(key, slug, value){
  var map = _docMap(key);
  if(!map[slug]) return;
  map[slug].html = value;
  _state.error = '';
  _state.message = '';
}

/* In-place (contenteditable) edits — capture the rendered HTML only when
   the user actually edits, so an untouched dataset stays byte-identical. */
function _editAuxCell(key, rowIdx, colIdx, el){
  var rows = _auxRows(key);
  if(!rows[rowIdx] || !Array.isArray(rows[rowIdx].cells)) return;
  rows[rowIdx].cells[colIdx] = el.innerHTML;
  _state.error = '';
  _state.message = '';
}

function _editDocBlob(key, slug, el){
  var map = _docMap(key);
  if(!map[slug]) return;
  map[slug].html = el.innerHTML;
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

function _go(section){
  _state.activeSection = section || 'overview';
  _render();
  var host = _el || document.getElementById('admin-content');
  if(host && host.scrollIntoView) host.scrollIntoView({ block: 'start' });
}

/* ── Status helpers ───────────────────────────────────────────────── */
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
      : _t('Lưu & đồng bộ tài liệu', 'Save & sync documents');
  }
}

/* ── Root render ──────────────────────────────────────────────────── */
function _render(){
  var el = _el || document.getElementById('admin-content');
  if(!el || !document.contains(el)) return;

  if(_state.loading){
    el.innerHTML = '<div class="hm-empty">' + _t('Đang tải Console RACI...', 'Loading RACI console...') + '</div>';
    return;
  }

  var section = _state.activeSection;
  if(section !== 'overview' && !_datasetById(section)){
    section = _state.activeSection = 'overview';
  }
  var cfg = _state.draft || {};
  var badCount = _invalidCount();

  var body;
  if(section === 'overview'){
    body = _renderOverview(cfg);
  } else {
    var ds = _datasetById(section);
    body = _renderSectionNav(ds)
      + (ds.kind === 'gate' ? _renderGateSection()
         : ds.kind === 'aux' ? _renderAuxSection(ds)
         : _renderDocMapSection(ds));
  }

  el.innerHTML = `
<section class="raci-console">
  ${_styleBlock()}
  <header class="rc-head">
    <div class="rc-head-main">
      <div class="rc-head-titles">
        <span class="rc-eyebrow">${_t('Quản trị điều hành', 'Operations governance')}</span>
        <h2>${_t('Console RACI', 'RACI console')}</h2>
        <p>${_t('Điểm điều khiển duy nhất cho toàn bộ RACI trong hệ tài liệu kiểm soát — ma trận cổng, RACI chuỗi giá trị, RACI tài liệu, bảng phụ trợ, giao diện JD và vai trò SOP. Mọi thay đổi lưu tại đây sẽ tái tạo các vùng tương ứng trong ANNEX-121 và các tài liệu JD / SOP nhúng.', 'The single control point for every RACI dataset in the controlled document set. Saving here regenerates the matching regions inside ANNEX-121 and the embedded JD / SOP documents.')}</p>
      </div>
    </div>
    <div class="rc-actions">
      <button class="rc-btn" type="button" onclick="_rmReload()">${_t('Tải lại', 'Reload')}</button>
      <button class="rc-btn" type="button" onclick="_rmReset()">${_t('Hoàn tác', 'Reset')}</button>
      <button class="rc-btn primary" id="rm-save-btn" type="button" ${(_state.saving || badCount > 0) ? 'disabled' : ''} onclick="_rmSave()">${_state.saving ? _t('Đang lưu...', 'Saving...') : _t('Lưu & đồng bộ tài liệu', 'Save & sync documents')}</button>
    </div>
  </header>
  <div class="rc-alert error" id="rm-error-alert" ${_state.error ? '' : 'hidden'}>${_esc(_state.error)}</div>
  <div class="rc-alert ok" id="rm-message-alert" ${_state.message ? '' : 'hidden'}>${_esc(_state.message)}</div>
  <div class="rc-alert error" id="rm-invalid-alert" ${badCount > 0 ? '' : 'hidden'}>${_esc(badCount + ' ' + _t('dòng ma trận cổng vi phạm bất biến RACI (cần đúng 1 A và ≥ 1 R).', 'gate-matrix row(s) violate the RACI invariants.'))}</div>
  <div class="rc-field">
    <label>${_t('Lý do cập nhật (ghi vào nhật ký kiểm toán)', 'Change reason (written to the audit log)')}</label>
    <textarea class="rc-reason" oninput="_rmSetReason(this.value)" placeholder="${_t('Ví dụ: chuyển PD thành R cho A5 theo IATF 16949 §8.2.3.1.3...', 'Example: set PD to R on A5 per IATF 16949 §8.2.3.1.3...')}">${_esc(_state.reason || '')}</textarea>
  </div>
  ${body}
</section>`;
  _syncStatus();
}

/* ── Overview / dashboard landing ─────────────────────────────────── */
function _renderOverview(cfg){
  var totalRows = 0;
  DATASETS.forEach(function(ds){ totalRows += _datasetCount(ds); });
  var managedDocs = 1 + _docSlugs('jd').length + _docSlugs('sop_roles').length;

  var stats = [
    { v: totalRows, vi: 'Mục dữ liệu RACI', en: 'RACI data rows' },
    { v: DATASETS.length, vi: 'Tập dữ liệu', en: 'Datasets' },
    { v: managedDocs, vi: 'Tài liệu tự đồng bộ', en: 'Auto-synced documents' },
    { v: _esc(cfg.updated_by || '—'), vi: 'Cập nhật bởi', en: 'Updated by', small: true }
  ];
  var statHtml = stats.map(function(s){
    return `<div class="rc-stat">
      <span class="rc-stat-v ${s.small ? 'sm' : ''}">${s.v}</span>
      <span class="rc-stat-l">${_t(s.vi, s.en)}</span>
    </div>`;
  }).join('');

  var tiles = DATASETS.map(function(ds){
    var n = _datasetCount(ds);
    return `
    <button class="rc-tile" type="button" onclick="_rmGo('${ds.key}')">
      <div class="rc-tile-top">
        <span class="rc-badge rc-badge--${ds.kind}">${_esc(ds.code)}</span>
        <span class="rc-tile-count">${n}<small>${_esc(_t(ds.unitVi, ds.unitEn))}</small></span>
      </div>
      <div class="rc-tile-name">${_t(ds.vi, ds.en)}</div>
      <div class="rc-tile-desc">${_t(ds.descVi, ds.descEn)}</div>
      <div class="rc-tile-foot">
        <span class="rc-sync">↻ ${_esc(ds.sync)}</span>
        <span class="rc-tile-go">${_t('Mở', 'Open')} →</span>
      </div>
    </button>`;
  }).join('');

  return `
  <div class="rc-statbar">${statHtml}</div>
  <div class="rc-section-cap">
    <b>${_t('Sáu tập dữ liệu RACI', 'Six RACI datasets')}</b>
    <span>${_t('Chọn một tập để xem và chỉnh sửa. Lưu sẽ kiểm tra bất biến rồi đồng bộ ra tài liệu.', 'Pick a dataset to view and edit. Saving validates the invariants then syncs to the documents.')}</span>
  </div>
  <div class="rc-tiles">${tiles}</div>
  ${_renderLinkedDocs(cfg)}`;
}

/* ── Section navigator (breadcrumb + dataset pills) ───────────────── */
function _renderSectionNav(active){
  var pills = DATASETS.map(function(ds){
    return `<button class="rc-pill ${ds.key === active.key ? 'active' : ''}" type="button" onclick="_rmGo('${ds.key}')">
      <span class="rc-pill-code">${_esc(ds.code)}</span>${_t(ds.vi, ds.en)}
    </button>`;
  }).join('');
  return `
  <nav class="rc-nav">
    <button class="rc-back" type="button" onclick="_rmGo('overview')">← ${_t('Tổng quan', 'Overview')}</button>
    <div class="rc-pills">${pills}</div>
  </nav>`;
}

/* ── Gate matrix §5 ───────────────────────────────────────────────── */
function _renderGateSection(){
  var rows = _rows();
  var gates = _gates();
  if(_state.activeGate !== 'all' && gates.indexOf(_state.activeGate) < 0){
    _state.activeGate = 'all';
  }
  var visible = rows.map(function(row, idx){ return { row: row, idx: idx }; })
    .filter(function(rec){
      return _state.activeGate === 'all' || String(rec.row.gate || '') === _state.activeGate;
    });
  return `
  <div class="rc-panel">
    <div class="rc-panel-head">
      <b>${_t('Ma trận cổng §5 — G0→G7', 'Gate matrix §5 — G0→G7')}</b>
      <span>${_t('Sửa phân công A/R/C/I cho từng hoạt động. Mỗi dòng cần đúng 1 chữ A và ít nhất 1 chữ R.', 'Edit the A/R/C/I assignment. Each row needs exactly one A and at least one R.')}</span>
    </div>
    <div class="rc-workbench">
      ${_renderGateNav(gates, rows)}
      <div class="rc-editor">
        ${visible.map(function(rec){ return _renderCard(rec.row, rec.idx); }).join('')}
      </div>
    </div>
  </div>`;
}

function _renderGateNav(gates, rows){
  var html = `
<aside class="rc-sidebar">
  <div class="rc-sidebar-head">${_t('Cổng kiểm soát', 'Control gates')}</div>
  <div class="rc-gate-list">
    <button class="rc-gate-btn ${_state.activeGate === 'all' ? 'active' : ''}" type="button" onclick="_rmSetGate('all')">
      <span>${_t('Tất cả', 'All')}</span><b>${rows.length}</b>
    </button>`;
  gates.forEach(function(g){
    var n = rows.filter(function(row){ return String(row.gate || '') === g; }).length;
    html += `
    <button class="rc-gate-btn ${_state.activeGate === g ? 'active' : ''}" type="button" onclick="_rmSetGate('${_esc(g)}')">
      <span>${_esc(g)}</span><b>${n}</b>
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
    <div class="rc-role">
      <label>${_esc(role)}</label>
      <select data-val="${_esc(cur)}" onchange="_rmSetRole(${idx},'${_esc(role)}',this.value);this.setAttribute('data-val',this.value)">${opts}</select>
    </div>`;
  }).join('');
  return `
<article class="rm-card${flags.invalid ? ' rm-card--invalid' : ''}" data-rm-idx="${idx}">
  <div class="rc-card-head">
    <span class="rc-gate-tag">${_esc(row.gate || '')}</span>
    <span class="rc-cdr">${_esc(row.cdr || '')}</span>
    <span class="rc-flag ${flags.invalid ? 'bad' : 'ok'}">${flags.invalid
      ? '⚠ ' + flags.a + ' A · ' + flags.r + ' R'
      : '✓ 1 A · ' + flags.r + ' R'}</span>
  </div>
  <div class="rc-activity">${row.activity_html || _esc(row.cdr || '')}</div>
  <div class="rc-role-grid">${rolesHtml}</div>
</article>`;
}

/* ── Cell-table datasets (§4 / §6 / support) ──────────────────────── */
/* Each cell renders its real content (role chips, RACI badges, document
   links) and is edited in place — no raw HTML is shown to the user. */
function _renderAuxSection(ds){
  var def = AUX[ds.key];
  var rows = _auxRows(ds.key);
  var head = _lang === 'en' ? def.headEn : def.headVi;
  var cols = head.length;

  var thead = '<tr><th class="rc-rownum">#</th>';
  head.forEach(function(h){ thead += '<th>' + _esc(h) + '</th>'; });
  thead += '</tr>';

  var bodyRows = rows.map(function(row, ri){
    var cells = Array.isArray(row.cells) ? row.cells : [];
    var tds = '<td class="rc-rownum">' + (ri + 1) + '</td>';
    for(var ci = 0; ci < cols; ci++){
      var val = cells[ci] == null ? '' : String(cells[ci]);
      tds += '<td class="rc-doccell"><div class="rc-cell" contenteditable="true" spellcheck="false"'
        + ' data-ph="' + _t('Trống', 'Empty') + '"'
        + ' oninput="_rmEditAux(\'' + ds.key + '\',' + ri + ',' + ci + ',this)">'
        + val + '</div></td>';
    }
    return '<tr>' + tds + '</tr>';
  }).join('');
  if(!rows.length){
    bodyRows = '<tr><td colspan="' + (cols + 1) + '" class="rc-empty">'
      + _t('Chưa có dòng nào.', 'No rows yet.') + '</td></tr>';
  }

  return `
  <div class="rc-panel">
    <div class="rc-panel-head">
      <b>${_t(ds.vi, ds.en)} — ${_esc(ds.sync)}</b>
      <span>${_t(ds.descVi, ds.descEn)} — ${_t('bấm vào ô bất kỳ để sửa trực tiếp.', 'click any cell to edit it in place.')}</span>
    </div>
    <div class="rc-scroll">
      <table class="rc-table rc-doc">
        <thead>${thead}</thead>
        <tbody>${bodyRows}</tbody>
      </table>
    </div>
    <div class="rc-note">${_t('Mỗi ô hiển thị nội dung thật (mã vai trò, nhãn RACI, liên kết tài liệu) và sửa được ngay tại chỗ. Khi lưu, số dòng và số cột phải giữ nguyên; mã script bị loại bỏ.', 'Each cell shows its real content and is edited in place. On save the row and column counts must stay unchanged; scripts are stripped.')}</div>
  </div>`;
}

/* ── Document-keyed datasets (JD interface / SOP §4 roles) ────────── */
/* The captured table renders exactly as in the source document and is
   edited in place; raw HTML stays behind an optional advanced panel. */
function _renderDocMapSection(ds){
  var dm = DOCMAP[ds.key];
  var map = _docMap(ds.key);
  var slugs = _docSlugs(ds.key);
  if(!slugs.length){
    return `<div class="rc-panel"><div class="rc-panel-head"><b>${_t(ds.vi, ds.en)}</b>
      <span>${_t('Chưa có tài liệu nào.', 'No documents captured.')}</span></div></div>`;
  }
  var activeKey = dm.active;
  if(slugs.indexOf(_state[activeKey]) < 0){ _state[activeKey] = slugs[0]; }
  var slug = _state[activeKey];
  var entry = map[slug] || { title: slug, html: '' };
  var html = entry.html == null ? '' : String(entry.html);
  var idx = slugs.indexOf(slug);

  var options = slugs.map(function(s){
    var t = (map[s] && map[s].title) ? map[s].title : s;
    return '<option value="' + _esc(s) + '"' + (s === slug ? ' selected' : '') + '>'
      + _esc(t) + '  ·  ' + _esc(s) + '</option>';
  }).join('');

  var prev = slugs[(idx - 1 + slugs.length) % slugs.length];
  var next = slugs[(idx + 1) % slugs.length];

  return `
  <div class="rc-panel">
    <div class="rc-panel-head">
      <b>${_t(ds.vi, ds.en)} — ${_esc(ds.sync)}</b>
      <span>${_t(ds.descVi, ds.descEn)} — ${_t('bấm vào bảng để sửa trực tiếp.', 'click inside the table to edit it in place.')}</span>
    </div>
    <div class="rc-doc-bar">
      <label>${_t(dm.labelVi, dm.labelEn)}</label>
      <select class="rc-doc-select" onchange="_rmSetDocSel('${ds.key}',this.value)">${options}</select>
      <span class="rc-doc-count">${idx + 1} / ${slugs.length}</span>
      <button class="rc-btn rc-btn-sm" type="button" onclick="_rmSetDocSel('${ds.key}','${_esc(prev)}')">‹</button>
      <button class="rc-btn rc-btn-sm" type="button" onclick="_rmSetDocSel('${ds.key}','${_esc(next)}')">›</button>
    </div>
    <div class="rc-doc-body">
      <div class="rc-render" contenteditable="true" spellcheck="false"
        oninput="_rmEditDoc('${ds.key}','${_esc(slug)}',this)">${html}</div>
      <details class="rc-adv">
        <summary>${_t('Sửa HTML nâng cao', 'Advanced HTML editing')}</summary>
        <textarea class="rc-doc-html" spellcheck="false"
          onchange="_rmSetDocHtml('${ds.key}','${_esc(slug)}',this.value);_rmRerender()">${_esc(html)}</textarea>
      </details>
    </div>
    <div class="rc-note">${_t('Bảng hiển thị đúng như trong tài liệu gốc và sửa được ngay tại chỗ. Khi lưu, mã script bị loại bỏ; bảng được ghi lại vào vùng quản lý của tài liệu tương ứng.', 'The table renders exactly as in the source document and is edited in place. On save scripts are stripped and the table is written back into its managed region.')}</div>
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
      ? `<a class="rc-doc-open" href="${_esc(href)}" target="_blank" rel="noopener">${_t('Mở', 'Open')} ↗</a>`
      : `<span class="rc-doc-open none">—</span>`;
    return `
    <div class="rc-link">
      <div class="rc-link-main">
        <span class="rc-link-code">${_esc(d.code)}</span>
        <span class="rc-link-title">${_esc(d.title)}</span>
      </div>
      <span class="rc-link-rel rel-${_esc(meta.cls)}">${_esc(_t(meta.vi, meta.en))}</span>
      ${link}
    </div>`;
  }).join('');
  return `
  <details class="rc-links" open>
    <summary>${_t('Tài liệu liên quan trong hệ sinh thái RACI', 'Linked documents in the RACI ecosystem')} (${docs.length})</summary>
    <div class="rc-links-note">${_t('Lưu ở Console này tái tạo các vùng RACI của ANNEX-121 và các tài liệu JD / SOP nhúng; sidebar “Thẩm quyền &amp; RACI” trên mọi tài liệu đọc ANNEX-121 nên tự phản ánh thay đổi.', 'Saving here regenerates the ANNEX-121 RACI regions and the embedded JD / SOP documents; the “Authority &amp; RACI” sidebar reads ANNEX-121 so it reflects changes live.')}</div>
    <div class="rc-links-list">${rows}</div>
  </details>`;
}

/* ── Styles (Graphics Authority tokens) ───────────────────────────── */
function _styleBlock(){
  return `<style>
  .raci-console{display:flex;flex-direction:column;gap:16px;color:var(--text-1)}
  .raci-console *{box-sizing:border-box}
  .rc-head{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;padding:20px 22px;border:1px solid var(--border);border-radius:12px;background:linear-gradient(180deg,var(--surface),var(--surface-2))}
  .rc-eyebrow{font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase;color:var(--accent)}
  .rc-head h2{margin:4px 0 0;font-size:24px;line-height:1.15}
  .rc-head p{margin:8px 0 0;color:var(--text-2);max-width:920px;line-height:1.55;font-size:13px}
  .rc-actions{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;flex:0 0 auto}
  .rc-btn{border:1px solid var(--border);background:var(--surface);color:var(--text-1);border-radius:8px;padding:9px 14px;font-weight:700;font-size:13px;cursor:pointer;transition:border-color .12s,background .12s}
  .rc-btn:hover{border-color:var(--accent)}
  .rc-btn.primary{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast)}
  .rc-btn.primary:hover{filter:brightness(1.06)}
  .rc-btn:disabled{opacity:.46;cursor:not-allowed}
  .rc-btn-sm{padding:6px 11px;font-size:15px;line-height:1}
  .rc-alert{border:1px solid var(--border);border-radius:9px;padding:11px 14px;background:var(--surface);color:var(--text-2);font-size:13px}
  .rc-alert[hidden]{display:none}
  .rc-alert.error{border-color:var(--danger);color:var(--danger)}
  .rc-alert.ok{border-color:var(--success);color:var(--success)}
  .rc-field label{display:block;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:var(--text-2);margin-bottom:5px}
  .rc-reason{width:100%;min-height:54px;border:1px solid var(--border);border-radius:9px;background:var(--surface);color:var(--text-1);padding:10px 12px;font:inherit;font-size:13px;resize:vertical}
  .rc-reason:focus{border-color:var(--accent);outline:none}
  /* statbar */
  .rc-statbar{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
  .rc-stat{border:1px solid var(--border);border-radius:11px;background:var(--surface);padding:14px 16px;display:flex;flex-direction:column;gap:3px}
  .rc-stat-v{font-size:26px;font-weight:800;color:var(--accent);line-height:1.05}
  .rc-stat-v.sm{font-size:16px;color:var(--text-1)}
  .rc-stat-l{font-size:12px;color:var(--text-2);font-weight:600}
  /* section caption */
  .rc-section-cap{padding:2px 2px 0}
  .rc-section-cap b{display:block;font-size:15px}
  .rc-section-cap span{display:block;margin-top:3px;color:var(--text-2);font-size:12.5px}
  /* tiles */
  .rc-tiles{display:grid;grid-template-columns:repeat(auto-fill,minmax(290px,1fr));gap:14px}
  .rc-tile{display:flex;flex-direction:column;gap:9px;text-align:left;border:1px solid var(--border);border-radius:12px;background:var(--surface);padding:16px;cursor:pointer;transition:transform .12s,border-color .12s,box-shadow .12s;color:var(--text-1)}
  .rc-tile:hover{transform:translateY(-2px);border-color:var(--accent);box-shadow:0 6px 20px -12px var(--accent)}
  .rc-tile-top{display:flex;justify-content:space-between;align-items:flex-start}
  .rc-badge{display:inline-flex;align-items:center;justify-content:center;min-width:42px;height:30px;padding:0 8px;border-radius:8px;font-weight:800;font-size:13px;background:var(--surface-2);color:var(--text-2);border:1px solid var(--border)}
  .rc-badge--gate{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent)}
  .rc-badge--aux{color:var(--accent);border-color:var(--accent)}
  .rc-badge--docmap{color:var(--success);border-color:var(--success)}
  .rc-tile-count{font-size:23px;font-weight:800;color:var(--text-1);display:flex;align-items:baseline;gap:4px}
  .rc-tile-count small{font-size:11px;font-weight:700;color:var(--text-2)}
  .rc-tile-name{font-size:15px;font-weight:800}
  .rc-tile-desc{font-size:12.5px;color:var(--text-2);line-height:1.5;flex:1 1 auto}
  .rc-tile-foot{display:flex;justify-content:space-between;align-items:center;padding-top:9px;border-top:1px solid var(--border)}
  .rc-sync{font-size:11px;font-weight:700;color:var(--text-2)}
  .rc-tile-go{font-size:12px;font-weight:800;color:var(--accent)}
  /* nav */
  .rc-nav{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px;border:1px solid var(--border);border-radius:11px;background:var(--surface)}
  .rc-back{border:1px solid var(--border);background:var(--surface-2);color:var(--text-1);border-radius:8px;padding:8px 13px;font-weight:800;font-size:12.5px;cursor:pointer;white-space:nowrap}
  .rc-back:hover{border-color:var(--accent)}
  .rc-pills{display:flex;flex-wrap:wrap;gap:6px;flex:1 1 auto}
  .rc-pill{display:inline-flex;align-items:center;gap:6px;border:1px solid var(--border);background:var(--surface-2);color:var(--text-2);border-radius:999px;padding:6px 12px;font-weight:700;font-size:12px;cursor:pointer}
  .rc-pill:hover{border-color:var(--accent)}
  .rc-pill.active{background:var(--accent);border-color:var(--accent);color:var(--accent-contrast)}
  .rc-pill-code{font-weight:800;font-size:11px;opacity:.85}
  /* panel */
  .rc-panel{border:1px solid var(--border);border-radius:12px;background:var(--surface);overflow:hidden}
  .rc-panel-head{padding:14px 16px;border-bottom:1px solid var(--border);background:var(--surface-2)}
  .rc-panel-head b{display:block;font-size:14.5px}
  .rc-panel-head span{display:block;margin-top:3px;color:var(--text-2);font-size:12.5px;line-height:1.5}
  .rc-note{padding:10px 16px;color:var(--text-2);font-size:11.5px;line-height:1.55;border-top:1px solid var(--border);background:var(--surface-2)}
  .rc-empty{padding:18px;color:var(--text-2);text-align:center}
  /* gate workbench */
  .rc-workbench{display:grid;grid-template-columns:210px minmax(0,1fr);gap:14px;padding:14px}
  .rc-sidebar{position:sticky;top:12px;border:1px solid var(--border);border-radius:10px;background:var(--surface-2);padding:11px;max-height:calc(100vh - 130px);overflow:auto}
  .rc-sidebar-head{font-size:11px;font-weight:800;letter-spacing:.05em;text-transform:uppercase;color:var(--text-2);padding-bottom:9px;border-bottom:1px solid var(--border);margin-bottom:9px}
  .rc-gate-list{display:flex;flex-direction:column;gap:6px}
  .rc-gate-btn{display:flex;justify-content:space-between;align-items:center;gap:8px;width:100%;text-align:left;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-1);padding:9px 11px;cursor:pointer;font-weight:700;font-size:13px}
  .rc-gate-btn b{color:var(--accent);font-size:12px}
  .rc-gate-btn.active{border-color:var(--accent);background:var(--surface-2)}
  .rc-editor{display:flex;flex-direction:column;gap:11px;min-width:0}
  .rm-card{border:1px solid var(--border);border-radius:10px;background:var(--surface-2);padding:13px;display:flex;flex-direction:column;gap:10px}
  .rm-card--invalid{border-color:var(--danger);box-shadow:inset 3px 0 0 var(--danger)}
  .rc-card-head{display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
  .rc-gate-tag{font-weight:800;font-size:11px;color:var(--accent-contrast);background:var(--accent);border-radius:5px;padding:3px 8px}
  .rc-cdr{font-weight:800;color:var(--accent)}
  .rc-flag{font-size:11px;font-weight:800;margin-left:auto}
  .rc-flag.bad{color:var(--danger)}
  .rc-flag.ok{color:var(--success)}
  .rc-activity{color:var(--text-1);font-size:13px;line-height:1.5}
  .rc-activity a{color:var(--accent)}
  .rc-role-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(92px,1fr));gap:7px}
  .rc-role{display:flex;flex-direction:column;gap:3px;border:1px solid var(--border);border-radius:7px;background:var(--surface);padding:6px 7px}
  .rc-role label{font-size:11px;font-weight:800;color:var(--text-2)}
  .rc-role select{border:1px solid var(--border);border-radius:6px;background:var(--surface);color:var(--text-1);font:inherit;font-weight:800;padding:4px}
  .rc-role select[data-val="A"]{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent)}
  .rc-role select[data-val="R"]{border-color:var(--accent);color:var(--accent)}
  .rc-role select[data-val="C"]{border-color:var(--warning,var(--accent))}
  .rc-role select[data-val="I"]{border-color:var(--success,var(--accent))}
  /* cell table — rendered, in-place editable */
  .rc-scroll{overflow:auto}
  table.rc-table{width:100%;border-collapse:collapse;font-size:12.5px}
  table.rc-table>thead>tr>th{background:var(--surface-2);color:var(--text-2);text-transform:uppercase;font-size:11px;letter-spacing:.03em;text-align:left;padding:9px 10px;border-bottom:2px solid var(--border);position:sticky;top:0;z-index:1}
  table.rc-table>tbody>tr>td{vertical-align:top;padding:0;border-bottom:1px solid var(--border);border-right:1px solid var(--border)}
  table.rc-table>tbody>tr>td:last-child{border-right:none}
  table.rc-table>tbody>tr:last-child>td{border-bottom:none}
  table.rc-table>tbody>tr:hover{background:var(--surface-2)}
  td.rc-rownum,th.rc-rownum{color:var(--text-2);font-weight:800;text-align:center;width:38px;padding:8px 6px;background:var(--surface-2)}
  .rc-cell{min-height:40px;padding:8px 10px;font-size:12.5px;line-height:1.6;color:var(--text-1);outline:none;border:2px solid transparent;border-radius:6px;transition:border-color .1s,background .1s}
  .rc-cell:hover{background:var(--surface-2)}
  .rc-cell:focus{border-color:var(--accent);background:var(--surface)}
  .rc-cell:empty::before{content:attr(data-ph);color:var(--text-2);font-style:italic;opacity:.6}
  /* doc map — rendered, in-place editable */
  .rc-doc-bar{display:flex;flex-wrap:wrap;gap:9px;align-items:center;padding:12px 16px;border-bottom:1px solid var(--border);background:var(--surface-2)}
  .rc-doc-bar label{font-size:11px;font-weight:800;text-transform:uppercase;color:var(--text-2)}
  .rc-doc-select{flex:1 1 300px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-1);font:inherit;font-weight:700;font-size:13px;padding:8px 10px}
  .rc-doc-count{font-size:12px;font-weight:800;color:var(--text-2)}
  .rc-doc-body{padding:14px 16px;display:flex;flex-direction:column;gap:12px}
  .rc-render{border:1px solid var(--border);border-radius:9px;padding:14px;background:var(--surface);outline:none;overflow:auto}
  .rc-render:focus{border-color:var(--accent);box-shadow:0 0 0 3px color-mix(in srgb,var(--accent) 16%,transparent)}
  .rc-adv{border:1px solid var(--border);border-radius:9px;background:var(--surface-2)}
  .rc-adv>summary{cursor:pointer;padding:9px 13px;font-weight:700;font-size:12px;color:var(--text-2);list-style:none}
  .rc-adv>summary::-webkit-details-marker{display:none}
  .rc-adv>summary::before{content:'▸ ';color:var(--text-2)}
  .rc-adv[open]>summary::before{content:'▾ '}
  .rc-doc-html{width:calc(100% - 24px);margin:0 12px 12px;min-height:200px;border:1px solid var(--border);border-radius:8px;background:var(--surface);color:var(--text-1);font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px;padding:10px 11px;resize:vertical;line-height:1.55}
  .rc-doc-html:focus{border-color:var(--accent);outline:none}
  /* rendered RACI content — role chips, badges, document links */
  .rc-cell table,.rc-render table{width:100%;border-collapse:collapse;font-size:12.5px;margin:0 0 8px}
  .rc-cell table:last-child,.rc-render table:last-child{margin-bottom:0}
  .rc-render .table-card{border:1px solid var(--border);border-radius:8px;overflow:hidden;margin-bottom:10px}
  .rc-render .table-card:last-child{margin-bottom:0}
  .rc-cell th,.rc-render th{background:var(--surface-2);color:var(--text-2);text-transform:uppercase;font-size:10.5px;letter-spacing:.03em;text-align:left;padding:7px 9px;border:1px solid var(--border)}
  .rc-cell td,.rc-render td{padding:7px 9px;border:1px solid var(--border);vertical-align:top;line-height:1.55}
  .rc-cell a,.rc-render a{color:var(--accent);text-decoration:none;cursor:text}
  .rc-cell .role-code,.rc-render .role-code,.rc-cell .entity-code,.rc-render .entity-code,
  .rc-cell .bundle-code,.rc-render .bundle-code{display:inline-block;padding:1px 7px;border-radius:5px;background:var(--surface-2);border:1px solid var(--border);font-weight:800;font-size:11px;color:var(--text-1);line-height:1.7}
  .rc-cell .bundle-chip .bundle-code,.rc-render .bundle-chip .bundle-code,
  .rc-cell .bundle-code,.rc-render .bundle-code{color:var(--accent);border-color:var(--accent)}
  .rc-cell .entity-sep,.rc-render .entity-sep,.rc-cell .role-sep,.rc-render .role-sep{color:var(--text-2);font-weight:700;margin:0 2px}
  .rc-cell .raci-badge,.rc-render .raci-badge{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:6px;font-weight:800;font-size:12px;border:1px solid var(--border)}
  .rc-cell .raci-badge.raci-a,.rc-render .raci-badge.raci-a,.rc-cell .raci-a,.rc-render .raci-a{background:var(--accent);color:var(--accent-contrast);border-color:var(--accent)}
  .rc-cell .raci-badge.raci-r,.rc-render .raci-badge.raci-r,.rc-cell .raci-r,.rc-render .raci-r{color:var(--accent);border-color:var(--accent)}
  .rc-cell .raci-badge.raci-c,.rc-render .raci-badge.raci-c{color:var(--warning,var(--text-1));border-color:var(--warning,var(--border))}
  .rc-cell .raci-badge.raci-i,.rc-render .raci-badge.raci-i{color:var(--success);border-color:var(--success)}
  .rc-cell .raci-cell,.rc-render .raci-cell{font-weight:800;text-align:center}
  .rc-render .auth-item{padding:4px 0;border-bottom:1px dashed var(--border)}
  .rc-render .note{color:var(--text-2);font-size:12px;font-style:italic}
  /* linked docs */
  .rc-links{border:1px solid var(--border);border-radius:12px;background:var(--surface)}
  .rc-links>summary{cursor:pointer;padding:14px 16px;font-weight:800;font-size:14px;list-style:none}
  .rc-links>summary::-webkit-details-marker{display:none}
  .rc-links>summary::before{content:'▸ ';color:var(--text-2)}
  .rc-links[open]>summary::before{content:'▾ '}
  .rc-links-note{padding:0 16px 10px;color:var(--text-2);font-size:12px;line-height:1.55}
  .rc-links-list{display:flex;flex-direction:column;border-top:1px solid var(--border)}
  .rc-link{display:flex;align-items:center;gap:10px;padding:10px 16px;border-bottom:1px solid var(--border)}
  .rc-link:last-child{border-bottom:none}
  .rc-link-main{flex:1 1 auto;min-width:0;display:flex;gap:8px;align-items:baseline;flex-wrap:wrap}
  .rc-link-code{font-weight:800;font-size:11px;color:var(--accent-contrast);background:var(--accent);border-radius:5px;padding:3px 8px;white-space:nowrap}
  .rc-link-title{color:var(--text-1);font-size:12.5px}
  .rc-link-rel{font-size:11px;font-weight:700;border-radius:6px;padding:3px 9px;white-space:nowrap;border:1px solid var(--border);color:var(--text-2)}
  .rc-link-rel.rel-ok{color:var(--success);border-color:var(--success)}
  .rc-link-rel.rel-warn{color:var(--warning,var(--accent));border-color:var(--warning,var(--accent))}
  .rc-doc-open{font-size:12px;font-weight:700;color:var(--accent);text-decoration:none;white-space:nowrap}
  .rc-doc-open.none{color:var(--text-2)}
  @media (max-width:1080px){
    .rc-head{flex-direction:column}
    .rc-statbar{grid-template-columns:repeat(2,minmax(0,1fr))}
    .rc-workbench{grid-template-columns:1fr}
    .rc-sidebar{position:static;max-height:none}
    .rc-gate-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr))}
    .rc-link{flex-wrap:wrap}
  }
  </style>`;
}

/* ── Globals ──────────────────────────────────────────────────────── */
window._rmReload = _load;
window._rmReset = _resetDraft;
window._rmSave = _save;
window._rmGo = _go;
window._rmRerender = _render;
window._rmSetRole = _setRole;
window._rmSetAuxCell = _setAuxCell;
window._rmEditAux = _editAuxCell;
window._rmEditDoc = _editDocBlob;
window._rmSetDocSel = _setDocSel;
window._rmSetDocHtml = _setDocHtml;
window._rmSetReason = _setReason;
window._rmSetGate = _setGate;

})();
