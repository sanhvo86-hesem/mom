/* ═══════════════════════════════════════════════════════════════════════════
   SidebarBlock — Reusable configurable sidebar block component
   Usage:
     SidebarBlock.define('my-block', { sections:[...] });
     SidebarBlock.render('my-block', containerEl, { editable: true });
     SidebarBlock.addItem('my-block','section-id',{ icon:'📋',label:'Title',route:'#page' });
   ═══════════════════════════════════════════════════════════════════════════ */
'use strict';
window.SidebarBlock = (function () {

  /* ── State ─────────────────────────────────────────────────────────────── */
  var _blocks = {};

  /* ── Utilities ─────────────────────────────────────────────────────────── */
  function esc(s) { return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function uid() { return 'sb' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5); }
  function deepClone(obj) { return JSON.parse(JSON.stringify(obj)); }

  /* ── HTML Rendering ────────────────────────────────────────────────────── */
  function _itemHtml(item, blockId, sectionId, editable) {
    var isActive = item.route && window.location.hash && window.location.hash.startsWith(item.route);
    var badge = item.badge ? '<span class="badge">' + esc(item.badge) + '</span>' : '';
    var clickAttr = item.route
      ? 'onclick="SidebarBlock._nav(\'' + esc(blockId) + '\',\'' + esc(item.id) + '\')"'
      : item.href ? 'onclick="window.open(\'' + esc(item.href) + '\',\'_blank\')"' : '';
    var editBtn = editable
      ? '<button type="button" class="sb-btn-edit-item" data-b="' + esc(blockId) + '" data-s="' + esc(sectionId) + '" data-i="' + esc(item.id) + '" '
      + 'style="margin-left:auto;flex-shrink:0;padding:1px 5px;border:none;background:transparent;cursor:pointer;font-size:10px;color:var(--text-secondary,#64748b);border-radius:4px;opacity:.6"'
      + ' title="Sửa mục">✏️</button>' : '';
    return '<button type="button" class="nav-item' + (isActive ? ' active' : '') + '" ' + clickAttr + '>'
      + '<span class="icon">' + esc(item.icon || '📄') + '</span>'
      + '<span>' + esc(item.label || '') + '</span>'
      + badge + editBtn
      + '</button>';
  }

  function _sectionHtml(section, blockId, editable) {
    var items = (section.items || []).map(function (it) {
      return _itemHtml(it, blockId, section.id, editable);
    }).join('');
    var addBtn = editable
      ? '<button type="button" class="sb-btn-add-item" data-b="' + esc(blockId) + '" data-s="' + esc(section.id) + '" '
      + 'style="width:100%;margin-top:4px;padding:5px;border:1px dashed var(--border,#dbe5f0);border-radius:var(--nav-item-radius,14px);'
      + 'background:transparent;cursor:pointer;font-size:11px;color:var(--text-secondary,#64748b)">＋ Thêm mục</button>' : '';
    var sectionTitle = '';
    if (section.title) {
      var editTitleBtn = editable
        ? '<button type="button" class="sb-btn-edit-section" data-b="' + esc(blockId) + '" data-s="' + esc(section.id) + '" '
        + 'style="float:right;border:none;background:transparent;cursor:pointer;font-size:10px;opacity:.6" title="Sửa nhóm">⚙️</button>' : '';
      sectionTitle = '<div class="nav-section-title">' + editTitleBtn + esc(section.title) + '</div>';
    }
    return '<div class="nav-section" data-sb-section="' + esc(section.id) + '">'
      + sectionTitle + items + addBtn + '</div>';
  }

  function _blockHtml(blockId, editable) {
    var block = _blocks[blockId];
    if (!block) return '';
    var sections = (block.sections || []).map(function (s) {
      return _sectionHtml(s, blockId, editable);
    }).join('');
    var addSectionBtn = editable
      ? '<button type="button" class="sb-btn-add-section" data-b="' + esc(blockId) + '" '
      + 'style="width:100%;margin-top:6px;padding:7px;border:1px dashed color-mix(in srgb,var(--brand-2,#1565c0) 30%,var(--border,#dbe5f0));'
      + 'border-radius:var(--nav-section-radius,14px);background:transparent;cursor:pointer;font-size:11px;color:var(--brand-2,#1565c0);">'
      + '📦 Thêm nhóm mục</button>' : '';
    return sections + addSectionBtn;
  }

  /* ── Navigation ────────────────────────────────────────────────────────── */
  function _nav(blockId, itemId) {
    var block = _blocks[blockId];
    if (!block) return;
    var found = null;
    (block.sections || []).forEach(function (s) {
      (s.items || []).forEach(function (i) { if (i.id === itemId) found = i; });
    });
    if (!found) return;
    if (found.route) window.location.hash = found.route;
    _refresh(blockId);
    if (found.onClick) { try { found.onClick(found); } catch (e) {} }
  }

  /* ── Event wiring ──────────────────────────────────────────────────────── */
  function _wire(container, blockId) {
    if (!container) return;
    container.querySelectorAll('.sb-btn-edit-item').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); _openItemModal(btn.dataset.b, btn.dataset.s, btn.dataset.i); };
    });
    container.querySelectorAll('.sb-btn-add-item').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); _openItemModal(btn.dataset.b, btn.dataset.s, null); };
    });
    container.querySelectorAll('.sb-btn-add-section').forEach(function (btn) {
      btn.onclick = function () { _addSection(btn.dataset.b); };
    });
    container.querySelectorAll('.sb-btn-edit-section').forEach(function (btn) {
      btn.onclick = function (e) { e.stopPropagation(); _editSection(btn.dataset.b, btn.dataset.s); };
    });
  }

  function _refresh(blockId) {
    document.querySelectorAll('[data-sb-block="' + blockId + '"]').forEach(function (c) {
      var editable = c.dataset.sbEdit === '1';
      c.innerHTML = _blockHtml(blockId, editable);
      _wire(c, blockId);
    });
    _persist(blockId);
  }

  /* ── Section operations ────────────────────────────────────────────────── */
  function _addSection(blockId) {
    var block = _blocks[blockId];
    if (!block) return;
    _openSectionModal(blockId, null);
  }

  function _editSection(blockId, sectionId) {
    _openSectionModal(blockId, sectionId);
  }

  function _openSectionModal(blockId, sectionId) {
    var block = _blocks[blockId];
    if (!block) return;
    var section = sectionId ? (block.sections || []).find(function (s) { return s.id === sectionId; }) : null;
    var isNew = !section;

    _closeModal();
    var m = _modalShell(isNew ? 'Thêm nhóm mục' : 'Sửa nhóm mục');
    m.body.innerHTML = _field('sb_stitle', 'Tên nhóm:', section ? section.title : '', 'text', 'Ví dụ: CHẤT LƯỢNG');

    m.save.onclick = function () {
      var title = document.getElementById('sb_stitle').value.trim();
      if (isNew) {
        var newSection = { id: uid(), title: title, items: [] };
        block.sections.push(newSection);
      } else {
        section.title = title;
      }
      _closeModal(); _refresh(blockId);
    };
    if (!isNew) {
      m.del.style.display = 'inline-flex';
      m.del.onclick = function () {
        if (!confirm('Xóa nhóm "' + (section.title || '') + '"? Toàn bộ mục trong nhóm sẽ bị xóa.')) return;
        block.sections = block.sections.filter(function (s) { return s.id !== sectionId; });
        _closeModal(); _refresh(blockId);
      };
    }
    setTimeout(function () { document.getElementById('sb_stitle').focus(); }, 40);
  }

  /* ── Item operations ───────────────────────────────────────────────────── */
  function _openItemModal(blockId, sectionId, itemId) {
    var block = _blocks[blockId];
    if (!block) return;
    var section = (block.sections || []).find(function (s) { return s.id === sectionId; });
    if (!section) return;
    var item = itemId ? (section.items || []).find(function (i) { return i.id === itemId; }) : null;
    var isNew = !item;

    _closeModal();
    var m = _modalShell(isNew ? 'Thêm mục điều hướng' : 'Sửa mục điều hướng');
    m.body.innerHTML = [
      '<div style="display:grid;gap:10px">',
      _field('sb_icon', 'Icon (emoji):', item ? item.icon : '📄', 'text', '📋 🏠 🔍 📊 ⚙️'),
      _field('sb_label', 'Nhãn hiển thị:', item ? item.label : '', 'text', 'Tên mục'),
      _field('sb_route', 'Route hash (#...):', item ? (item.route || '') : '', 'text', 'Ví dụ: #sop hoặc #admin'),
      _field('sb_href', 'Hoặc link ngoài (URL):', item ? (item.href || '') : '', 'text', 'https://...'),
      _field('sb_badge', 'Badge (số hoặc text):', item ? (item.badge || '') : '', 'text', 'Ví dụ: 12 hoặc MỚI'),
      '</div>'
    ].join('');

    m.save.onclick = function () {
      var icon = document.getElementById('sb_icon').value.trim();
      var label = document.getElementById('sb_label').value.trim();
      var route = document.getElementById('sb_route').value.trim();
      var href = document.getElementById('sb_href').value.trim();
      var badge = document.getElementById('sb_badge').value.trim();
      if (!label) { document.getElementById('sb_label').focus(); return; }
      if (isNew) {
        section.items.push({ id: uid(), icon: icon || '📄', label: label, route: route || null, href: href || null, badge: badge || null });
      } else {
        item.icon = icon || '📄'; item.label = label;
        item.route = route || null; item.href = href || null; item.badge = badge || null;
      }
      _closeModal(); _refresh(blockId);
    };
    if (!isNew) {
      m.del.style.display = 'inline-flex';
      m.del.onclick = function () {
        if (!confirm('Xóa mục "' + (item.label || '') + '"?')) return;
        section.items = section.items.filter(function (i) { return i.id !== itemId; });
        _closeModal(); _refresh(blockId);
      };
    }
    setTimeout(function () { document.getElementById('sb_label').focus(); }, 40);
  }

  /* ── Modal shell ───────────────────────────────────────────────────────── */
  function _modalShell(title) {
    var overlay = document.createElement('div');
    overlay.id = 'sb-modal-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(15,23,42,.45);z-index:10999;display:flex;align-items:center;justify-content:center;padding:16px;box-sizing:border-box';

    var panel = document.createElement('div');
    panel.style.cssText = 'background:#fff;border-radius:18px;padding:22px 24px 20px;width:100%;max-width:400px;box-shadow:0 24px 56px rgba(15,23,42,.22);box-sizing:border-box';

    var heading = document.createElement('div');
    heading.style.cssText = 'font-size:15px;font-weight:700;color:var(--text-primary,#0f172a);margin-bottom:16px';
    heading.textContent = title;

    var body = document.createElement('div');

    var footer = document.createElement('div');
    footer.style.cssText = 'display:flex;align-items:center;gap:8px;margin-top:18px';

    var delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.style.cssText = 'display:none;margin-right:auto;padding:7px 14px;border:1px solid var(--red,#c62828);border-radius:8px;background:transparent;color:var(--red,#c62828);cursor:pointer;font-size:12px;font-weight:600;align-items:center;gap:4px';
    delBtn.textContent = 'Xóa';

    var cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.style.cssText = 'padding:7px 16px;border:1px solid var(--border,#dbe5f0);border-radius:8px;background:#fff;cursor:pointer;font-size:13px;font-weight:500';
    cancelBtn.textContent = 'Hủy';
    cancelBtn.onclick = _closeModal;

    var saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.style.cssText = 'padding:7px 18px;border:none;border-radius:8px;background:var(--brand-2,#1565c0);color:#fff;cursor:pointer;font-size:13px;font-weight:700';
    saveBtn.textContent = 'Lưu';

    footer.appendChild(delBtn);
    footer.appendChild(cancelBtn);
    footer.appendChild(saveBtn);
    panel.appendChild(heading);
    panel.appendChild(body);
    panel.appendChild(footer);
    overlay.appendChild(panel);
    document.body.appendChild(overlay);

    overlay.onclick = function (e) { if (e.target === overlay) _closeModal(); };
    document.addEventListener('keydown', _escListener);

    return { overlay: overlay, body: body, save: saveBtn, del: delBtn };
  }

  function _escListener(e) { if (e.key === 'Escape') _closeModal(); }

  function _closeModal() {
    var el = document.getElementById('sb-modal-overlay');
    if (el) el.remove();
    document.removeEventListener('keydown', _escListener);
  }

  function _field(id, label, val, type, placeholder) {
    return '<div>'
      + '<label for="' + id + '" style="display:block;font-size:11px;font-weight:600;color:var(--text-secondary,#64748b);margin-bottom:4px;letter-spacing:.02em">' + esc(label) + '</label>'
      + '<input id="' + id + '" type="' + type + '" value="' + esc(val || '') + '" placeholder="' + esc(placeholder || '') + '" '
      + 'style="width:100%;height:34px;padding:0 10px;border:1px solid var(--border,#dbe5f0);border-radius:8px;font-size:13px;box-sizing:border-box;font-family:inherit;outline:none"'
      + ' onfocus="this.style.borderColor=\'var(--brand-2,#1565c0)\'" onblur="this.style.borderColor=\'var(--border,#dbe5f0)\'">'
      + '</div>';
  }

  /* ── Persistence ───────────────────────────────────────────────────────── */
  function _persist(blockId) {
    try {
      var key = 'sb__' + blockId;
      var data = deepClone(_blocks[blockId]);
      // strip runtime-only props
      (data.sections || []).forEach(function (s) {
        (s.items || []).forEach(function (i) { delete i._sectionId; delete i.onClick; });
      });
      localStorage.setItem(key, JSON.stringify(data));
    } catch (e) {}
  }

  function _loadPersisted(blockId) {
    try {
      var raw = localStorage.getItem('sb__' + blockId);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.sections)) {
          _blocks[blockId] = parsed;
          return true;
        }
      }
    } catch (e) {}
    return false;
  }

  /* ══════════════════════════════════════════════════════════════════════════
     PUBLIC API
  ══════════════════════════════════════════════════════════════════════════ */
  return {
    /* Internal — called from inline onclick */
    _nav: _nav,

    /**
     * Define a block with initial config.
     * If a saved version exists in localStorage it is used instead.
     * @param {string} blockId
     * @param {{ sections: Array }} config
     */
    define: function (blockId, config) {
      _blocks[blockId] = config || { sections: [] };
      if (!_blocks[blockId].sections) _blocks[blockId].sections = [];
      _loadPersisted(blockId);
      return this;
    },

    /**
     * Add a section programmatically (module registration pattern).
     * @param {string} blockId
     * @param {{ id?, title, items? }} sectionConfig
     */
    addSection: function (blockId, sectionConfig) {
      if (!_blocks[blockId]) _blocks[blockId] = { sections: [] };
      var s = Object.assign({ id: uid(), items: [] }, sectionConfig);
      _blocks[blockId].sections.push(s);
      return this;
    },

    /**
     * Add an item to a section.
     * @param {string} blockId
     * @param {string} sectionId  — create section if not found
     * @param {{ id?, icon, label, route?, href?, badge?, onClick? }} itemConfig
     */
    addItem: function (blockId, sectionId, itemConfig) {
      if (!_blocks[blockId]) _blocks[blockId] = { sections: [] };
      var section = (_blocks[blockId].sections || []).find(function (s) { return s.id === sectionId; });
      if (!section) {
        section = { id: sectionId, title: '', items: [] };
        _blocks[blockId].sections.push(section);
      }
      section.items.push(Object.assign({ id: uid() }, itemConfig));
      return this;
    },

    /**
     * Render the block into a DOM container.
     * @param {string} blockId
     * @param {HTMLElement|string} container  — element or CSS selector
     * @param {{ editable?: boolean }} opts
     * @returns {string} raw HTML (also written to container)
     */
    render: function (blockId, container, opts) {
      if (!_blocks[blockId]) return '';
      opts = opts || {};
      var editable = !!opts.editable;
      var el = typeof container === 'string' ? document.querySelector(container) : container;
      if (el) {
        el.setAttribute('data-sb-block', blockId);
        el.setAttribute('data-sb-edit', editable ? '1' : '0');
        el.innerHTML = _blockHtml(blockId, editable);
        _wire(el, blockId);
      }
      return _blockHtml(blockId, editable);
    },

    /** Toggle edit mode on a rendered block. */
    setEditable: function (blockId, on) {
      document.querySelectorAll('[data-sb-block="' + blockId + '"]').forEach(function (c) {
        c.setAttribute('data-sb-edit', on ? '1' : '0');
        c.innerHTML = _blockHtml(blockId, !!on);
        _wire(c, blockId);
      });
    },

    /** Force re-render all containers for a block. */
    refresh: function (blockId) { _refresh(blockId); },

    /** Get the raw block data object (mutable). */
    getBlock: function (blockId) { return _blocks[blockId]; },

    /** Return IDs of all defined blocks. */
    list: function () { return Object.keys(_blocks); },

    /** Programmatically open the item-add modal for a section. */
    openAddItem: function (blockId, sectionId) { _openItemModal(blockId, sectionId, null); },

    /** Programmatically open the section-add modal. */
    openAddSection: function (blockId) { _addSection(blockId); },
  };

})();
