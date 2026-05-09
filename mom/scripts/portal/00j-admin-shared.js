/* ============================================================================
 * Admin Shared Component Library — window.AdminUI
 * ----------------------------------------------------------------------------
 * Single source of truth for all admin tab UI primitives. Used by:
 *   - 00g-admin-governance-tabs.js (Permission Catalog / SoD / Access Review)
 *   - 00h-admin-content-tabs.js (MFA / Effective Docs / Retention)
 *   - 00i-admin-permissions-tabs.js (Roles / Module Perms / Document Perms / Portal Display)
 *
 * Provides: i18n helper, escape, badge, KPI cards, sub-tabs, modal, drawer,
 * confirmable destructive action, toast, form builder, table builder, matrix
 * cell editor, runtime CRUD helpers (with row_version optimistic concurrency),
 * audit writer, RBAC privilege check.
 *
 * Backend stays English; frontend Vietnamese has full diacritics.
 * No hardcoded colors — everything via CSS vars from Graphics Authority.
 * ========================================================================== */

(function(){
  'use strict';
  if (window.AdminUI && window.AdminUI.__loaded) return;

  // ── i18n ────────────────────────────────────────────────────────────────────
  function isEn(){ return (typeof window.lang === 'string' && window.lang === 'en'); }
  function t(en, vi){ return isEn() ? en : (vi || en); }

  // ── Escape ──────────────────────────────────────────────────────────────────
  function escapeHtml(s){
    s = String(s == null ? '' : s);
    return s.replace(/[&<>"']/g, function(c){
      return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];
    });
  }
  function escapeAttr(s){ return escapeHtml(s).replace(/`/g,'&#96;'); }

  // ── Badge ───────────────────────────────────────────────────────────────────
  var BADGE_PALETTE = {
    block: { bg:'var(--red-light, #fee2e2)',    fg:'var(--red-dark, #991b1b)' },
    warn:  { bg:'var(--yellow-light, #fef3c7)', fg:'var(--yellow-dark, #92400e)' },
    info:  { bg:'var(--blue-light, #dbeafe)',   fg:'var(--blue-dark, #1e40af)' },
    ok:    { bg:'var(--green-light, #dcfce7)',  fg:'var(--green-dark, #166534)' },
    muted: { bg:'var(--gray-100, #f3f4f6)',     fg:'var(--text-2, #4b5563)' },
    accent:{ bg:'var(--brand-tint, #eef2ff)',   fg:'var(--brand-primary, #4f46e5)' }
  };
  function badge(label, tone){
    var p = BADGE_PALETTE[tone || 'muted'] || BADGE_PALETTE.muted;
    return '<span class="hm-badge" style="display:inline-block;padding:2px 8px;border-radius:9999px;font-size:11px;font-weight:600;background:'+p.bg+';color:'+p.fg+';white-space:nowrap">'+escapeHtml(label)+'</span>';
  }

  // ── Loading / Empty / Error ─────────────────────────────────────────────────
  function loadingHtml(){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)">'
      + '<div style="font-size:24px;margin-bottom:8px">⏳</div>'
      + escapeHtml(t('Loading…','Đang tải…'))
      + '</div>';
  }
  function emptyHtml(msg){
    return '<div class="hm-empty" style="padding:40px;text-align:center;color:var(--text-3)">'
      + '<div style="font-size:32px;margin-bottom:8px">∅</div>'
      + escapeHtml(msg || t('No data','Không có dữ liệu'))
      + '</div>';
  }
  function errorHtml(detail, retryFn){
    var retryAttr = '';
    if (typeof retryFn === 'function'){
      var tok = '__adminUiRetry_' + Math.random().toString(36).slice(2,10);
      window[tok] = function(){ try{ retryFn(); } finally { try{ delete window[tok]; }catch(e){} } };
      retryAttr = ' onclick="'+tok+'()"';
    }
    return '<div class="hm-empty" style="padding:40px;text-align:center">'
      + '<div style="font-size:32px;margin-bottom:8px;color:var(--red-dark,#991b1b)">⚠</div>'
      + '<div style="color:var(--text-1);margin-bottom:8px">'+escapeHtml(t('Failed to load','Không tải được'))+'</div>'
      + '<div style="font-size:12px;color:var(--text-3);margin-bottom:16px">'+escapeHtml(String(detail || ''))+'</div>'
      + (retryFn ? '<button class="btn-admin secondary"'+retryAttr+'>🔄 '+escapeHtml(t('Retry','Thử lại'))+'</button>' : '')
      + '</div>';
  }

  // ── Panel header & KPI cards ────────────────────────────────────────────────
  function panelHeader(title, subtitle, actionsHtml){
    return '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:16px;flex-wrap:wrap">'
      + '<div>'
      +   '<div style="font-size:18px;font-weight:600;color:var(--text-1)">'+escapeHtml(title)+'</div>'
      +   (subtitle ? '<div style="font-size:13px;color:var(--text-3);margin-top:2px">'+escapeHtml(subtitle)+'</div>' : '')
      + '</div>'
      + '<div style="display:flex;gap:8px;flex-wrap:wrap">'+(actionsHtml || '')+'</div>'
      + '</div>';
  }
  function kpiCard(label, value, hint, tone){
    var palette = BADGE_PALETTE[tone || 'muted'] || BADGE_PALETTE.muted;
    // Subtle gradient + accent bar gives a more polished look without breaking
    // the no-hardcode rule (all colours come through the palette CSS variables).
    return '<div style="position:relative;flex:1;min-width:160px;background:var(--surface-1,#fff);border:1px solid var(--border-1,#e5e7eb);border-radius:10px;padding:14px 16px;overflow:hidden;'
      + 'box-shadow:0 1px 2px rgba(0,0,0,0.04),0 1px 1px rgba(0,0,0,0.02)">'
      + '<div style="position:absolute;left:0;top:0;bottom:0;width:3px;background:'+palette.fg+'"></div>'
      + '<div style="font-size:11px;font-weight:600;letter-spacing:0.05em;text-transform:uppercase;color:var(--text-3)">'+escapeHtml(label)+'</div>'
      + '<div style="font-size:24px;font-weight:700;color:'+palette.fg+';margin-top:4px;line-height:1.15">'+escapeHtml(String(value))+'</div>'
      + (hint ? '<div style="font-size:11px;color:var(--text-3);margin-top:4px;line-height:1.4">'+escapeHtml(hint)+'</div>' : '')
      + '</div>';
  }
  function kpiRow(cards){
    return '<div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:16px">'+cards.join('')+'</div>';
  }

  // ── Sub-tabs ────────────────────────────────────────────────────────────────
  // tabs: [{ key, label, render(container, ctx) }]
  function renderSubTabs(rootEl, tabs, ctx, opts){
    opts = opts || {};
    var activeKey = opts.activeKey || (tabs[0] && tabs[0].key);
    var navHtml = '<div class="adminui-subtabs" style="display:flex;gap:4px;border-bottom:1px solid var(--border-1,#e5e7eb);margin-bottom:16px;overflow-x:auto;background:var(--surface-2,#f9fafb);padding:2px 4px 0;border-radius:8px 8px 0 0">';
    tabs.forEach(function(tab){
      var on = tab.key === activeKey;
      navHtml += '<button data-subtab="'+escapeAttr(tab.key)+'" '
        + 'style="padding:10px 16px;border:0;background:'+(on?'var(--surface-1,#fff)':'transparent')+';cursor:pointer;font-size:13px;font-weight:'+(on?'600':'500')+';'
        + 'color:'+(on?'var(--brand-primary,#4f46e5)':'var(--text-2,#4b5563)')+';'
        + 'border-bottom:3px solid '+(on?'var(--brand-primary,#4f46e5)':'transparent')+';white-space:nowrap;border-radius:6px 6px 0 0;transition:background 0.15s">'
        + escapeHtml(tab.label) + '</button>';
    });
    navHtml += '</div><div class="adminui-subtab-body"></div>';
    rootEl.innerHTML = navHtml;
    var bodyEl = rootEl.querySelector('.adminui-subtab-body');
    function activate(key){
      Array.prototype.forEach.call(rootEl.querySelectorAll('[data-subtab]'), function(b){
        var on = b.getAttribute('data-subtab') === key;
        b.style.color = on ? 'var(--brand-primary,#4f46e5)' : 'var(--text-2,#4b5563)';
        b.style.fontWeight = on ? '600' : '500';
        b.style.borderBottom = '2px solid '+(on ? 'var(--brand-primary,#4f46e5)' : 'transparent');
      });
      var tab = tabs.find(function(x){ return x.key === key; });
      if (!tab) return;
      bodyEl.innerHTML = loadingHtml();
      try { tab.render(bodyEl, ctx || {}); } catch (e){ bodyEl.innerHTML = errorHtml(e && e.message || e); }
    }
    Array.prototype.forEach.call(rootEl.querySelectorAll('[data-subtab]'), function(b){
      b.addEventListener('click', function(){ activate(b.getAttribute('data-subtab')); });
    });
    activate(activeKey);
  }

  // ── Modal ───────────────────────────────────────────────────────────────────
  // openModal({ title, bodyHtml | bodyEl, footerHtml, width, onClose })
  function openModal(opts){
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.className = 'adminui-modal-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.55);z-index:9999;'
      + 'display:flex;align-items:flex-start;justify-content:center;padding:60px 16px;overflow-y:auto;';
    var card = document.createElement('div');
    card.className = 'adminui-modal-card';
    card.style.cssText = 'background:var(--surface-1,#fff);border-radius:10px;'
      + 'box-shadow:0 25px 50px -12px rgba(0,0,0,0.45);width:'+(opts.width||'640px')+';max-width:100%;'
      + 'border:1px solid var(--border-1,#e5e7eb);overflow:hidden;display:flex;flex-direction:column;max-height:calc(100vh - 120px)';
    card.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-1,#e5e7eb)">'
      +   '<div style="font-size:15px;font-weight:600;color:var(--text-1)">'+escapeHtml(opts.title || '')+'</div>'
      +   '<button class="adminui-modal-close" aria-label="Close" style="border:0;background:transparent;font-size:22px;line-height:1;cursor:pointer;color:var(--text-3);padding:0 4px">×</button>'
      + '</div>'
      + '<div class="adminui-modal-body" style="padding:16px 18px;overflow-y:auto;flex:1"></div>'
      + '<div class="adminui-modal-footer" style="padding:12px 18px;border-top:1px solid var(--border-1,#e5e7eb);display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;background:var(--surface-2,#f9fafb)"></div>';
    var bodyEl = card.querySelector('.adminui-modal-body');
    var footerEl = card.querySelector('.adminui-modal-footer');
    if (opts.bodyEl) bodyEl.appendChild(opts.bodyEl);
    else bodyEl.innerHTML = opts.bodyHtml || '';
    if (opts.footerHtml) footerEl.innerHTML = opts.footerHtml;
    overlay.appendChild(card);
    document.body.appendChild(overlay);
    function close(){
      try { if (typeof opts.onClose === 'function') opts.onClose(); } catch(e){}
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    card.querySelector('.adminui-modal-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    document.addEventListener('keydown', function escListener(e){
      if (e.key === 'Escape'){ close(); document.removeEventListener('keydown', escListener); }
    });
    return { overlay: overlay, card: card, bodyEl: bodyEl, footerEl: footerEl, close: close };
  }

  // ── Drawer (right-side panel) ───────────────────────────────────────────────
  function openDrawer(opts){
    opts = opts || {};
    var overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;background:rgba(15,23,42,0.4);z-index:9990;display:flex;justify-content:flex-end';
    var panel = document.createElement('div');
    panel.style.cssText = 'background:var(--surface-1,#fff);width:'+(opts.width||'560px')+';max-width:100%;'
      + 'height:100%;border-left:1px solid var(--border-1,#e5e7eb);display:flex;flex-direction:column';
    panel.innerHTML = ''
      + '<div style="display:flex;align-items:center;justify-content:space-between;gap:12px;padding:14px 18px;border-bottom:1px solid var(--border-1,#e5e7eb)">'
      +   '<div style="font-size:15px;font-weight:600;color:var(--text-1)">'+escapeHtml(opts.title || '')+'</div>'
      +   '<button class="adminui-drawer-close" aria-label="Close" style="border:0;background:transparent;font-size:22px;cursor:pointer;color:var(--text-3)">×</button>'
      + '</div>'
      + '<div class="adminui-drawer-body" style="padding:14px 18px;overflow-y:auto;flex:1"></div>';
    var bodyEl = panel.querySelector('.adminui-drawer-body');
    if (opts.bodyEl) bodyEl.appendChild(opts.bodyEl);
    else bodyEl.innerHTML = opts.bodyHtml || '';
    overlay.appendChild(panel);
    document.body.appendChild(overlay);
    function close(){
      try { if (typeof opts.onClose === 'function') opts.onClose(); } catch(e){}
      if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
    }
    panel.querySelector('.adminui-drawer-close').addEventListener('click', close);
    overlay.addEventListener('click', function(e){ if (e.target === overlay) close(); });
    return { overlay: overlay, panel: panel, bodyEl: bodyEl, close: close };
  }

  // ── Toast ───────────────────────────────────────────────────────────────────
  function ensureToastHost(){
    var host = document.getElementById('adminui-toast-host');
    if (!host){
      host = document.createElement('div');
      host.id = 'adminui-toast-host';
      host.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:10001;display:flex;flex-direction:column;gap:8px;max-width:380px';
      document.body.appendChild(host);
    }
    return host;
  }
  function toast(msg, tone, ms){
    var host = ensureToastHost();
    var p = BADGE_PALETTE[tone || 'info'] || BADGE_PALETTE.info;
    var el = document.createElement('div');
    el.style.cssText = 'background:'+p.bg+';color:'+p.fg+';padding:10px 14px;border-radius:8px;'
      + 'box-shadow:0 4px 12px rgba(0,0,0,0.12);font-size:13px;font-weight:500;border:1px solid '+p.fg+'33';
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(function(){
      el.style.transition = 'opacity 0.3s';
      el.style.opacity = '0';
      setTimeout(function(){ if (el.parentNode) el.parentNode.removeChild(el); }, 300);
    }, ms || 3500);
  }

  // ── Confirm destructive ─────────────────────────────────────────────────────
  function confirmDestructive(opts){
    opts = opts || {};
    return new Promise(function(resolve){
      var bodyHtml = '<div style="font-size:13px;color:var(--text-2);line-height:1.6">'
        + escapeHtml(opts.message || t('Are you sure?','Bạn có chắc chắn?'))
        + '</div>';
      if (opts.requireText){
        bodyHtml += '<div style="margin-top:14px;font-size:12px;color:var(--text-3)">'
          + escapeHtml(t('Type ','Nhập '))+'<code style="background:var(--surface-2,#f9fafb);padding:1px 6px;border-radius:4px;border:1px solid var(--border-1,#e5e7eb)">'+escapeHtml(opts.requireText)+'</code>'
          + escapeHtml(t(' to confirm:',' để xác nhận:'))+'</div>'
          + '<input type="text" class="adminui-confirm-text" style="margin-top:6px;width:100%;padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px">';
      }
      if (opts.requireReason){
        bodyHtml += '<div style="margin-top:14px;font-size:12px;color:var(--text-3)">'+escapeHtml(t('Reason (audit log):','Lý do (ghi vào nhật ký):'))+'</div>'
          + '<textarea class="adminui-confirm-reason" rows="3" style="margin-top:6px;width:100%;padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;font-family:inherit"></textarea>';
      }
      var modal = openModal({
        title: opts.title || t('Confirm action','Xác nhận thao tác'),
        bodyHtml: bodyHtml,
        width: '500px',
        footerHtml: ''
          + '<button class="btn-admin secondary adminui-confirm-cancel">'+escapeHtml(t('Cancel','Huỷ'))+'</button>'
          + '<button class="btn-admin adminui-confirm-ok" style="background:var(--red-dark,#991b1b);color:#fff" disabled>'+escapeHtml(opts.confirmLabel || t('Confirm','Xác nhận'))+'</button>',
        onClose: function(){ resolve(null); }
      });
      var okBtn = modal.card.querySelector('.adminui-confirm-ok');
      var textInput = modal.card.querySelector('.adminui-confirm-text');
      var reasonInput = modal.card.querySelector('.adminui-confirm-reason');
      function validate(){
        var ok = true;
        if (opts.requireText && (!textInput || textInput.value.trim() !== opts.requireText)) ok = false;
        if (opts.requireReason && (!reasonInput || reasonInput.value.trim().length < 5)) ok = false;
        okBtn.disabled = !ok;
      }
      if (textInput) textInput.addEventListener('input', validate);
      if (reasonInput) reasonInput.addEventListener('input', validate);
      if (!opts.requireText && !opts.requireReason) okBtn.disabled = false;
      modal.card.querySelector('.adminui-confirm-cancel').addEventListener('click', function(){ modal.close(); });
      okBtn.addEventListener('click', function(){
        var result = { confirmed: true };
        if (opts.requireReason) result.reason = reasonInput.value.trim();
        modal.close();
        resolve(result);
      });
    });
  }

  // ── Form builder ────────────────────────────────────────────────────────────
  // fields: [{ key, label, type: 'text'|'textarea'|'number'|'select'|'checkbox'|'color'|'json',
  //            value, options:[{value,label}], required, placeholder, hint, disabled, min, max }]
  function buildForm(fields, initial){
    initial = initial || {};
    var formEl = document.createElement('form');
    formEl.className = 'adminui-form';
    formEl.style.cssText = 'display:flex;flex-direction:column;gap:14px';
    fields.forEach(function(f){
      var v = (initial[f.key] != null) ? initial[f.key] : (f.value != null ? f.value : '');
      var row = document.createElement('div');
      row.className = 'adminui-form-row';
      row.dataset.key = f.key;
      var labelHtml = '<label style="display:block;font-size:12px;font-weight:600;color:var(--text-2);margin-bottom:4px">'
        + escapeHtml(f.label) + (f.required ? ' <span style="color:var(--red-dark,#991b1b)">*</span>' : '') + '</label>';
      var inputHtml = '';
      var commonStyle = 'width:100%;padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;background:var(--surface-1,#fff);color:var(--text-1);font-family:inherit';
      if (f.type === 'textarea'){
        inputHtml = '<textarea name="'+escapeAttr(f.key)+'" rows="'+(f.rows||4)+'" '
          + (f.required?'required ':'') + (f.disabled?'disabled ':'')
          + (f.placeholder?'placeholder="'+escapeAttr(f.placeholder)+'" ':'')
          + 'style="'+commonStyle+'">'+escapeHtml(v)+'</textarea>';
      } else if (f.type === 'select'){
        inputHtml = '<select name="'+escapeAttr(f.key)+'" '+(f.required?'required ':'')+(f.disabled?'disabled ':'')+'style="'+commonStyle+'">';
        if (!f.required) inputHtml += '<option value="">'+escapeHtml(f.placeholder || t('— Select —','— Chọn —'))+'</option>';
        (f.options||[]).forEach(function(o){
          inputHtml += '<option value="'+escapeAttr(o.value)+'"'+(String(o.value)===String(v)?' selected':'')+'>'+escapeHtml(o.label)+'</option>';
        });
        inputHtml += '</select>';
      } else if (f.type === 'checkbox'){
        inputHtml = '<label style="display:flex;align-items:center;gap:8px;font-size:13px;color:var(--text-1)">'
          + '<input type="checkbox" name="'+escapeAttr(f.key)+'" '+(v?'checked ':'')+(f.disabled?'disabled ':'')+'>'
          + escapeHtml(f.checkboxLabel || f.hint || '')
          + '</label>';
      } else if (f.type === 'json'){
        var jsonStr = (typeof v === 'string') ? v : JSON.stringify(v||{}, null, 2);
        inputHtml = '<textarea name="'+escapeAttr(f.key)+'" rows="'+(f.rows||6)+'" '
          + (f.disabled?'disabled ':'')
          + 'style="'+commonStyle+';font-family:ui-monospace,SFMono-Regular,Menlo,monospace;font-size:12px">'
          + escapeHtml(jsonStr)+'</textarea>';
      } else if (f.type === 'color'){
        inputHtml = '<input type="text" name="'+escapeAttr(f.key)+'" value="'+escapeAttr(v)+'" '
          + (f.disabled?'disabled ':'')
          + 'placeholder="var(--brand-primary)" style="'+commonStyle+';font-family:ui-monospace,SFMono-Regular,Menlo,monospace">';
      } else {
        var inputType = (f.type === 'number') ? 'number' : (f.type === 'password' ? 'password' : 'text');
        inputHtml = '<input type="'+inputType+'" name="'+escapeAttr(f.key)+'" value="'+escapeAttr(v)+'" '
          + (f.required?'required ':'') + (f.disabled?'disabled ':'')
          + (f.placeholder?'placeholder="'+escapeAttr(f.placeholder)+'" ':'')
          + (f.min!=null?'min="'+f.min+'" ':'') + (f.max!=null?'max="'+f.max+'" ':'')
          + 'style="'+commonStyle+'">';
      }
      var hintHtml = (f.hint && f.type !== 'checkbox') ? '<div style="font-size:11px;color:var(--text-3);margin-top:3px">'+escapeHtml(f.hint)+'</div>' : '';
      row.innerHTML = (f.type === 'checkbox') ? (labelHtml + inputHtml + hintHtml) : (labelHtml + inputHtml + hintHtml);
      formEl.appendChild(row);
    });
    function getValues(){
      var out = {};
      fields.forEach(function(f){
        var el = formEl.querySelector('[name="'+f.key+'"]');
        if (!el) return;
        if (f.type === 'checkbox') out[f.key] = !!el.checked;
        else if (f.type === 'number') out[f.key] = el.value === '' ? null : Number(el.value);
        else if (f.type === 'json'){
          try { out[f.key] = el.value.trim() === '' ? null : JSON.parse(el.value); }
          catch(e){ out.__jsonError = (out.__jsonError||[]).concat([f.key+': '+e.message]); out[f.key] = el.value; }
        } else out[f.key] = el.value;
      });
      return out;
    }
    function setError(key, msg){
      var row = formEl.querySelector('.adminui-form-row[data-key="'+key+'"]');
      if (!row) return;
      var existing = row.querySelector('.adminui-form-error');
      if (existing) existing.remove();
      if (msg){
        var err = document.createElement('div');
        err.className = 'adminui-form-error';
        err.style.cssText = 'font-size:11px;color:var(--red-dark,#991b1b);margin-top:3px';
        err.textContent = msg;
        row.appendChild(err);
      }
    }
    function clearErrors(){
      Array.prototype.forEach.call(formEl.querySelectorAll('.adminui-form-error'), function(e){ e.remove(); });
    }
    return { el: formEl, getValues: getValues, setError: setError, clearErrors: clearErrors };
  }

  // ── Table builder ───────────────────────────────────────────────────────────
  // columns: [{ key, label, render(row) -> html, width, sortable }]
  function buildTable(columns, rows, opts){
    opts = opts || {};
    var thead = '<thead><tr>';
    columns.forEach(function(c){
      thead += '<th style="text-align:left;padding:8px 10px;font-size:11px;font-weight:600;color:var(--text-3);'
        + 'text-transform:uppercase;letter-spacing:0.04em;border-bottom:1px solid var(--border-1,#e5e7eb);'
        + 'background:var(--surface-2,#f9fafb);position:sticky;top:0;z-index:1'
        + (c.width ? ';width:'+c.width : '') + '">' + escapeHtml(c.label) + '</th>';
    });
    thead += '</tr></thead>';
    var tbody = '<tbody>';
    if (!rows || !rows.length){
      tbody += '<tr><td colspan="'+columns.length+'" style="padding:32px;text-align:center;color:var(--text-3);font-size:13px">'
        + escapeHtml(opts.emptyMessage || t('No data','Không có dữ liệu')) + '</td></tr>';
    } else {
      rows.forEach(function(row, idx){
        var rowKey = (opts.rowKey && row[opts.rowKey]) ? String(row[opts.rowKey]) : String(idx);
        var clickable = !!opts.onRowClick;
        tbody += '<tr data-row-key="'+escapeAttr(rowKey)+'"'
          + (clickable?' style="cursor:pointer" class="adminui-table-row-clickable"':'')+'>';
        columns.forEach(function(c){
          var content = (typeof c.render === 'function') ? c.render(row) : escapeHtml(row[c.key] == null ? '' : row[c.key]);
          tbody += '<td style="padding:8px 10px;font-size:13px;color:var(--text-1);border-bottom:1px solid var(--border-1,#e5e7eb);vertical-align:top">'+content+'</td>';
        });
        tbody += '</tr>';
      });
    }
    tbody += '</tbody>';
    var html = '<div style="border:1px solid var(--border-1,#e5e7eb);border-radius:8px;overflow:auto;max-height:'+(opts.maxHeight||'560px')+';background:var(--surface-1,#fff)">'
      + '<table class="adminui-table" style="width:100%;border-collapse:collapse">'+thead+tbody+'</table></div>';
    var wrap = document.createElement('div');
    wrap.innerHTML = html;
    if (opts.onRowClick){
      Array.prototype.forEach.call(wrap.querySelectorAll('.adminui-table-row-clickable'), function(tr){
        tr.addEventListener('mouseenter', function(){ tr.style.background = 'var(--surface-2,#f9fafb)'; });
        tr.addEventListener('mouseleave', function(){ tr.style.background = ''; });
        tr.addEventListener('click', function(){
          var key = tr.getAttribute('data-row-key');
          var row = rows.find(function(r, i){
            return (opts.rowKey ? String(r[opts.rowKey]) : String(i)) === key;
          });
          if (row) opts.onRowClick(row, tr);
        });
      });
    }
    return wrap.firstChild;
  }

  // ── Matrix cell editor (V/C/U/D/A/X dot grid with click-to-toggle) ─────────
  // dots: [{ flag, on, label }]
  function matrixCell(dots, opts){
    opts = opts || {};
    var html = '<div class="adminui-matrix-cell" style="display:inline-flex;gap:3px;padding:2px;'
      + 'border-radius:4px"'+(opts.dataAttrs||'')+'>';
    dots.forEach(function(d){
      var color = d.on
        ? (d.flag === 'A' ? 'var(--red-dark,#991b1b)' : (d.flag === 'X' ? 'var(--text-3,#9ca3af)' : 'var(--brand-primary,#4f46e5)'))
        : 'var(--gray-200,#e5e7eb)';
      var border = d.on ? color : 'var(--border-1,#e5e7eb)';
      var size = '14px';
      var fontStyle = d.on ? '600' : '500';
      var textColor = d.on ? '#fff' : 'var(--text-3,#9ca3af)';
      html += '<button type="button" class="adminui-matrix-dot" '
        + 'data-flag="'+escapeAttr(d.flag)+'" data-on="'+(d.on?'1':'0')+'" '
        + 'title="'+escapeAttr(d.label || d.flag)+'" '
        + 'style="width:'+size+';height:'+size+';border-radius:3px;border:1px solid '+border+';background:'+color+';'
        + 'color:'+textColor+';font-size:9px;font-weight:'+fontStyle+';line-height:1;cursor:'+(opts.editable?'pointer':'default')+';padding:0">'
        + escapeHtml(d.flag) + '</button>';
    });
    html += '</div>';
    return html;
  }

  // ── Runtime CRUD helpers ────────────────────────────────────────────────────
  // Wraps /api/v1/runtime/{domain}/{table} with row_version optimistic concurrency.
  function runtimeBase(domain, table){ return '/api/v1/runtime/'+encodeURIComponent(domain)+'/'+encodeURIComponent(table); }
  function buildQuery(params){
    if (!params) return '';
    var parts = [];
    Object.keys(params).forEach(function(k){
      if (params[k] == null || params[k] === '') return;
      parts.push(encodeURIComponent(k)+'='+encodeURIComponent(params[k]));
    });
    return parts.length ? '?'+parts.join('&') : '';
  }
  function fetchJson(url, opts){
    opts = opts || {};
    opts.headers = opts.headers || {};
    opts.headers['Accept'] = 'application/json';
    if (opts.body && typeof opts.body !== 'string'){
      opts.body = JSON.stringify(opts.body);
      opts.headers['Content-Type'] = 'application/json';
    }
    // Attach CSRF token for non-GET. Legacy 02-state-auth-ui.js exposes it
    // on window.csrfToken after the auth handshake. Without this every PUT/
    // POST/DELETE on /api/v1/runtime/* returns 403 csrf_failed.
    var method = (opts.method || 'GET').toUpperCase();
    if (method !== 'GET' && method !== 'HEAD'){
      var tok = window.csrfToken || (window.AppState && window.AppState.csrfToken);
      if (tok && !opts.headers['X-CSRF-Token']) opts.headers['X-CSRF-Token'] = tok;
    }
    opts.credentials = opts.credentials || 'same-origin';
    return fetch(url, opts).then(function(r){
      var ct = r.headers.get('content-type') || '';
      var p = ct.indexOf('application/json') >= 0 ? r.json() : r.text();
      return p.then(function(body){
        if (!r.ok){
          var err = new Error((body && body.error && body.error.message) || (body && body.message) || ('HTTP '+r.status));
          err.status = r.status;
          err.body = body;
          throw err;
        }
        return body;
      });
    });
  }
  // Normalise list responses across the various runtime/REST shapes:
  //   GenericCrudController: { ok, records: [...] }
  //   Some endpoints:        { data: [...] }
  //   Bare arrays:            [...]
  // Always returns { data: array, total, raw } so call sites can rely on `.data`.
  function normaliseList(r){
    if (Array.isArray(r)) return { data: r, total: r.length, raw: r };
    if (r && Array.isArray(r.records)) return { data: r.records, total: r.total != null ? r.total : r.records.length, raw: r };
    if (r && Array.isArray(r.data)) return { data: r.data, total: r.total != null ? r.total : r.data.length, raw: r };
    if (r && Array.isArray(r.rows)) return { data: r.rows, total: r.total != null ? r.total : r.rows.length, raw: r };
    return { data: [], total: 0, raw: r };
  }
  var runtime = {
    list: function(domain, table, params){ return fetchJson(runtimeBase(domain,table)+buildQuery(params)).then(normaliseList); },
    get: function(domain, table, id){ return fetchJson(runtimeBase(domain,table)+'/'+encodeURIComponent(id)); },
    create: function(domain, table, payload){
      return fetchJson(runtimeBase(domain,table), { method:'POST', body: payload });
    },
    update: function(domain, table, id, payload, rowVersion){
      // GenericCrudController exposes PUT (not PATCH); honour optimistic concurrency
      // via If-Match header AND embedded row_version field for compatibility.
      var headers = {};
      if (rowVersion != null) {
        headers['If-Match'] = String(rowVersion);
        if (payload && typeof payload === 'object' && payload.row_version == null) payload.row_version = rowVersion;
      }
      return fetchJson(runtimeBase(domain,table)+'/'+encodeURIComponent(id), { method:'PUT', body: payload, headers: headers });
    },
    delete: function(domain, table, id, rowVersion){
      var headers = {};
      if (rowVersion != null) headers['If-Match'] = String(rowVersion);
      return fetchJson(runtimeBase(domain,table)+'/'+encodeURIComponent(id), { method:'DELETE', headers: headers });
    },
    upsert: function(domain, table, payload, keys){
      // attempt POST; if conflict (409 / unique) fall back to PATCH on first row found by keys
      return fetchJson(runtimeBase(domain,table), { method:'POST', body: payload }).catch(function(err){
        if (!keys) throw err;
        var q = {};
        Object.keys(keys).forEach(function(k){ q['filter['+k+']'] = keys[k]; });
        return fetchJson(runtimeBase(domain,table)+buildQuery(q)).then(function(list){
          var first = (list && list.data && list.data[0]) || (list && list[0]);
          if (!first) throw err;
          return fetchJson(runtimeBase(domain,table)+'/'+encodeURIComponent(first.id || first.code || ''), {
            method:'PATCH', body: payload,
            headers: first.row_version != null ? { 'If-Match': String(first.row_version) } : {}
          });
        });
      });
    }
  };

  // ── Audit writer (POST audit events for non-runtime workflow actions) ──────
  function audit(eventType, detail){
    return fetchJson('/api/v1/admin/audit/log', {
      method: 'POST',
      body: { event_type: eventType, detail: detail || {} }
    }).catch(function(err){
      // non-fatal
      console.warn('[AdminUI.audit]', eventType, err && err.message);
    });
  }

  // ── Privilege check (uses session) ──────────────────────────────────────────
  function hasPermission(permCode){
    try {
      var session = window.AppState && window.AppState.session;
      var perms = (session && session.permissions) || (window.appState && window.appState.permissions) || [];
      if (Array.isArray(perms)) return perms.indexOf(permCode) >= 0;
      if (perms && typeof perms === 'object') return !!perms[permCode];
    } catch(e){}
    return true; // fail-open in admin context; backend enforces hard
  }

  // ── Search / filter helpers ─────────────────────────────────────────────────
  function searchInput(opts){
    opts = opts || {};
    return '<input type="search" class="adminui-search" placeholder="'+escapeAttr(opts.placeholder || t('Search…','Tìm kiếm…'))+'" '
      + 'style="padding:8px 10px;border:1px solid var(--border-1,#e5e7eb);border-radius:6px;font-size:13px;min-width:220px;background:var(--surface-1,#fff)">';
  }
  function debounce(fn, ms){
    var timer; return function(){ var args=arguments,ctx=this; clearTimeout(timer); timer=setTimeout(function(){ fn.apply(ctx,args); }, ms||220); };
  }

  // ── Action button helpers ───────────────────────────────────────────────────
  function btn(label, opts){
    opts = opts || {};
    var attrs = '';
    if (opts.id) attrs += ' id="'+escapeAttr(opts.id)+'"';
    if (opts.dataAttrs) attrs += ' '+opts.dataAttrs;
    if (opts.disabled) attrs += ' disabled';
    var cls = 'btn-admin' + (opts.kind === 'secondary' ? ' secondary' : '');
    var style = '';
    if (opts.kind === 'danger'){ style += ';background:var(--red-dark,#991b1b);color:#fff;border-color:var(--red-dark,#991b1b)'; }
    if (opts.style) style += ';'+opts.style;
    return '<button type="button" class="'+cls+'"'+attrs+(style?' style="'+style.replace(/^;/,'')+'"':'')+'>'
      + (opts.icon ? '<span style="margin-right:4px">'+opts.icon+'</span>' : '')
      + escapeHtml(label) + '</button>';
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.AdminUI = {
    __loaded: true,
    t: t,
    isEn: isEn,
    escapeHtml: escapeHtml,
    escapeAttr: escapeAttr,
    badge: badge,
    loadingHtml: loadingHtml,
    emptyHtml: emptyHtml,
    errorHtml: errorHtml,
    panelHeader: panelHeader,
    kpiCard: kpiCard,
    kpiRow: kpiRow,
    renderSubTabs: renderSubTabs,
    openModal: openModal,
    openDrawer: openDrawer,
    toast: toast,
    confirmDestructive: confirmDestructive,
    buildForm: buildForm,
    buildTable: buildTable,
    matrixCell: matrixCell,
    runtime: runtime,
    fetchJson: fetchJson,
    audit: audit,
    hasPermission: hasPermission,
    searchInput: searchInput,
    debounce: debounce,
    btn: btn
  };
})();
