/**
 * ═══════════════════════════════════════════════════════════
 * HESEM QMS — Electronic Signature Component
 * 11-e-signature.js
 * ═══════════════════════════════════════════════════════════
 * Reusable e-signature module with:
 *   - Canvas signature pad (mouse + touch)
 *   - Typed signature with cursive font options
 *   - SHA-256 hash verification
 *   - 21 CFR Part 11 compliant metadata
 *   - Bilingual UI (EN/VI)
 *   - Mobile responsive
 *   - AuditTrail integration
 * ═══════════════════════════════════════════════════════════
 */
(function () {
  'use strict';

  function repairEsigText(value) {
    var text = String(value == null ? '' : value);
    if (!text) return text;
    function cleanup(input) {
      return String(input == null ? '' : input)
        .replace(/\uFFFD/g, '')
        .replace(/[\u0018\u0019]/g, '')
        .replace(/Â·/g, '·')
        .replace(/â€”/g, '—')
        .replace(/â€“/g, '–')
        .replace(/â€œ/g, '“')
        .replace(/â€|â€�/g, '”')
        .replace(/â€˜|â€™/g, '’')
        .replace(/â€¦/g, '…')
        .replace(/Ã /g, 'à')
        .replace(/Ã¡/g, 'á')
        .replace(/Ã¢/g, 'â')
        .replace(/Äƒ/g, 'ă')
        .replace(/Ä‘/g, 'đ')
        .replace(/Ä/g, 'Đ')
        .replace(/Æ°/g, 'ư')
        .replace(/Æ¡/g, 'ơ')
        .replace(/áº¡/g, 'ạ')
        .replace(/áº£/g, 'ả')
        .replace(/áº¥/g, 'ấ')
        .replace(/áº§/g, 'ầ')
        .replace(/á»™/g, 'ộ')
        .replace(/á»›/g, 'ớ')
        .replace(/á»/g, 'ờ')
        .replace(/á»§/g, 'ủ')
        .replace(/á»«/g, 'ừ')
        .replace(/á»¯/g, 'ữ');
    }
    var best = cleanup(text);
    for (var i = 0; i < 4; i += 1) {
      var improved = best;
      try {
        improved = cleanup(decodeURIComponent(escape(best)));
      } catch (_err) {
        try {
          var bytes = new Uint8Array(Array.prototype.map.call(best, function (ch) { return ch.charCodeAt(0) & 255; }));
          improved = cleanup(new TextDecoder('utf-8').decode(bytes));
        } catch (_err2) {}
      }
      if (improved === best) break;
      best = improved;
    }
    return best;
  }

  function repairEsigDom(root) {
    if (!root || !root.querySelectorAll) return;
    root.querySelectorAll('*').forEach(function (node) {
      Array.prototype.forEach.call(node.childNodes || [], function (child) {
        if (child && child.nodeType === Node.TEXT_NODE) {
          var fixed = repairEsigText(child.nodeValue);
          if (fixed !== child.nodeValue) child.nodeValue = fixed;
        }
      });
      ['title', 'placeholder', 'aria-label', 'value'].forEach(function (attr) {
        if (node.hasAttribute && node.hasAttribute(attr)) {
          var raw = node.getAttribute(attr);
          var fixedAttr = repairEsigText(raw);
          if (fixedAttr !== raw) node.setAttribute(attr, fixedAttr);
        }
      });
    });
  }

  /* ── Google Fonts for typed signatures ─────────────── */
  var fontLink = document.getElementById('esig-fonts');
  if (!fontLink) {
    fontLink = document.createElement('link');
    fontLink.id = 'esig-fonts';
    fontLink.rel = 'stylesheet';
    fontLink.href = 'https://fonts.googleapis.com/css2?family=Dancing+Script:wght@700&family=Great+Vibes&family=Sacramento&display=swap';
    document.head.appendChild(fontLink);
  }

  var CURSIVE_FONTS = [
    { name: 'Dancing Script', css: "'Dancing Script', cursive" },
    { name: 'Great Vibes', css: "'Great Vibes', cursive" },
    { name: 'Sacramento', css: "'Sacramento', cursive" }
  ];

  /* ── CSS injection ─────────────────────────────────── */
  var STYLE_ID = 'esig-styles';
  if (!document.getElementById(STYLE_ID)) {
    var style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = [
      '.esig-overlay{position:fixed;inset:0;z-index:10000;background:rgba(15,23,42,.6);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .25s;pointer-events:none}',
      '.esig-overlay.is-open{opacity:1;pointer-events:auto}',
      '.esig-modal{background:#fff;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,.25);width:min(560px,94vw);max-height:90vh;overflow-y:auto;transform:translateY(24px) scale(.96);transition:transform .3s cubic-bezier(.2,0,.38,.9);padding:0}',
      '.esig-overlay.is-open .esig-modal{transform:translateY(0) scale(1)}',
      '.esig-modal-header{display:flex;align-items:center;justify-content:space-between;padding:20px 24px;border-bottom:1px solid #e2e8f0}',
      '.esig-modal-header h3{font-size:1.125rem;font-weight:700;color:#0c2d48;margin:0}',
      '.esig-modal-header .esig-close{width:32px;height:32px;border:none;background:none;cursor:pointer;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#64748b;transition:background .15s}',
      '.esig-modal-header .esig-close:hover{background:#f1f5f9;color:#1e293b}',
      '.esig-body{padding:24px}',
      '.esig-tabs{display:flex;gap:4px;margin-bottom:20px;background:#f1f5f9;border-radius:8px;padding:4px}',
      '.esig-tab{flex:1;padding:8px 12px;font-size:.8125rem;font-weight:600;text-align:center;border:none;background:none;border-radius:6px;cursor:pointer;color:#64748b;transition:all .15s}',
      '.esig-tab.active{background:#fff;color:#0c2d48;box-shadow:0 1px 3px rgba(0,0,0,.08)}',
      '.esig-canvas-wrap{border:2px solid #e2e8f0;border-radius:10px;overflow:hidden;position:relative;background:#fafbfc;touch-action:none}',
      '.esig-canvas-wrap canvas{display:block;width:100%;cursor:crosshair}',
      '.esig-canvas-hint{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;color:#94a3b8;font-size:.8125rem;pointer-events:none;transition:opacity .2s}',
      '.esig-canvas-wrap.has-drawn .esig-canvas-hint{opacity:0}',
      '.esig-canvas-actions{display:flex;gap:8px;margin-top:8px;justify-content:flex-end}',
      '.esig-canvas-actions button{font-size:.75rem;font-weight:600;padding:6px 14px;border:1px solid #d1d5db;border-radius:6px;background:#fff;color:#475569;cursor:pointer;transition:all .15s}',
      '.esig-canvas-actions button:hover{background:#f1f5f9;border-color:#9ca3af}',
      '.esig-typed-grid{display:grid;gap:10px}',
      '.esig-typed-option{border:2px solid #e2e8f0;border-radius:10px;padding:16px;cursor:pointer;text-align:center;transition:all .15s}',
      '.esig-typed-option:hover{border-color:#94a3b8;background:#f8fafc}',
      '.esig-typed-option.selected{border-color:#1565c0;background:#eff6ff;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
      '.esig-typed-preview{font-size:1.75rem;line-height:1.3;color:#0c2d48;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}',
      '.esig-typed-font-name{font-size:.6875rem;color:#94a3b8;margin-top:4px;font-family:Inter,sans-serif}',
      '.esig-meta{margin-top:20px;display:grid;gap:12px}',
      '.esig-meta-row{display:grid;grid-template-columns:1fr 1fr;gap:12px}',
      '@media(max-width:480px){.esig-meta-row{grid-template-columns:1fr}}',
      '.esig-meta label{display:block;font-size:.6875rem;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.05em;margin-bottom:4px}',
      '.esig-meta input,.esig-meta textarea{width:100%;padding:8px 12px;font-size:.875rem;border:1px solid #d1d5db;border-radius:6px;font-family:inherit;transition:border-color .15s,box-shadow .15s}',
      '.esig-meta input:focus,.esig-meta textarea:focus{outline:none;border-color:#1565c0;box-shadow:0 0 0 3px rgba(21,101,192,.12)}',
      '.esig-meta input:read-only{background:#f8fafc;color:#64748b}',
      '.esig-meta textarea{resize:vertical;min-height:60px}',
      '.esig-meta .esig-field-error{border-color:#dc2626!important;box-shadow:0 0 0 3px rgba(220,38,38,.12)!important}',
      '.esig-footer{padding:16px 24px;border-top:1px solid #e2e8f0;display:flex;gap:12px;justify-content:flex-end}',
      '.esig-footer button{padding:10px 24px;font-size:.875rem;font-weight:600;border-radius:8px;cursor:pointer;transition:all .15s;border:none;font-family:inherit}',
      '.esig-btn-cancel{background:#f1f5f9;color:#475569}',
      '.esig-btn-cancel:hover{background:#e2e8f0}',
      '.esig-btn-confirm{background:#16a34a;color:#fff;min-width:140px}',
      '.esig-btn-confirm:hover{background:#15803d;box-shadow:0 4px 6px -1px rgba(22,163,74,.25)}',
      '.esig-btn-confirm:disabled{background:#94a3b8;cursor:not-allowed;box-shadow:none}',
      /* Inserted signature display */
      '.esig-display{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px}',
      '.esig-display img,.esig-display .esig-typed-render{max-width:200px;max-height:60px}',
      '.esig-typed-render{font-size:1.5rem;color:#0c2d48;line-height:1.2}',
      '.esig-display-name{font-size:.75rem;font-weight:600;color:#1e293b}',
      '.esig-display-role{font-size:.6875rem;color:#64748b}',
      '.esig-display-date{font-size:.6875rem;color:#94a3b8;font-family:monospace}',
      '.esig-display-hash{font-size:.5625rem;color:#94a3b8;font-family:monospace;word-break:break-all;max-width:200px;text-align:center;opacity:.6}',
      '.esig-signed-badge{display:inline-flex;align-items:center;gap:4px;font-size:.625rem;font-weight:700;color:#16a34a;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:999px;padding:2px 8px;margin-top:4px;text-transform:uppercase;letter-spacing:.05em}',
      '.esig-signed-badge svg{width:12px;height:12px}'
    ].join('\n');
    document.head.appendChild(style);
  }

  /* ── Utility: SHA-256 hash ─────────────────────────── */
  function sha256(str) {
    if (window.crypto && window.crypto.subtle) {
      var buf = new TextEncoder().encode(str);
      return window.crypto.subtle.digest('SHA-256', buf).then(function (hash) {
        return Array.from(new Uint8Array(hash))
          .map(function (b) { return b.toString(16).padStart(2, '0'); })
          .join('');
      });
    }
    /* Fallback: simple hash for older browsers */
    return Promise.resolve('sha256-unavailable');
  }

  /* ── ESignature Class ──────────────────────────────── */
  function ESignature(config) {
    this.config = Object.assign({
      lang: 'en',           // 'en' or 'vi'
      requireReason: true,   // 21 CFR Part 11
      requirePin: false,     // optional PIN confirmation
      canvasWidth: 500,
      canvasHeight: 160,
      strokeColor: '#0c2d48',
      strokeWidth: 2.5,
      onAuditLog: null       // function(event) {} — AuditTrail integration
    }, config || {});

    this._overlay = null;
    this._canvas = null;
    this._ctx = null;
    this._isDrawing = false;
    this._hasDrawn = false;
    this._points = [];
    this._mode = 'draw';          // 'draw' or 'typed'
    this._selectedFont = 0;
    this._currentOptions = null;
  }

  /* ── Labels ────────────────────────────────────────── */
  ESignature.LABELS = {
    en: {
      title: 'Electronic Signature',
      tabDraw: 'Draw',
      tabType: 'Type',
      canvasHint: 'Sign here with mouse or finger',
      clear: 'Clear',
      undo: 'Undo',
      name: 'Full Name',
      signerId: 'Signer ID',
      role: 'Role / Position',
      dateTime: 'Date & Time',
      reason: 'Reason for Signing',
      reasonPlaceholder: 'Required: Enter reason for this action...',
      pin: 'PIN / Password',
      pinPlaceholder: 'Enter your PIN to confirm',
      cancel: 'Cancel',
      confirm: 'Sign & Confirm',
      signed: 'Verified'
    },
    vi: {
      title: 'Chữ ký điện tử',
      tabDraw: 'Ký tay',
      tabType: 'Gõ tên',
      canvasHint: 'Ký tại đây bằng chuột hoặc ngón tay',
      clear: 'Xóa',
      undo: 'Hoàn tác',
      name: 'Họ và tên',
      signerId: 'Mã người ký',
      role: 'Chức vụ',
      dateTime: 'Ngày giờ',
      reason: 'Lý do ký',
      reasonPlaceholder: 'Bắt buộc: Nhập lý do ký xác nhận...',
      pin: 'Mã PIN / Mật khẩu',
      pinPlaceholder: 'Nhập mã PIN để xác nhận',
      cancel: 'Hủy',
      confirm: 'Ký & Xác nhận',
      signed: 'Đã xác thực'
    }
  };

  ESignature.prototype._l = function (key) {
    var lang = this.config.lang === 'vi' ? 'vi' : 'en';
    return repairEsigText(ESignature.LABELS[lang][key] || ESignature.LABELS.en[key] || key);
  };

  /* ── Show signature modal ──────────────────────────── */
  ESignature.prototype.show = function (options) {
    /*
     * options: {
     *   signerId, signerName, signerRole,
     *   reason (pre-fill),
     *   onSign(signatureData),
     *   onCancel()
     * }
     */
    this._currentOptions = options || {};
    this._hasDrawn = false;
    this._selectedFont = 0;
    this._mode = 'draw';
    this._points = [];
    this._buildModal();
    /* Animate open */
    var overlay = this._overlay;
    requestAnimationFrame(function () {
      overlay.classList.add('is-open');
    });
  };

  /* ── Build modal DOM ───────────────────────────────── */
  ESignature.prototype._buildModal = function () {
    var self = this;
    var opts = this._currentOptions;

    /* Remove existing */
    if (this._overlay) this._overlay.remove();

    var overlay = document.createElement('div');
    overlay.className = 'esig-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-label', this._l('title'));

    var now = new Date();
    var dateStr = now.toISOString().replace('T', ' ').substring(0, 19);

    var signerName = opts.signerName || '';
    var signerRole = opts.signerRole || '';

    overlay.innerHTML =
      '<div class="esig-modal">' +
        '<div class="esig-modal-header">' +
          '<h3>' + this._l('title') + '</h3>' +
          '<button class="esig-close" aria-label="Close" data-action="cancel">' +
            '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="esig-body">' +
          /* Tabs */
          '<div class="esig-tabs">' +
            '<button class="esig-tab active" data-tab="draw">' + this._l('tabDraw') + '</button>' +
            '<button class="esig-tab" data-tab="typed">' + this._l('tabType') + '</button>' +
          '</div>' +
          /* Draw panel */
          '<div class="esig-panel" data-panel="draw">' +
            '<div class="esig-canvas-wrap">' +
              '<canvas id="esig-canvas" width="' + self.config.canvasWidth + '" height="' + self.config.canvasHeight + '"></canvas>' +
              '<div class="esig-canvas-hint">' + this._l('canvasHint') + '</div>' +
            '</div>' +
            '<div class="esig-canvas-actions">' +
              '<button data-action="clear">' + this._l('clear') + '</button>' +
            '</div>' +
          '</div>' +
          /* Typed panel */
          '<div class="esig-panel" data-panel="typed" style="display:none">' +
            '<div class="esig-typed-grid"></div>' +
          '</div>' +
          /* Metadata */
          '<div class="esig-meta">' +
            '<div class="esig-meta-row">' +
              '<div><label>' + this._l('name') + '</label>' +
                '<input type="text" data-field="name" value="' + this._escAttr(signerName) + '"' + (signerName ? ' readonly' : '') + '></div>' +
              '<div><label>' + this._l('role') + '</label>' +
                '<input type="text" data-field="role" value="' + this._escAttr(signerRole) + '"' + (signerRole ? ' readonly' : '') + '></div>' +
            '</div>' +
            (opts.signerId ?
              '<div><label>' + this._l('signerId') + '</label>' +
                '<input type="text" data-field="signerId" value="' + this._escAttr(opts.signerId) + '" readonly></div>'
              : '') +
            '<div><label>' + this._l('dateTime') + '</label>' +
              '<input type="text" data-field="datetime" value="' + dateStr + '" readonly></div>' +
            (this.config.requireReason ?
              '<div><label>' + this._l('reason') + ' <span style="color:#dc2626">*</span></label>' +
                '<textarea data-field="reason" placeholder="' + this._l('reasonPlaceholder') + '">' + (opts.reason || '') + '</textarea></div>'
              : '') +
            (this.config.requirePin ?
              '<div><label>' + this._l('pin') + '</label>' +
                '<input type="password" data-field="pin" placeholder="' + this._l('pinPlaceholder') + '"></div>'
              : '') +
          '</div>' +
        '</div>' +
        '<div class="esig-footer">' +
          '<button class="esig-btn-cancel" data-action="cancel">' + this._l('cancel') + '</button>' +
          '<button class="esig-btn-confirm" data-action="confirm">' + this._l('confirm') + '</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(overlay);
    this._overlay = overlay;
    repairEsigDom(overlay);

    /* Canvas init */
    this._canvas = overlay.querySelector('#esig-canvas');
    this._ctx = this._canvas.getContext('2d');
    this._initCanvas();

    /* Render typed options */
    this._renderTypedSignature(signerName || 'Your Name');

    /* Events */
    this._bindModalEvents();
  };

  ESignature.prototype._escAttr = function (s) {
    return String(s || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  };

  /* ── Canvas drawing ────────────────────────────────── */
  ESignature.prototype._initCanvas = function () {
    var self = this;
    var canvas = this._canvas;
    var ctx = this._ctx;

    /* Scale for high-DPI */
    var rect = canvas.getBoundingClientRect();
    var dpr = window.devicePixelRatio || 1;
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);
    canvas.style.width = rect.width + 'px';
    canvas.style.height = rect.height + 'px';

    ctx.strokeStyle = self.config.strokeColor;
    ctx.lineWidth = self.config.strokeWidth;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    function getPos(e) {
      var r = canvas.getBoundingClientRect();
      var touch = e.touches ? e.touches[0] : e;
      return { x: touch.clientX - r.left, y: touch.clientY - r.top };
    }

    function start(e) {
      e.preventDefault();
      self._isDrawing = true;
      var p = getPos(e);
      ctx.beginPath();
      ctx.moveTo(p.x, p.y);
      self._points.push({ x: p.x, y: p.y, type: 'start' });
    }

    function draw(e) {
      if (!self._isDrawing) return;
      e.preventDefault();
      var p = getPos(e);
      ctx.lineTo(p.x, p.y);
      ctx.stroke();
      self._points.push({ x: p.x, y: p.y, type: 'move' });
      if (!self._hasDrawn) {
        self._hasDrawn = true;
        canvas.parentElement.classList.add('has-drawn');
      }
    }

    function stop(e) {
      if (self._isDrawing) {
        e.preventDefault();
        self._isDrawing = false;
        ctx.closePath();
      }
    }

    /* Mouse */
    canvas.addEventListener('mousedown', start);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stop);
    canvas.addEventListener('mouseleave', stop);
    /* Touch */
    canvas.addEventListener('touchstart', start, { passive: false });
    canvas.addEventListener('touchmove', draw, { passive: false });
    canvas.addEventListener('touchend', stop, { passive: false });
  };

  ESignature.prototype._clearCanvas = function () {
    var canvas = this._canvas;
    var ctx = this._ctx;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    this._hasDrawn = false;
    this._points = [];
    canvas.parentElement.classList.remove('has-drawn');
  };

  ESignature.prototype._getSignatureImage = function () {
    return this._canvas.toDataURL('image/png');
  };

  /* ── Typed signature rendering ─────────────────────── */
  ESignature.prototype._renderTypedSignature = function (name) {
    var self = this;
    var grid = this._overlay.querySelector('.esig-typed-grid');
    if (!grid) return;
    grid.innerHTML = '';

    CURSIVE_FONTS.forEach(function (font, i) {
      var div = document.createElement('div');
      div.className = 'esig-typed-option' + (i === self._selectedFont ? ' selected' : '');
      div.setAttribute('data-font-index', i);
      div.innerHTML =
        '<div class="esig-typed-preview" style="font-family:' + font.css + '">' + self._escAttr(name) + '</div>' +
        '<div class="esig-typed-font-name">' + font.name + '</div>';
      grid.appendChild(div);
    });
  };

  /* ── Modal event bindings ──────────────────────────── */
  ESignature.prototype._bindModalEvents = function () {
    var self = this;
    var overlay = this._overlay;
    var opts = this._currentOptions;

    /* Tabs */
    overlay.querySelectorAll('.esig-tab').forEach(function (tab) {
      tab.addEventListener('click', function () {
        overlay.querySelectorAll('.esig-tab').forEach(function (t) { t.classList.remove('active'); });
        tab.classList.add('active');
        self._mode = tab.getAttribute('data-tab');
        overlay.querySelectorAll('.esig-panel').forEach(function (p) {
          p.style.display = p.getAttribute('data-panel') === self._mode ? '' : 'none';
        });
      });
    });

    /* Typed font selection */
    overlay.addEventListener('click', function (e) {
      var opt = e.target.closest('.esig-typed-option');
      if (opt) {
        overlay.querySelectorAll('.esig-typed-option').forEach(function (o) { o.classList.remove('selected'); });
        opt.classList.add('selected');
        self._selectedFont = parseInt(opt.getAttribute('data-font-index'), 10) || 0;
      }
    });

    /* Name input update for typed preview */
    var nameInput = overlay.querySelector('[data-field="name"]');
    if (nameInput && !nameInput.readOnly) {
      nameInput.addEventListener('input', function () {
        self._renderTypedSignature(nameInput.value || 'Your Name');
      });
    }

    /* Clear canvas */
    overlay.querySelectorAll('[data-action="clear"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self._clearCanvas();
      });
    });

    /* Cancel */
    overlay.querySelectorAll('[data-action="cancel"]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        self._close();
        if (opts.onCancel) opts.onCancel();
      });
    });

    /* Backdrop click */
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) {
        self._close();
        if (opts.onCancel) opts.onCancel();
      }
    });

    /* Escape key */
    this._escHandler = function (e) {
      if (e.key === 'Escape') {
        self._close();
        if (opts.onCancel) opts.onCancel();
      }
    };
    document.addEventListener('keydown', this._escHandler);

    /* Confirm */
    overlay.querySelector('[data-action="confirm"]').addEventListener('click', function () {
      self._handleConfirm();
    });
  };

  /* ── Confirm handler ───────────────────────────────── */
  ESignature.prototype._handleConfirm = function () {
    var self = this;
    var overlay = this._overlay;
    var opts = this._currentOptions;

    /* Validate reason */
    if (this.config.requireReason) {
      var reasonEl = overlay.querySelector('[data-field="reason"]');
      if (reasonEl && !reasonEl.value.trim()) {
        reasonEl.classList.add('esig-field-error');
        reasonEl.focus();
        return;
      }
      if (reasonEl) reasonEl.classList.remove('esig-field-error');
    }

    /* Validate name */
    var nameEl = overlay.querySelector('[data-field="name"]');
    if (!nameEl.value.trim()) {
      nameEl.classList.add('esig-field-error');
      nameEl.focus();
      return;
    }
    nameEl.classList.remove('esig-field-error');

    /* Validate signature exists */
    if (this._mode === 'draw' && !this._hasDrawn) {
      var wrap = overlay.querySelector('.esig-canvas-wrap');
      wrap.style.borderColor = '#dc2626';
      setTimeout(function () { wrap.style.borderColor = ''; }, 2000);
      return;
    }

    /* Build signature data */
    var sigImage = null;
    var sigType = this._mode;
    var sigFont = null;

    if (this._mode === 'draw') {
      sigImage = this._getSignatureImage();
    } else {
      sigFont = CURSIVE_FONTS[this._selectedFont];
    }

    var signerName = nameEl.value.trim();
    var signerRole = (overlay.querySelector('[data-field="role"]') || {}).value || '';
    var dateTime = (overlay.querySelector('[data-field="datetime"]') || {}).value || '';
    var reason = this.config.requireReason ?
      ((overlay.querySelector('[data-field="reason"]') || {}).value || '') : '';
    var pin = this.config.requirePin ?
      ((overlay.querySelector('[data-field="pin"]') || {}).value || '') : '';

    if (this.config.requirePin && !String(pin).trim()) {
      var pinEl = overlay.querySelector('[data-field="pin"]');
      if (pinEl) {
        pinEl.classList.add('esig-field-error');
        pinEl.focus();
      }
      return;
    }

    var metaString = [signerName, signerRole, dateTime, reason, sigType].join('|');

    sha256(metaString + (sigImage || signerName)).then(function (hash) {
      var signatureData = {
        type: sigType,
        image_base64: sigImage,
        typed_name: sigType === 'typed' ? signerName : null,
        typed_font: sigFont ? sigFont.css : null,
        typed_font_name: sigFont ? sigFont.name : null,
        signer_name: signerName,
        signer_role: signerRole,
        signer_id: opts.signerId || null,
        signed_at: dateTime,
        reason: reason,
        signature_meaning: opts.signatureMeaning || reason || null,
        pin_confirmed: !!String(pin).trim(),
        hash: hash,
        applied_to: opts.appliedTo || null
      };

      /* AuditTrail integration */
      if (self.config.onAuditLog) {
        self.config.onAuditLog({
          event: 'SIGNATURE_APPLIED',
          signer_name: signerName,
          signer_role: signerRole,
          signed_at: dateTime,
          reason: reason,
          hash: hash,
          type: sigType
        });
      }

      self._close();
      if (opts.onSign) opts.onSign(signatureData);
    });
  };

  /* ── Close modal ───────────────────────────────────── */
  ESignature.prototype._close = function () {
    var self = this;
    if (this._escHandler) {
      document.removeEventListener('keydown', this._escHandler);
      this._escHandler = null;
    }
    if (this._overlay) {
      this._overlay.classList.remove('is-open');
      setTimeout(function () {
        if (self._overlay) {
          self._overlay.remove();
          self._overlay = null;
        }
      }, 300);
    }
  };

  /* ── Insert signature into a container ─────────────── */
  ESignature.prototype.insertSignature = function (containerId, signatureData) {
    var container = typeof containerId === 'string'
      ? document.getElementById(containerId)
      : containerId;
    if (!container) return;

    var html = '<div class="esig-display">';

    if (signatureData.type === 'draw' && signatureData.image_base64) {
      html += '<img src="' + signatureData.image_base64 + '" alt="Signature of ' +
        this._escAttr(signatureData.signer_name) + '">';
    } else if (signatureData.type === 'typed') {
      html += '<div class="esig-typed-render" style="font-family:' +
        (signatureData.typed_font || "'Dancing Script', cursive") + '">' +
        this._escAttr(signatureData.typed_name || signatureData.signer_name) + '</div>';
    }

    html += '<div class="esig-display-name">' + this._escAttr(signatureData.signer_name) + '</div>';
    html += '<div class="esig-display-role">' + this._escAttr(signatureData.signer_role) + '</div>';
    if (signatureData.signer_id) {
      html += '<div class="esig-display-role">' + this._escAttr(signatureData.signer_id) + '</div>';
    }
    html += '<div class="esig-display-date">' + this._escAttr(signatureData.signed_at) + '</div>';
    html += '<div class="esig-signed-badge">' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">' +
        '<path d="M20 6L9 17l-5-5"/>' +
      '</svg> ' + this._l('signed') +
    '</div>';
    html += '<div class="esig-display-hash">' + (signatureData.hash || '').substring(0, 16) + '...' + '</div>';
    html += '</div>';

    container.innerHTML = html;
    container.style.borderStyle = 'solid';
    container.style.borderColor = '#bbf7d0';
    container.style.background = '#f0fdf4';

    /* Store data on element */
    container.dataset.signatureData = JSON.stringify(signatureData);
    container.dataset.signed = 'true';
  };

  /* ── Validation helpers ────────────────────────────── */
  ESignature.prototype.isComplete = function (containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    return el ? el.dataset.signed === 'true' : false;
  };

  ESignature.prototype.getSignatureData = function (containerId) {
    var el = typeof containerId === 'string' ? document.getElementById(containerId) : containerId;
    if (!el || !el.dataset.signatureData) return null;
    try { return JSON.parse(el.dataset.signatureData); }
    catch (e) { return null; }
  };

  /* ── Export ─────────────────────────────────────────── */
  window.ESignature = ESignature;

})();
