/**
 * ═══════════════════════════════════════════════════════════
 * HESEM QMS — Searchable Input (Autocomplete) Component
 * 12-searchable-input.js
 * ═══════════════════════════════════════════════════════════
 * Reusable searchable dropdown with:
 *   - Text input with search icon
 *   - Debounced filtering (300ms)
 *   - Highlight matching text in results
 *   - Keyboard navigation (arrows, enter, escape)
 *   - Auto-populate related fields
 *   - Cascading (dependsOn) support
 *   - Static data or API endpoint
 *   - Loading spinner + "no results"
 *   - Bilingual placeholders
 *   - Mobile responsive (viewport-aware dropdown)
 * ═══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  /* ── CSS injection ─────────────────────────────────── */
  var STYLE_ID = 'si-styles';
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.si-wrap{position:relative;width:100%}',
      '.si-input-wrap{position:relative}',
      '.si-input{width:100%;height:var(--form-input-height-md,2.5rem);padding:var(--form-input-padding-y,.5rem) var(--form-input-padding-x,.75rem);padding-left:36px;font-family:var(--form-font-family,inherit);font-size:var(--form-input-font-size,.875rem);color:var(--form-text,#1e293b);background:var(--form-surface,#fff);border:1px solid var(--form-border,#d1d5db);border-radius:var(--form-input-radius,6px);box-shadow:var(--form-shadow-xs,0 1px 2px rgba(15,23,42,.04));transition:border-color .15s,box-shadow .15s;appearance:none;-webkit-appearance:none}',
      '.si-input:focus{outline:none;border-color:var(--form-border-focus,#1565c0);box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
      '.si-input:hover:not(:focus){border-color:var(--form-border-strong,#9ca3af)}',
      '.si-input.si-invalid{border-color:#dc2626;box-shadow:0 0 0 3px rgba(220,38,38,.12)}',
      '.si-input::placeholder{color:var(--form-text-disabled,#94a3b8)}',
      '.si-icon{position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--form-text-tertiary,#64748b);pointer-events:none;display:flex;align-items:center}',
      '.si-icon svg{width:16px;height:16px}',
      '.si-clear{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:22px;height:22px;border:none;background:none;cursor:pointer;border-radius:4px;display:none;align-items:center;justify-content:center;color:#94a3b8;transition:color .15s,background .15s}',
      '.si-clear:hover{color:#475569;background:#f1f5f9}',
      '.si-wrap.has-value .si-clear{display:flex}',
      '.si-spinner{position:absolute;right:8px;top:50%;transform:translateY(-50%);width:18px;height:18px;border:2px solid #e2e8f0;border-top-color:#1565c0;border-radius:50%;animation:si-spin .6s linear infinite;display:none}',
      '@keyframes si-spin{to{transform:translateY(-50%) rotate(360deg)}}',
      '.si-wrap.is-loading .si-spinner{display:block}',
      '.si-wrap.is-loading .si-clear{display:none!important}',
      '.si-dropdown{position:absolute;left:0;right:0;z-index:200;background:var(--dropdown-bg,var(--bg-surface,#fff));border:var(--dropdown-border,1px solid var(--border,#e2e8f0));border-radius:var(--dropdown-radius,8px);box-shadow:var(--dropdown-shadow,0 10px 25px -5px rgba(0,0,0,.1),0 4px 6px -2px rgba(0,0,0,.05));max-height:240px;overflow-y:auto;display:none;margin-top:4px;scrollbar-width:thin}',
      '.si-dropdown.is-open{display:block}',
      '.si-dropdown.above{margin-top:0;margin-bottom:4px;bottom:100%;top:auto}',
      '.si-item{padding:var(--dropdown-item-padding,8px 12px);font-size:var(--dropdown-item-font-size,.8125rem);cursor:pointer;transition:background .1s;display:flex;align-items:center;gap:8px;color:var(--text-primary,#1e293b);line-height:var(--leading-normal,1.5)}',
      '.si-item:hover,.si-item.is-active{background:var(--dropdown-item-hover-bg,#eff6ff)}',
      '.si-item-main{flex:1;min-width:0}',
      '.si-item-label{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.si-item-sub{font-size:calc(var(--dropdown-item-font-size,.8125rem) - .125rem);color:var(--text-tertiary,#94a3b8);margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.si-highlight{background:#fef08a;color:#92400e;border-radius:2px;font-weight:600}',
      '.si-empty{padding:16px;text-align:center;font-size:var(--dropdown-item-font-size,.8125rem);color:var(--text-tertiary,#94a3b8)}',
      '.si-empty svg{display:block;margin:0 auto 8px;opacity:.5}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ── SearchableInput Class ─────────────────────────── */
  function SearchableInput(config) {
    this.config = Object.assign({
      containerId: null,      // DOM container id
      fieldId: null,          // unique field identifier
      name: null,             // form field name
      placeholder: 'Search...',
      placeholderVi: '',
      emptyText: 'No results found',
      emptyTextVi: 'Không tìm thấy kết quả',
      dataSource: [],         // array or URL string
      displayField: 'name',   // field to display
      valueField: 'id',       // field for value
      subField: null,         // optional subtitle field
      onSelect: null,         // function(item) {}
      dependsOn: null,        // fieldId of parent SearchableInput
      dependsOnField: null,   // field in data to filter by parent value
      autoPopulate: null,     // { targetFieldName: 'sourceField', ... }
      debounceMs: 300,
      minChars: 0,            // min chars before showing dropdown
      strictSelect: false,
      storeValueInHiddenField: false,
      lang: (document.documentElement.lang || 'en').toLowerCase().indexOf('vi') === 0 ? 'vi' : 'en'
    }, config || {});

    this._data = [];
    this._filtered = [];
    this._value = null;
    this._selectedItem = null;
    this._activeIndex = -1;
    this._isOpen = false;
    this._debounceTimer = null;
    this._el = {};
    this._parentSI = null;

    if (this.config.containerId) {
      this.render();
    }
  }

  /* ── Static registry for dependsOn lookups ─────────── */
  SearchableInput._registry = {};

  SearchableInput.get = function (fieldId) {
    return SearchableInput._registry[fieldId] || null;
  };

  /* ── Render ────────────────────────────────────────── */
  SearchableInput.prototype.render = function () {
    var self = this;
    var container = document.getElementById(this.config.containerId);
    if (!container) return;

    /* Register */
    if (this.config.fieldId) {
      SearchableInput._registry[this.config.fieldId] = this;
    }

    var wrap = document.createElement('div');
    wrap.className = 'si-wrap';
    wrap.setAttribute('data-si-field', this.config.fieldId || '');

    var isVi = this.config.lang === 'vi';
    var placeholder = isVi && this.config.placeholderVi
      ? this.config.placeholderVi
      : this.config.placeholder;

    wrap.innerHTML =
      '<div class="si-input-wrap">' +
        '<span class="si-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg></span>' +
        '<input type="text" class="si-input" ' +
          'placeholder="' + placeholder + '" ' +
          'autocomplete="off" ' +
          'aria-autocomplete="list" ' +
          'aria-expanded="false" ' +
          'role="combobox" ' +
          (this.config.storeValueInHiddenField ? '' : (this.config.name ? 'name="' + this.config.name + '" ' : '')) +
          (this.config.fieldId ? 'id="' + this.config.fieldId + '" ' : '') +
        '>' +
        (this.config.storeValueInHiddenField && this.config.name
          ? '<input type="hidden" class="si-hidden" name="' + this.config.name + '">'
          : '') +
        '<button type="button" class="si-clear" aria-label="Clear" tabindex="-1">' +
          '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
        '</button>' +
        '<div class="si-spinner"></div>' +
      '</div>' +
      '<div class="si-dropdown" role="listbox"></div>';

    container.innerHTML = '';
    container.appendChild(wrap);

    this._el.wrap = wrap;
    this._el.input = wrap.querySelector('.si-input');
    this._el.hidden = wrap.querySelector('.si-hidden');
    this._el.clear = wrap.querySelector('.si-clear');
    this._el.dropdown = wrap.querySelector('.si-dropdown');
    this._el.container = container;

    this._bindEvents();

    /* Load data */
    if (Array.isArray(this.config.dataSource)) {
      this._data = this.config.dataSource;
    } else if (typeof this.config.dataSource === 'string') {
      this._fetchData();
    }

    /* Setup dependency */
    if (this.config.dependsOn) {
      this._parentSI = SearchableInput.get(this.config.dependsOn);
    }
  };

  /* ── Event binding ─────────────────────────────────── */
  SearchableInput.prototype._bindEvents = function () {
    var self = this;
    var input = this._el.input;

    /* Input with debounce */
    input.addEventListener('input', function () {
      clearTimeout(self._debounceTimer);
      self._debounceTimer = setTimeout(function () {
        self._onInput(input.value);
      }, self.config.debounceMs);
    });

    /* Focus: show dropdown if data and meets minChars */
    input.addEventListener('focus', function () {
      if (input.value.length >= self.config.minChars || self._data.length > 0) {
        self._onInput(input.value);
      }
    });

    /* Blur: hide after delay (to allow click) */
    input.addEventListener('blur', function () {
      setTimeout(function () {
        self._hideDropdown();
        if (self.config.strictSelect) {
          self._enforceStrictSelection();
        }
      }, 200);
    });

    /* Keyboard navigation */
    input.addEventListener('keydown', function (e) {
      if (!self._isOpen) {
        if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
          e.preventDefault();
          self._onInput(input.value);
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        self._activeIndex = Math.min(self._activeIndex + 1, self._filtered.length - 1);
        self._highlightItem();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        self._activeIndex = Math.max(self._activeIndex - 1, 0);
        self._highlightItem();
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (self._activeIndex >= 0 && self._filtered[self._activeIndex]) {
          self._selectItem(self._filtered[self._activeIndex]);
        }
      } else if (e.key === 'Escape') {
        self._hideDropdown();
      }
    });

    /* Clear button */
    this._el.clear.addEventListener('click', function () {
      self.reset();
      input.focus();
    });
  };

  /* ── Input handler ─────────────────────────────────── */
  SearchableInput.prototype._onInput = function (query) {
    var self = this;
    query = (query || '').toLowerCase().trim();

    /* Filter by dependency */
    var sourceData = this._data;
    if (this.config.dependsOn && this.config.dependsOnField) {
      var parent = SearchableInput.get(this.config.dependsOn);
      if (parent && parent._selectedItem) {
        var parentVal = parent._selectedItem[parent.config.valueField];
        sourceData = this._data.filter(function (item) {
          return item[self.config.dependsOnField] === parentVal;
        });
      }
    }

    /* Filter by query */
    if (query.length > 0) {
      this._filtered = sourceData.filter(function (item) {
        var display = String(item[self.config.displayField] || '').toLowerCase();
        var value = String(item[self.config.valueField] || '').toLowerCase();
        var sub = self.config.subField ? String(item[self.config.subField] || '').toLowerCase() : '';
        return display.indexOf(query) !== -1 || value.indexOf(query) !== -1 || sub.indexOf(query) !== -1;
      });
    } else {
      this._filtered = sourceData.slice(0, 50); // Show first 50 when empty
    }

    this._activeIndex = -1;
    this._renderDropdown(query);
  };

  /* ── Render dropdown ───────────────────────────────── */
  SearchableInput.prototype._renderDropdown = function (query) {
    var self = this;
    var dd = this._el.dropdown;
    var emptyText = this.config.lang === 'vi'
      ? (this.config.emptyTextVi || this.config.emptyText)
      : this.config.emptyText;

    if (this._filtered.length === 0) {
      dd.innerHTML =
        '<div class="si-empty">' +
          '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">' +
            '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>' +
            '<line x1="8" y1="11" x2="14" y2="11"/>' +
          '</svg>' +
          this._escHtml(emptyText) +
        '</div>';
      this._showDropdown();
      return;
    }

    var html = '';
    this._filtered.forEach(function (item, i) {
      var display = String(item[self.config.displayField] || '');
      var sub = self.config.subField ? String(item[self.config.subField] || '') : '';
      var highlighted = self._highlightText(display, query);
      var subHighlighted = sub ? self._highlightText(sub, query) : '';

      html += '<div class="si-item" data-index="' + i + '" role="option">' +
        '<div class="si-item-main">' +
          '<div class="si-item-label">' + highlighted + '</div>' +
          (subHighlighted ? '<div class="si-item-sub">' + subHighlighted + '</div>' : '') +
        '</div>' +
      '</div>';
    });

    dd.innerHTML = html;

    /* Click handlers */
    dd.querySelectorAll('.si-item').forEach(function (el) {
      el.addEventListener('mousedown', function (e) {
        e.preventDefault();
        var idx = parseInt(el.getAttribute('data-index'), 10);
        if (self._filtered[idx]) {
          self._selectItem(self._filtered[idx]);
        }
      });
    });

    this._showDropdown();
  };

  /* ── Highlight matching text ───────────────────────── */
  SearchableInput.prototype._highlightText = function (text, query) {
    if (!query) return this._escHtml(text);
    var escaped = this._escHtml(text);
    var qEscaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    var re = new RegExp('(' + qEscaped + ')', 'gi');
    return escaped.replace(re, '<span class="si-highlight">$1</span>');
  };

  SearchableInput.prototype._escHtml = function (s) {
    var d = document.createElement('div');
    d.appendChild(document.createTextNode(s));
    return d.innerHTML;
  };

  /* ── Show / hide dropdown ──────────────────────────── */
  SearchableInput.prototype._showDropdown = function () {
    var dd = this._el.dropdown;
    var input = this._el.input;

    /* Determine if dropdown should appear above */
    var rect = input.getBoundingClientRect();
    var spaceBelow = window.innerHeight - rect.bottom;
    if (spaceBelow < 260 && rect.top > 260) {
      dd.classList.add('above');
    } else {
      dd.classList.remove('above');
    }

    dd.classList.add('is-open');
    input.setAttribute('aria-expanded', 'true');
    this._isOpen = true;
  };

  SearchableInput.prototype._hideDropdown = function () {
    this._el.dropdown.classList.remove('is-open');
    this._el.input.setAttribute('aria-expanded', 'false');
    this._isOpen = false;
    this._activeIndex = -1;
  };

  /* ── Highlight active item ─────────────────────────── */
  SearchableInput.prototype._highlightItem = function () {
    var items = this._el.dropdown.querySelectorAll('.si-item');
    items.forEach(function (el, i) {
      el.classList.toggle('is-active', i === this._activeIndex);
    }.bind(this));

    /* Scroll into view */
    if (items[this._activeIndex]) {
      items[this._activeIndex].scrollIntoView({ block: 'nearest' });
    }
  };

  /* ── Select item ───────────────────────────────────── */
  SearchableInput.prototype._selectItem = function (item) {
    this._selectedItem = item;
    this._value = item[this.config.valueField];
    this._el.input.value = item[this.config.displayField] || '';
    this._setHiddenValue(this._value);
    this._el.wrap.classList.add('has-value');
    this._hideDropdown();

    /* Auto-populate related fields */
    if (this.config.autoPopulate) {
      for (var targetName in this.config.autoPopulate) {
        var sourceField = this.config.autoPopulate[targetName];
        var val = item[sourceField];
        if (val !== undefined) {
          /* Try to find by name, then id */
          var target = document.querySelector('[name="' + targetName + '"]') ||
                       document.getElementById(targetName);
          if (target) {
            /* Check if target is a SearchableInput */
            var siWrap = target.closest('[data-si-field]');
            if (siWrap) {
              var siField = siWrap.getAttribute('data-si-field');
              var si = SearchableInput.get(siField);
              if (si) {
                si.setValue(val);
                continue;
              }
            }
            target.value = val;
            /* Trigger change event */
            target.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }
      }
    }

    /* Notify dependents */
    var selfId = this.config.fieldId;
    if (selfId) {
      Object.keys(SearchableInput._registry).forEach(function (key) {
        var si = SearchableInput._registry[key];
        if (si.config.dependsOn === selfId) {
          si.reset();
          /* Re-filter with new parent value */
        }
      });
    }

    /* Callback */
    if (this.config.onSelect) {
      this.config.onSelect(item);
    }

    this._dispatchChange();
  };

  /* ── Fetch data from API ───────────────────────────── */
  SearchableInput.prototype._fetchData = function (query) {
    var self = this;
    var url = this.config.dataSource;
    if (query) url += (url.indexOf('?') !== -1 ? '&' : '?') + 'q=' + encodeURIComponent(query);

    this._el.wrap.classList.add('is-loading');

    fetch(url)
      .then(function (r) { return r.json(); })
      .then(function (data) {
        self._data = Array.isArray(data) ? data : (data.items || data.data || []);
        self._el.wrap.classList.remove('is-loading');
      })
      .catch(function () {
        self._data = [];
        self._el.wrap.classList.remove('is-loading');
      });
  };

  /* ── Public API ────────────────────────────────────── */
  SearchableInput.prototype.setData = function (items) {
    this._data = items || [];
  };

  SearchableInput.prototype.getValue = function () {
    return this._value;
  };

  SearchableInput.prototype.getSelectedItem = function () {
    return this._selectedItem;
  };

  SearchableInput.prototype.setValue = function (value) {
    var self = this;
    var item = this._data.find(function (d) {
      return d[self.config.valueField] === value || d[self.config.displayField] === value;
    });
    if (item) {
      this._selectedItem = item;
      this._value = item[this.config.valueField];
      this._el.input.value = item[this.config.displayField] || '';
      this._setHiddenValue(this._value);
      this._el.wrap.classList.add('has-value');
    } else {
      /* Set raw value */
      this._value = value;
      this._el.input.value = value || '';
      this._setHiddenValue(this.config.strictSelect ? '' : value);
      if (value) this._el.wrap.classList.add('has-value');
    }
  };

  SearchableInput.prototype.reset = function () {
    this._value = null;
    this._selectedItem = null;
    this._el.input.value = '';
    this._setHiddenValue('');
    this._el.wrap.classList.remove('has-value');
    this._hideDropdown();
  };

  SearchableInput.prototype._setHiddenValue = function (value) {
    if (this._el.hidden) {
      this._el.hidden.value = value || '';
    }
  };

  SearchableInput.prototype._dispatchChange = function () {
    if (!this._el.input) return;
    this._el.input.dispatchEvent(new CustomEvent('si:change', {
      bubbles: true,
      detail: {
        fieldId: this.config.fieldId,
        value: this._value,
        item: this._selectedItem
      }
    }));
  };

  SearchableInput.prototype._enforceStrictSelection = function () {
    var currentValue = (this._el.input.value || '').trim();
    if (!currentValue) {
      this.reset();
      return;
    }

    var matched = this._selectedItem &&
      String(this._selectedItem[this.config.displayField] || '').trim() === currentValue;

    if (!matched) {
      this.reset();
      this._el.input.classList.add('si-invalid');
      setTimeout(function () {
        if (this._el && this._el.input) this._el.input.classList.remove('si-invalid');
      }.bind(this), 1200);
    }
  };

  /* ── Export ─────────────────────────────────────────── */
  window.SearchableInput = SearchableInput;

})();
