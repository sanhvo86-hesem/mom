(function(){
'use strict';

var state = { container:null, rows:[], selectedAllocationId:'', pending:null, files:[] };
var MAX_UPLOAD_BYTES = 50 * 1024 * 1024;
var REQUEST_TIMEOUT_MS = 45000;

function t(vi, en){ return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }
function esc(value){ var d=document.createElement('div'); d.appendChild(document.createTextNode(String(value == null ? '' : value))); return d.innerHTML; }
function toast(message, type){ if(typeof window._fhShowToast === 'function') return window._fhShowToast(message, type); if(window.console) console.log('[UploadVerify]', type || 'info', message); }
function formatSize(bytes){
  var size = Number(bytes || 0);
  if(!isFinite(size) || size <= 0) return '0 B';
  var units = ['B', 'KB', 'MB', 'GB'];
  var index = 0;
  while(size >= 1024 && index < units.length - 1){
    size = size / 1024;
    index++;
  }
  return new Intl.NumberFormat((typeof lang !== 'undefined' && lang === 'en') ? 'en-US' : 'vi-VN', {
    maximumFractionDigits: index === 0 ? 0 : 1
  }).format(size) + ' ' + units[index];
}
function withTimeout(promise, ms){
  return new Promise(function(resolve, reject){
    var timer = setTimeout(function(){ reject(new Error('timeout')); }, ms || REQUEST_TIMEOUT_MS);
    Promise.resolve(promise).then(function(value){
      clearTimeout(timer);
      resolve(value);
    }, function(error){
      clearTimeout(timer);
      reject(error);
    });
  });
}
function statusLabel(status){
  var key = String(status || '').trim().toLowerCase();
  var labels = {
    allocated: t('Đã cấp mã', 'Allocated'),
    downloaded: t('Đã tải biểu mẫu', 'Downloaded'),
    submitted: t('Đã nộp', 'Submitted'),
    received: t('Đã tiếp nhận', 'Received'),
    in_review: t('Đang xem xét', 'In review'),
    approved: t('Đã phê duyệt', 'Approved'),
    rejected: t('Bị từ chối', 'Rejected'),
    voided: t('Đã hủy', 'Voided'),
    void: t('Đã hủy', 'Voided')
  };
  return labels[key] || String(status || '-');
}
function renderStatusBadge(status){
  var key = String(status || '').trim().toLowerCase();
  var tone = key === 'approved' ? 'pass' : (key === 'rejected' || key === 'voided' || key === 'void' ? 'fail' : (key === 'submitted' || key === 'received' || key === 'in_review' ? 'warn' : 'pending'));
  return '<span class="uv2-badge ' + tone + '">' + esc(statusLabel(status)) + '</span>';
}
function ensureStyles(){
  if(document.getElementById('uv2-styles')) return;
  var style = document.createElement('style'); style.id = 'uv2-styles';
  style.textContent = [
    '.uv2-shell{display:grid;grid-template-columns:360px minmax(0,1fr);gap:18px;align-items:start}',
    '.uv2-card{background:#fff;border:1px solid #e2e8f0;border-radius:18px;box-shadow:0 10px 24px rgba(15,23,42,.05);padding:18px}',
    '.uv2-head{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap}.uv2-head h2{margin:0;font-size:18px;color:#0c2d48}.uv2-head p{margin:4px 0 0;font-size:12px;color:#64748b;line-height:1.6}',
    '.uv2-search,.uv2-dropzone{width:100%;border:1px solid #d1d5db;border-radius:14px;box-sizing:border-box}.uv2-search{padding:10px 12px;font-size:13px;font-family:inherit}.uv2-search:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
    '.uv2-list{display:grid;gap:10px;margin-top:14px;max-height:74vh;overflow:auto;padding-right:4px}.uv2-row{border:1px solid #e2e8f0;border-radius:16px;padding:14px;cursor:pointer;transition:all .16s;background:#fff}.uv2-row:hover{border-color:#93c5fd;box-shadow:0 8px 20px rgba(21,101,192,.08)}.uv2-row.active{border-color:#1565c0;background:#eff6ff;box-shadow:0 0 0 3px rgba(21,101,192,.08)}',
    '.uv2-record{font-family:Consolas,monospace;font-size:12px;font-weight:800;color:#0f172a}.uv2-meta{font-size:11px;color:#64748b;line-height:1.55;margin-top:8px}',
    '.uv2-dropzone{padding:28px 18px;border-style:dashed;background:#f8fafc;text-align:center;cursor:pointer;transition:all .16s}.uv2-dropzone.drag,.uv2-dropzone:focus{border-color:#1565c0;background:#eff6ff;outline:none;box-shadow:0 0 0 3px rgba(21,101,192,.12)}.uv2-dropzone strong{display:block;font-size:14px;color:#0c2d48}.uv2-dropzone p{margin:8px 0 0;font-size:12px;color:#64748b;line-height:1.65}',
    '.uv2-queue{display:grid;gap:12px;margin-top:16px}.uv2-file{border:1px solid #e2e8f0;border-radius:16px;padding:14px;background:#fff}.uv2-file-head{display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap}.uv2-file-name{font-size:13px;font-weight:800;color:#0f172a;word-break:break-word}.uv2-file-meta{font-size:11px;color:#64748b;line-height:1.5;margin-top:6px}.uv2-badge{display:inline-flex;align-items:center;gap:6px;padding:5px 10px;border-radius:999px;font-size:11px;font-weight:800}.uv2-badge.pass{background:#dcfce7;color:#166534}.uv2-badge.warn{background:#ffedd5;color:#c2410c}.uv2-badge.fail{background:#fee2e2;color:#b91c1c}.uv2-badge.pending{background:#e2e8f0;color:#334155}',
    '.uv2-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px;margin-top:12px}.uv2-cell{border:1px solid #e2e8f0;border-radius:12px;padding:10px 12px;background:#f8fafc}.uv2-cell small{display:block;font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#64748b;margin-bottom:5px}.uv2-cell strong{display:block;font-size:12px;color:#0f172a;line-height:1.45;word-break:break-word}',
    '.uv2-actions{display:flex;justify-content:flex-end;gap:10px;flex-wrap:wrap;margin-top:16px}.uv2-btn{height:42px;border:none;border-radius:12px;padding:0 16px;font-size:13px;font-weight:800;cursor:pointer;display:inline-flex;align-items:center;gap:8px}.uv2-btn.primary{background:#1565c0;color:#fff}.uv2-btn.secondary{background:#eef2f7;color:#334155}.uv2-btn.ghost{background:#fff;border:1px solid #d1d5db;color:#334155}',
    '.uv2-empty{padding:20px;border:1px dashed #cbd5e1;border-radius:16px;background:#f8fafc;text-align:center;color:#64748b;font-size:12px;line-height:1.6}.uv2-empty strong{display:block;color:#0c2d48;margin-bottom:4px}',
    '@media (max-width:1100px){.uv2-shell{grid-template-columns:1fr}}'
  ].join('\n'); document.head.appendChild(style);
}

function renderAllocation(allocation){
  var ctx = allocation.master_context || {};
  return '<article class="uv2-row' + (String(allocation.allocation_id || '') === String(state.selectedAllocationId || '') ? ' active' : '') + '" data-allocation-id="' + esc(allocation.allocation_id || '') + '"><div class="uv2-record">' + esc(allocation.record_id || '') + '</div><div class="uv2-meta">' + esc([allocation.form_code || '', allocation.department || '', ctx.customer_id || '', ctx.so_number || '', ctx.jo_number || '', ctx.wo_number || '', ctx.part_number || '', ctx.part_revision || ''].filter(Boolean).join(' · ')) + '</div><div class="uv2-meta">' + renderStatusBadge(allocation.status || 'allocated') + '</div></article>';
}

function renderFileItem(item){
  var verification = item.inspect && item.inspect.verification ? item.inspect.verification : { status:'pending', warnings:[], issues:[] };
  var status = verification.status || item.status || 'pending';
  var badgeClass = status === 'verified' ? 'pass' : (status === 'warning' ? 'warn' : (status === 'rejected' ? 'fail' : 'pending'));
  var allocation = item.inspect && item.inspect.allocation ? item.inspect.allocation : null;
  var metadata = item.inspect && item.inspect.metadata ? item.inspect.metadata : {};
  return '<div class="uv2-file" data-file-id="' + esc(item.id) + '"><div class="uv2-file-head"><div><div class="uv2-file-name">' + esc(item.file.name) + '</div><div class="uv2-file-meta">' + esc(formatSize(item.file.size)) + '</div></div><span class="uv2-badge ' + badgeClass + '">' + esc(status === 'verified' ? t('Hợp lệ', 'Verified') : status === 'warning' ? t('Cảnh báo', 'Warning') : status === 'rejected' ? t('Từ chối', 'Rejected') : t('Đang kiểm tra', 'Inspecting')) + '</span></div><div class="uv2-grid"><div class="uv2-cell"><small>' + esc(t('Mã hồ sơ', 'Record ID')) + '</small><strong>' + esc((allocation && allocation.record_id) || metadata.issued_record_id || '—') + '</strong></div><div class="uv2-cell"><small>' + esc(t('Biểu mẫu', 'Form')) + '</small><strong>' + esc(metadata.form_code || (allocation && allocation.form_code) || '—') + '</strong></div><div class="uv2-cell"><small>' + esc(t('Phiên bản mẫu', 'Template version')) + '</small><strong>' + esc(metadata.form_version || metadata.form_revision || (allocation && allocation.form_revision) || '—') + '</strong></div><div class="uv2-cell"><small>' + esc(t('Phiên nhận hiện tại', 'Current receipt')) + '</small><strong>' + esc(allocation && allocation.receipt_version ? ('R' + allocation.receipt_version) : t('Chưa có', 'None')) + '</strong></div></div>' + ((verification.warnings || []).length ? '<div class="uv2-file-meta" style="color:#c2410c">' + esc((verification.warnings || []).join(', ')) + '</div>' : '') + ((verification.issues || []).length ? '<div class="uv2-file-meta" style="color:#b91c1c">' + esc((verification.issues || []).join(', ')) + '</div>' : '') + '</div>';
}

function inspectFiles(files){
  Array.prototype.forEach.call(files, function(file){
    if(!/\.(xlsx|xlsm)$/i.test(file.name)){ toast(t('Màn hình kiểm tra tải lên chỉ nhận tệp Excel .xlsx hoặc .xlsm.', 'Upload verification currently accepts only .xlsx or .xlsm workbooks.'), 'warn'); return; }
    if(Number(file.size || 0) > MAX_UPLOAD_BYTES){
      toast(t('Tệp quá lớn. Giới hạn hiện tại là 50 MB.', 'File too large. Current limit is 50 MB.'), 'warn');
      return;
    }
    var item = { id:'uv-' + Math.random().toString(36).slice(2, 10), file:file, inspect:null, status:'pending' };
    state.files.push(item); render(state.container);
    var allocationId = state.selectedAllocationId || '';
    withTimeout(window.AllocationTracker.inspectUpload(file, allocationId), REQUEST_TIMEOUT_MS).then(function(resp){ item.inspect = resp; item.status = resp && resp.ok && resp.verification ? resp.verification.status : 'rejected'; if(resp && resp.allocation && resp.allocation.allocation_id && !state.selectedAllocationId){ state.selectedAllocationId = resp.allocation.allocation_id; } render(state.container); }).catch(function(err){ item.status = 'rejected'; if(err && err.message === 'timeout') toast(t('Kiểm tra tệp bị timeout. Hãy thử lại.', 'File inspection timed out. Please try again.'), 'error'); render(state.container); });
  });
}

function linkOrderIfPossible(allocation){ var ctx = allocation && allocation.master_context ? allocation.master_context : {}; var orderType = ctx.wo_number ? 'wo' : (ctx.jo_number ? 'jo' : (ctx.so_number ? 'so' : '')); var orderId = ctx.wo_number || ctx.jo_number || ctx.so_number || ''; if(!orderType || !orderId || !allocation.record_id) return; if(typeof apiCall === 'function') apiCall('order_link_form', { order_type: orderType, order_id: orderId, record_id: allocation.record_id }, 'POST').catch(function(){}); }

window._renderUploadVerify = function(schemas, entries, container){
  ensureStyles(); state.container = container; state.files = [];
  var pending = (window._fhState && window._fhState.pendingUploadSelection) ? window._fhState.pendingUploadSelection : null;
  if(pending && pending.allocationId) state.selectedAllocationId = pending.allocationId;
  if(window._fhState) window._fhState.pendingUploadSelection = null;
  window.AllocationTracker.getHistory({ delivery_mode:'offline', page_size:50 }).then(function(resp){
    state.rows = (resp && Array.isArray(resp.entries)) ? resp.entries : [];
    if(!state.selectedAllocationId && state.rows.length) state.selectedAllocationId = state.rows[0].allocation_id || '';
    render();
  }).catch(function(){ state.rows = []; render(); });

  function render(){
    container.innerHTML = '<div class="uv2-shell"><aside class="uv2-card"><div class="uv2-head"><div><h2>' + esc(t('Tải lên & Kiểm tra', 'Upload & Verify')) + '</h2><p>' + esc(t('Tab này chỉ tiếp nhận tệp Excel ngoại tuyến đã được hệ thống cấp phát. Hệ thống kiểm tra sheet ẩn, checksum, nhật ký cấp phát và lịch sử phiên nhận trước khi tiếp nhận.', 'This tab accepts only offline workbooks issued by the runtime. It verifies the hidden sheet, checksum, allocation log, and receipt history before receiving the file.')) + '</p></div></div><div class="uv2-list">' + (state.rows.length ? state.rows.map(renderAllocation).join('') : '<div class="uv2-empty"><strong>' + esc(t('Chưa có mã cấp phát ngoại tuyến', 'No offline allocation yet')) + '</strong>' + esc(t('Hãy cấp mã và tải biểu mẫu ngoại tuyến trước khi tải lên tệp Excel đã điền.', 'Allocate a record ID and download the offline form before uploading the completed workbook.')) + '</div>') + '</div></aside><section class="uv2-card"><div class="uv2-head"><div><h2>' + esc(t('Tiếp nhận tệp Excel đã điền', 'Receive completed workbook')) + '</h2><p>' + esc(t('Tệp Excel phải do hệ thống cấp phát. Việc chỉ đổi tên tệp bằng tay sẽ không vượt qua bước xác minh sheet ẩn.', 'The workbook must be issued by the system. Renaming a file manually is not enough to pass hidden-sheet verification.')) + '</p></div></div><label class="uv2-dropzone" id="uv2-dropzone" tabindex="0" role="button" aria-label="' + esc(t('Chọn tệp Excel ngoại tuyến để kiểm tra và tiếp nhận', 'Choose an offline workbook to inspect and receive')) + '"><input id="uv2-file-input" type="file" accept=".xlsx,.xlsm" multiple style="display:none"><strong>' + esc(t('Kéo thả tệp Excel vào đây hoặc nhấn để chọn', 'Drop the workbook here or click to browse')) + '</strong><p>' + esc(t('Chỉ nhận .xlsx / .xlsm đã được hệ thống cấp phát với siêu dữ liệu ẩn của HESEM.', 'Only .xlsx / .xlsm files issued by the runtime with HESEM hidden metadata are accepted.')) + '</p></label><div class="uv2-queue">' + (state.files.length ? state.files.map(renderFileItem).join('') : '<div class="uv2-empty"><strong>' + esc(t('Chưa có tệp nào được kiểm tra', 'No file has been inspected yet')) + '</strong>' + esc(t('Sau khi chọn tệp, hệ thống sẽ kiểm tra sheet ẩn và trạng thái mã cấp phát trước khi cho phép tiếp nhận.', 'After you select a file, the runtime verifies the hidden sheet and allocation state before allowing receipt.')) + '</div>') + '</div><div class="uv2-actions"><button type="button" class="uv2-btn secondary" id="uv2-clear">🧹 ' + esc(t('Xóa danh sách', 'Clear queue')) + '</button><button type="button" class="uv2-btn primary" id="uv2-submit-all">📥 ' + esc(t('Tiếp nhận các tệp hợp lệ', 'Receive valid files')) + '</button></div></section></div>';
    bind();
  }

  function bind(){
    Array.prototype.forEach.call(container.querySelectorAll('[data-allocation-id]'), function(node){ node.onclick = function(){ state.selectedAllocationId = node.getAttribute('data-allocation-id') || ''; render(); }; });
    var dropzone = document.getElementById('uv2-dropzone'); var input = document.getElementById('uv2-file-input');
    if(dropzone && input){
      dropzone.onclick = function(e){ if(e.target !== input) input.click(); };
      dropzone.onkeydown = function(e){ if(e.key === 'Enter' || e.key === ' '){ e.preventDefault(); input.click(); } };
      input.onchange = function(){ if(input.files && input.files.length) inspectFiles(input.files); input.value = ''; };
      dropzone.ondragover = function(e){ e.preventDefault(); dropzone.classList.add('drag'); };
      dropzone.ondragleave = function(){ dropzone.classList.remove('drag'); };
      dropzone.ondrop = function(e){ e.preventDefault(); dropzone.classList.remove('drag'); if(e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files.length) inspectFiles(e.dataTransfer.files); };
    }
    var clearBtn = document.getElementById('uv2-clear'); if(clearBtn) clearBtn.onclick = function(){ state.files = []; render(); };
    var submitAll = document.getElementById('uv2-submit-all'); if(submitAll) submitAll.onclick = function(){
      var valid = state.files.filter(function(item){ return item.inspect && item.inspect.ok && item.inspect.verification && item.inspect.verification.status !== 'rejected'; });
      if(!valid.length){ toast(t('Không có tệp Excel hợp lệ để tiếp nhận.', 'There is no valid workbook to receive.'), 'warn'); return; }
      submitAll.disabled = true;
      Promise.all(valid.map(function(item){
        var allocationId = (item.inspect && item.inspect.allocation && item.inspect.allocation.allocation_id) || state.selectedAllocationId || '';
        return withTimeout(window.AllocationTracker.receiveUpload(allocationId, item.file), REQUEST_TIMEOUT_MS).then(function(resp){ if(resp && resp.ok && resp.allocation) linkOrderIfPossible(resp.allocation); item.receive = resp; return resp; });
      })).then(function(){ toast(t('Đã tiếp nhận xong các tệp Excel hợp lệ.', 'All valid workbooks were received.'), 'success'); return window.AllocationTracker.getHistory({ delivery_mode:'offline', page_size:50 }); }).then(function(resp){ state.rows = (resp && Array.isArray(resp.entries)) ? resp.entries : state.rows; state.files = []; render(); }).catch(function(err){ toast(err && err.message === 'timeout' ? t('Tiếp nhận tệp Excel bị timeout. Hãy thử lại.', 'Workbook receipt timed out. Please retry.') : t('Không thể tiếp nhận tệp Excel.', 'Could not receive the workbook.'), 'error'); }).finally(function(){ submitAll.disabled = false; });
    };
  }
};

})();
