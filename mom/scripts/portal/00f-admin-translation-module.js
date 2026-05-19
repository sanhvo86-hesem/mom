/* ===================================================================
   00f-admin-translation-module.js
   HESEM MOM Portal — Admin: Translation Control Module (5 tabs)

   Replaces the single-toggle admin UI from 00e-admin-translation-provider.js
   with a full multi-provider control panel backed by migration 157.

   Tabs:
     1. Routing      — per-tier / per-doc routing rules + fallback chains
     2. Providers    — credentials, CLI runtime state, probe & enable/disable
     3. Models       — list & refresh model catalogue per provider
     4. Test Bench   — paste source, run N providers side-by-side
     5. Cost & Usage — spend summary + recent attempts log

   Endpoints under /api/v1/dcc/admin/translation/*  (admin auth required).
   Entry point:  window.renderAdminTranslationModule()

   Visual tokens are read from the existing portal CSS variables; no
   hex/px literals (per CLAUDE.md Graphics Authority rule). Layout uses
   inline styles only for tab-specific scaffolding that doesn't have a
   matching component class yet.
   =================================================================== */

(function () {
'use strict';

function _t(vi, en) { return (typeof lang !== 'undefined' && lang === 'en') ? en : vi; }

const STATE = {
  activeTab: 'routing',
  providers: [],
  vaultReady: false,
  vaultHint: '',
  rules: [],
  modelsByProvider: {},
  usage: null,
  testInput: { source_html: '', title: '', subtitle: '', selectedProviders: [], modelByProvider: {} },
  testResults: [],
  loading: false,
  error: '',
  toast: '',
  // ── Documents tab
  documents: null,
  docPage: 1,
  docSearch: '',
  docStateFilter: '',
  docExpandedOverride: null,
  docRetranslating: {},
  // ── Auto-translate toggle (Translated Docs tab)
  autoTranslateEnabled: null,   // null = not yet loaded, true/false = known
  autoTranslateUpdatedBy: null,
  autoTranslateUpdatedAt: null,
  autoTranslateBusy: false,
  // ── Learnings tab
  learnings: null,
  learningStatusFilter: '',
  learningCategoryFilter: '',
  learningSearch: '',
  learningPage: 1,
  learningEditing: null,
};

const TABS = [
  { id: 'routing',   vi: 'Routing',          en: 'Routing' },
  { id: 'providers', vi: 'Provider',         en: 'Providers' },
  { id: 'models',    vi: 'Model',            en: 'Models' },
  { id: 'documents', vi: 'Tài liệu đã dịch', en: 'Translated Docs' },
  { id: 'learnings', vi: 'Ghi nhớ lỗi',      en: 'Learnings' },
  { id: 'test',      vi: 'Test bench',       en: 'Test bench' },
  { id: 'usage',     vi: 'Chi phí',          en: 'Cost & Usage' },
];

const TIERS = ['tier_1', 'tier_2', 'tier_3'];

// ── HTTP helper ──────────────────────────────────────────────────────────────

function api(method, path, body) {
  const opts = {
    method,
    credentials: 'same-origin',
    headers: {
      'X-CSRF-Token': window.csrfToken || '',
      'Accept': 'application/json',
    },
  };
  if (body !== undefined) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  return fetch(path, opts).then(r => r.json()).then(d => {
    if (!d || !d.ok) {
      const msg = (d && (typeof d.error === 'string' ? d.error : (d.error && d.error.message))) || _t('Lỗi không xác định', 'Unknown error');
      const detail = d && d.detail ? ' — ' + d.detail : '';
      throw new Error(msg + detail);
    }
    // BaseController.success() merges payload into the top-level envelope.
    // Strip the envelope keys (ok, server_time) and return the rest verbatim.
    const { ok, server_time, ...rest } = d;
    return rest;
  });
}

function toast(msg) {
  STATE.toast = msg;
  render();
  setTimeout(() => { STATE.toast = ''; render(); }, 2800);
}

function escapeHtml(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ── Entry & shell ────────────────────────────────────────────────────────────

window.renderAdminTranslationModule = function (container) {
  const el = container || document.getElementById('admin-content');
  if (!el || !document.contains(el)) return;
  el.innerHTML = renderShell();
  loadAll();
};

function renderShell() {
  return `<div class="tx-admin-wrap" style="max-width:1200px;padding:24px;">
    <header style="margin-bottom:18px;">
      <div class="portal-display-kicker">${_t('Module dịch thuật DCC', 'DCC translation module')}</div>
      <h2 style="margin:6px 0 4px 0;">${_t('Kiểm soát đa engine dịch thuật', 'Multi-provider translation control')}</h2>
      <p style="color:var(--text-3);margin:0;line-height:1.5;">${_t(
        'Định tuyến tài liệu qua NLLB local, Claude CLI (Max subscription), Codex CLI (ChatGPT Pro) hoặc API trả phí. Theo dõi chi phí, kiểm thử song song và override theo từng tài liệu.',
        'Route documents through local NLLB, Claude CLI (Max), Codex CLI (ChatGPT Pro), or paid APIs. Track cost, side-by-side test, and override per document.'
      )}</p>
    </header>
    <nav id="tx-admin-tabs" style="display:flex;gap:6px;border-bottom:1px solid var(--ln,#ddd);margin-bottom:16px;"></nav>
    <div id="tx-admin-toast" style="position:fixed;top:18px;right:20px;z-index:9999;"></div>
    <div id="tx-admin-body" style="min-height:300px;"></div>
  </div>`;
}

function render() {
  const tabsEl = document.getElementById('tx-admin-tabs');
  if (tabsEl) {
    tabsEl.innerHTML = TABS.map(t => {
      const active = STATE.activeTab === t.id;
      return `<button class="tx-tab-btn" data-tab="${t.id}" style="
        padding:10px 16px;border:0;background:transparent;
        border-bottom:2px solid ${active ? 'var(--brand-primary,#0c63e7)' : 'transparent'};
        color:${active ? 'var(--brand-primary,#0c63e7)' : 'var(--text-2,#333)'};
        font-weight:${active ? 600 : 400};cursor:pointer;font-size:14px;">
        ${_t(t.vi, t.en)}
      </button>`;
    }).join('');
    tabsEl.querySelectorAll('.tx-tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
  }
  const toastEl = document.getElementById('tx-admin-toast');
  if (toastEl) {
    toastEl.innerHTML = STATE.toast
      ? `<div style="padding:10px 18px;background:var(--success,#0a7e3a);color:#fff;border-radius:6px;box-shadow:0 4px 12px rgba(0,0,0,0.15);font-size:14px;">${escapeHtml(STATE.toast)}</div>`
      : '';
  }
  const bodyEl = document.getElementById('tx-admin-body');
  if (!bodyEl) return;
  if (STATE.loading) {
    bodyEl.innerHTML = `<div style="padding:40px;text-align:center;color:var(--text-3);">⟳ ${_t('Đang tải...','Loading...')}</div>`;
    return;
  }
  if (STATE.error) {
    bodyEl.innerHTML = `<div style="padding:18px;border:1px solid var(--danger,#c00);border-radius:8px;color:var(--danger,#c00);">${escapeHtml(STATE.error)}</div>`;
    return;
  }
  switch (STATE.activeTab) {
    case 'routing':   bodyEl.innerHTML = renderRouting(); wireRouting(); break;
    case 'providers': bodyEl.innerHTML = renderProviders(); wireProviders(); break;
    case 'models':    bodyEl.innerHTML = renderModels(); wireModels(); break;
    case 'documents': bodyEl.innerHTML = renderDocuments(); wireDocuments(); break;
    case 'learnings': bodyEl.innerHTML = renderLearnings(); wireLearnings(); break;
    case 'test':      bodyEl.innerHTML = renderTestBench(); wireTestBench(); break;
    case 'usage':     bodyEl.innerHTML = renderUsage(); break;
  }
}

function switchTab(id) {
  STATE.activeTab = id;
  // Cancel any pending doc-queue poll and live timers if leaving Documents tab.
  if (id !== 'documents') {
    if (_docsPollHandle) { clearTimeout(_docsPollHandle); _docsPollHandle = null; }
    clearLiveTimers();
  }
  if (id === 'usage' && !STATE.usage) loadUsage();
  if (id === 'models') loadAllModels();
  if (id === 'documents' && !STATE.documents) loadDocuments();
  if (id === 'documents' && STATE.documents) scheduleDocsPoll();
  if (id === 'documents' && STATE.autoTranslateEnabled === null) loadAutoTranslateSetting();
  if (id === 'learnings' && !STATE.learnings) loadLearnings();
  render();
}

// ── Initial load ─────────────────────────────────────────────────────────────

function loadAll() {
  STATE.loading = true; STATE.error = ''; render();
  Promise.all([
    api('GET', '/api/v1/dcc/admin/translation/providers'),
    api('GET', '/api/v1/dcc/admin/translation/routing'),
  ]).then(([providers, routing]) => {
    STATE.providers = providers.providers || [];
    STATE.vaultReady = !!providers.vault_ready;
    STATE.vaultHint = providers.vault_setup_hint || '';
    STATE.rules = routing.rules || [];
    STATE.loading = false;
    render();
  }).catch(err => {
    STATE.loading = false;
    STATE.error = String(err.message || err);
    render();
  });
}

function loadUsage() {
  api('GET', '/api/v1/dcc/admin/translation/usage?days=30').then(d => {
    STATE.usage = d;
    render();
  }).catch(err => { STATE.error = String(err); render(); });
}

function loadAllModels() {
  STATE.providers.forEach(p => {
    if (!STATE.modelsByProvider[p.provider_key]) {
      api('GET', `/api/v1/dcc/admin/translation/models/${encodeURIComponent(p.provider_key)}`)
        .then(d => { STATE.modelsByProvider[p.provider_key] = d.models || []; render(); })
        .catch(() => {});
    }
  });
}

// ── Tab 1: Routing ───────────────────────────────────────────────────────────

function findRule(scopeType, scopeValue) {
  return STATE.rules.find(r => r.scope_type === scopeType && (r.scope_value === scopeValue || (scopeType === 'global_default' && scopeValue === '*')));
}

function renderRouting() {
  const enabledProviders = STATE.providers.filter(p => p.is_enabled);
  if (enabledProviders.length === 0) {
    return `<div style="padding:18px;background:var(--warn-bg,#fff8e1);border-radius:8px;">
      ${_t('Chưa có provider nào được bật. Mở tab Providers để bật.', 'No providers enabled. Open the Providers tab to enable one.')}
    </div>`;
  }

  const globalRule = findRule('global_default', '*');
  const tierRules = TIERS.map(t => ({ tier: t, rule: findRule('tier', t) }));
  const docRules = STATE.rules.filter(r => r.scope_type === 'doc_pattern' || r.scope_type === 'doc_code');

  return `
    <section style="margin-bottom:24px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-3);">${_t('Mặc định toàn cục','Global default')}</h3>
      <div class="tx-rule-card" data-rule-id="${globalRule ? globalRule.routing_id : ''}" data-scope-type="global_default" data-scope-value="*"
           style="padding:14px;border:1px solid var(--ln,#ddd);border-radius:8px;background:var(--bg,#fff);">
        ${renderRuleEditor(globalRule, 'global_default', '*', enabledProviders)}
      </div>
    </section>

    <section style="margin-bottom:24px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-3);">${_t('Override theo tier','Per-tier overrides')}</h3>
      <p style="color:var(--text-3);font-size:12px;margin:0 0 10px 0;">${_t(
        'Tier suy ra từ doc_type: tier_1 = MAN/POL/MAN_DEPT, tier_2 = SOP/WI/ANNEX_RTC, tier_3 = FRM/JD/ANNEX/TRN/REG.',
        'Tier inferred from doc_type: tier_1 = MAN/POL/MAN_DEPT, tier_2 = SOP/WI/ANNEX_RTC, tier_3 = FRM/JD/ANNEX/TRN/REG.'
      )}</p>
      ${tierRules.map(({ tier, rule }) => `
        <div class="tx-rule-card" data-rule-id="${rule ? rule.routing_id : ''}" data-scope-type="tier" data-scope-value="${tier}"
             style="padding:12px;border:1px solid var(--ln,#ddd);border-radius:8px;background:var(--bg,#fff);margin-bottom:8px;">
          <div style="font-weight:600;margin-bottom:8px;">${tier}</div>
          ${renderRuleEditor(rule, 'tier', tier, enabledProviders)}
        </div>
      `).join('')}
    </section>

    <section style="margin-bottom:24px;">
      <h3 style="margin:0 0 8px 0;font-size:14px;text-transform:uppercase;letter-spacing:0.5px;color:var(--text-3);">${_t('Override theo doc/pattern','Per-document / pattern overrides')}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead><tr style="text-align:left;border-bottom:1px solid var(--ln,#ddd);">
          <th style="padding:8px 4px;">${_t('Loại','Scope')}</th>
          <th style="padding:8px 4px;">${_t('Giá trị','Value')}</th>
          <th style="padding:8px 4px;">${_t('Provider','Provider')}</th>
          <th style="padding:8px 4px;">${_t('Model','Model')}</th>
          <th style="padding:8px 4px;text-align:right;"></th>
        </tr></thead>
        <tbody>
          ${docRules.length === 0 ? `<tr><td colspan="5" style="padding:14px;color:var(--text-3);text-align:center;">${_t('Chưa có override','No overrides yet')}</td></tr>`
            : docRules.map(r => `
            <tr style="border-bottom:1px solid var(--ln-2,#eee);">
              <td style="padding:8px 4px;">${r.scope_type}</td>
              <td style="padding:8px 4px;font-family:monospace;">${escapeHtml(r.scope_value)}</td>
              <td style="padding:8px 4px;">${escapeHtml(r.primary_provider)}</td>
              <td style="padding:8px 4px;">${escapeHtml(r.primary_model || '-')}</td>
              <td style="padding:8px 4px;text-align:right;">
                <button class="tx-rule-delete" data-rule-id="${r.routing_id}" style="background:none;border:0;color:var(--danger,#c00);cursor:pointer;font-size:13px;">${_t('Xóa','Delete')}</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <button id="tx-rule-add" style="margin-top:10px;padding:8px 14px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:13px;">+ ${_t('Thêm override','Add override')}</button>
    </section>
  `;
}

function renderRuleEditor(rule, scopeType, scopeValue, enabledProviders) {
  const primary = rule ? rule.primary_provider : (enabledProviders[0] && enabledProviders[0].provider_key) || '';
  const primaryModel = rule ? (rule.primary_model || '') : '';
  const fallbacks = rule && Array.isArray(rule.fallback_chain) ? rule.fallback_chain : [];

  return `
    <div style="display:grid;grid-template-columns:1fr 1fr auto;gap:8px;align-items:center;">
      <select class="tx-primary-provider" data-current-model="${escapeHtml(primaryModel)}" style="padding:6px 8px;">
        ${enabledProviders.map(p => `
          <option value="${p.provider_key}" ${p.provider_key === primary ? 'selected' : ''}>${escapeHtml(p.display_name)}</option>
        `).join('')}
      </select>
      <select class="tx-primary-model" data-selected-model="${escapeHtml(primaryModel)}" style="padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;">
        ${renderModelOptions(primary, primaryModel)}
      </select>
      <button class="tx-save-rule" style="padding:6px 14px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:13px;">${_t('Lưu','Save')}</button>
    </div>
    <details style="margin-top:8px;">
      <summary style="cursor:pointer;color:var(--text-3);font-size:12px;">${_t('Fallback chain','Fallback chain')} (${fallbacks.length})</summary>
      <div class="tx-fallbacks" style="margin-top:6px;font-size:12px;">
        ${fallbacks.length === 0 ? `<i style="color:var(--text-3);">${_t('Không có fallback','No fallback')}</i>`
          : fallbacks.map((fb, i) => `<div>${i + 1}. ${escapeHtml(fb.provider)} / ${escapeHtml(fb.model || '-')}</div>`).join('')}
        <input class="tx-add-fallback" type="text" placeholder="${_t('provider:model — vd nllb:nllb-200-distilled-600M','provider:model — e.g. nllb:nllb-200-distilled-600M')}" style="margin-top:4px;padding:4px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;width:100%;font-size:12px;">
        <small style="color:var(--text-3);">${_t('Nhập rồi bấm Lưu để thêm fallback','Type then click Save to append.')}</small>
      </div>
    </details>
  `;
}

// Resolve the "best default" model id for a provider, in this order of trust:
//   1. The active routing rule (global_default / tier / per-doc) — what the
//      portal would actually invoke, so the test bench mirrors production.
//   2. credential.available_models[0]      — what the operator probed/loaded.
//   3. capabilities.candidate_models[0]    — the seed catalogue (last resort).
function defaultModelForProvider(providerKey) {
  const matchingRules = (STATE.rules || []).filter(r => r.primary_provider === providerKey && r.primary_model);
  if (matchingRules.length) return matchingRules[0].primary_model;
  const list = modelsForProvider(providerKey);
  return list && list[0] && list[0].id || null;
}

function modelsForProvider(providerKey) {
  const p = STATE.providers.find(pr => pr.provider_key === providerKey);
  if (!p) return [];
  const cred = p.credential || {};
  return normaliseModelList(cred.available_models)
    || normaliseModelList(p.capabilities && p.capabilities.candidate_models)
    || [];
}

/**
 * Normalise a JSONB column value (which may arrive as a JSON string from
 * Postgres or as an already-parsed array) into a list of model entries
 * `[{id, label, state?}]`. Returns null if the value is empty so callers
 * can chain through fallbacks with `||`.
 */
function normaliseModelList(value) {
  if (value == null) return null;
  if (typeof value === 'string') {
    if (value.trim() === '' || value === '[]') return null;
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) && parsed.length ? parsed : null;
    } catch (e) {
      return null;
    }
  }
  if (Array.isArray(value)) return value.length ? value : null;
  return null;
}

function renderModelOptions(providerKey, currentModel) {
  const list = modelsForProvider(providerKey);
  if (list.length === 0) {
    return `<option value="">${_t('(không có model)','(no models)')}</option>`;
  }
  // Always include current value so we don't silently lose a previously-set model
  const has = list.some(m => m.id === currentModel);
  const opts = list.map(m => `<option value="${escapeHtml(m.id)}" ${m.id === currentModel ? 'selected' : ''}>${escapeHtml(m.label || m.id)}${m.state && m.state !== 'available' && m.state !== 'candidate' ? ' (' + m.state + ')' : ''}</option>`).join('');
  return (currentModel && !has ? `<option value="${escapeHtml(currentModel)}" selected>${escapeHtml(currentModel)} (legacy)</option>` : '') + opts;
}

function wireRouting() {
  // Re-populate model dropdown when provider changes.
  document.querySelectorAll('.tx-primary-provider').forEach(sel => {
    sel.addEventListener('change', () => {
      const card = sel.closest('.tx-rule-card');
      const modelSel = card.querySelector('.tx-primary-model');
      if (modelSel) modelSel.innerHTML = renderModelOptions(sel.value, '');
    });
  });

  document.querySelectorAll('.tx-save-rule').forEach(btn => {
    btn.addEventListener('click', () => {
      const card = btn.closest('.tx-rule-card');
      const ruleId = parseInt(card.dataset.ruleId || '0', 10);
      const scopeType = card.dataset.scopeType;
      const scopeValue = card.dataset.scopeValue;
      const provider = card.querySelector('.tx-primary-provider').value;
      const model = card.querySelector('.tx-primary-model').value.trim() || null;
      const newFallbackRaw = (card.querySelector('.tx-add-fallback') || {}).value || '';

      const existing = findRule(scopeType, scopeValue);
      let chain = (existing && Array.isArray(existing.fallback_chain)) ? [...existing.fallback_chain] : [];
      if (newFallbackRaw.trim()) {
        const [pk, mid] = newFallbackRaw.split(':');
        if (pk) chain.push({ provider: pk.trim(), model: (mid || '').trim() || null });
      }

      const body = {
        scope_type: scopeType,
        scope_value: scopeValue,
        primary_provider: provider,
        primary_model: model,
        fallback_chain: chain,
        is_enabled: true,
      };
      const path = ruleId > 0
        ? `/api/v1/dcc/admin/translation/routing/${ruleId}`
        : '/api/v1/dcc/admin/translation/routing';
      const method = ruleId > 0 ? 'PUT' : 'POST';
      api(method, path, body).then(() => {
        toast(_t('Đã lưu rule', 'Rule saved'));
        loadAll();
      }).catch(err => { STATE.error = String(err.message || err); render(); });
    });
  });

  document.querySelectorAll('.tx-rule-delete').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.pending === '1') {
        const id = parseInt(btn.dataset.ruleId, 10);
        api('DELETE', `/api/v1/dcc/admin/translation/routing/${id}`)
          .then(() => { toast(_t('Đã xóa', 'Deleted')); loadAll(); })
          .catch(err => { toast('Error: ' + err.message); btn.disabled = false; });
        return;
      }
      btn.dataset.pending = '1';
      const orig = btn.textContent;
      btn.textContent = _t('Xác nhận xóa?', 'Confirm delete?');
      btn.style.cssText += ';color:var(--danger,#c00);font-weight:600;';
      setTimeout(() => {
        if (btn.dataset.pending === '1') {
          delete btn.dataset.pending;
          btn.textContent = orig;
          btn.style.color = '';
          btn.style.fontWeight = '';
        }
      }, 3000);
    });
  });

  const addBtn = document.getElementById('tx-rule-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => openAddOverrideModal());
  }
}

function openAddOverrideModal() {
  const enabled = STATE.providers.filter(p => p.is_enabled);
  let existing = document.getElementById('tx-add-override-modal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'tx-add-override-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.45);z-index:99999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--bg,#fff);border-radius:10px;padding:24px;max-width:500px;width:90%;box-shadow:0 8px 32px rgba(0,0,0,.18);">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
      <h3 style="margin:0;font-size:15px;">${_t('Thêm override theo tài liệu / pattern', 'Add per-document / pattern override')}</h3>
      <button id="tx-aom-close" style="background:none;border:0;font-size:22px;cursor:pointer;color:var(--text-3);">×</button>
    </header>
    <div style="display:flex;flex-direction:column;gap:10px;">
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">${_t('Doc code hoặc pattern', 'Doc code or pattern')} <span style="color:var(--text-3);font-weight:400;">(vd: QMS-MAN-001 hoặc qms-man-*)</span></label>
        <input id="tx-aom-scope" type="text" placeholder="QMS-MAN-001"
          style="width:100%;padding:8px 10px;border:1px solid var(--ln,#ddd);border-radius:5px;font-size:13px;box-sizing:border-box;">
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">${_t('Provider', 'Provider')}</label>
        <select id="tx-aom-provider" style="width:100%;padding:7px 8px;border:1px solid var(--ln,#ddd);border-radius:5px;font-size:13px;">
          ${enabled.map(p => `<option value="${escapeHtml(p.provider_key)}">${escapeHtml(p.display_name)}</option>`).join('')}
        </select>
      </div>
      <div>
        <label style="font-size:12px;font-weight:600;display:block;margin-bottom:4px;">${_t('Model', 'Model')} <span style="color:var(--text-3);font-weight:400;">(${_t('để trống nếu không cần', 'blank if not needed')})</span></label>
        <select id="tx-aom-model" style="width:100%;padding:7px 8px;border:1px solid var(--ln,#ddd);border-radius:5px;font-size:13px;">
          ${enabled.length ? renderModelOptions(enabled[0].provider_key, '') : '<option value="">(no models)</option>'}
        </select>
      </div>
      <div id="tx-aom-error" style="color:var(--danger,#c00);font-size:12px;min-height:16px;"></div>
    </div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px;">
      <button id="tx-aom-cancel" style="padding:8px 16px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:5px;cursor:pointer;font-size:13px;">${_t('Hủy', 'Cancel')}</button>
      <button id="tx-aom-save" style="padding:8px 18px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:5px;cursor:pointer;font-size:13px;font-weight:600;">${_t('Thêm override', 'Add override')}</button>
    </div>
  </div>`;
  document.body.appendChild(modal);

  const close = () => modal.remove();
  document.getElementById('tx-aom-close').addEventListener('click', close);
  document.getElementById('tx-aom-cancel').addEventListener('click', close);
  modal.addEventListener('click', e => { if (e.target === modal) close(); });

  const provSel = document.getElementById('tx-aom-provider');
  const modelSel = document.getElementById('tx-aom-model');
  if (provSel) {
    provSel.addEventListener('change', () => {
      if (modelSel) modelSel.innerHTML = renderModelOptions(provSel.value, '');
    });
  }

  document.getElementById('tx-aom-save').addEventListener('click', () => {
    const scopeValue = (document.getElementById('tx-aom-scope').value || '').trim();
    const provider = provSel ? provSel.value : '';
    const model = (modelSel && modelSel.value.trim()) || null;
    const errEl = document.getElementById('tx-aom-error');
    if (!scopeValue) { if (errEl) errEl.textContent = _t('Nhập doc_code hoặc pattern', 'Enter doc_code or pattern'); return; }
    if (!provider) { if (errEl) errEl.textContent = _t('Chọn provider', 'Select provider'); return; }
    if (errEl) errEl.textContent = '';
    const saveBtn = document.getElementById('tx-aom-save');
    saveBtn.disabled = true; saveBtn.textContent = '⟳ ' + _t('Đang lưu...', 'Saving...');
    const scopeType = scopeValue.includes('*') ? 'doc_pattern' : 'doc_code';
    api('POST', '/api/v1/dcc/admin/translation/routing', {
      scope_type: scopeType, scope_value: scopeValue,
      primary_provider: provider, primary_model: model,
      fallback_chain: [], is_enabled: true,
    }).then(() => { toast(_t('Đã thêm override', 'Override added')); close(); loadAll(); })
      .catch(err => {
        if (errEl) errEl.textContent = err.message;
        saveBtn.disabled = false; saveBtn.textContent = _t('Thêm override', 'Add override');
      });
  });
}

// ── Tab 2: Providers ─────────────────────────────────────────────────────────

function renderProviders() {
  let html = '';
  if (!STATE.vaultReady) {
    html += `<div style="padding:14px;background:var(--warn-bg,#fff8e1);border:1px solid var(--warn,#e0a000);border-radius:8px;margin-bottom:14px;">
      <strong>${_t('⚠ Vault chưa sẵn sàng','⚠ Vault not ready')}:</strong> ${escapeHtml(STATE.vaultHint || '')}
    </div>`;
  }
  html += STATE.providers.map(p => renderProviderCard(p)).join('');
  return html;
}

function renderProviderCard(p) {
  const cred = p.credential || {};
  const statusColor = ({
    ok: 'var(--success,#0a7e3a)',
    auth_failed: 'var(--danger,#c00)',
    binary_missing: 'var(--danger,#c00)',
    quota_exceeded: 'var(--warn,#e0a000)',
    network_error: 'var(--warn,#e0a000)',
    timeout: 'var(--warn,#e0a000)',
    config_error: 'var(--text-3)',
  })[cred.last_test_status] || 'var(--text-3)';
  const kindLabel = p.provider_kind === 'cli_subscription' ? _t('CLI subscription','CLI subscription')
                  : p.provider_kind === 'http_api' ? _t('HTTP API','HTTP API')
                  : _t('Local model','Local model');
  const isCli = p.provider_kind === 'cli_subscription';
  const isApi = p.provider_kind === 'http_api';
  const isConnected = isCli && !!cred.cli_auth_subject;

  // Available models dropdown — populated from credential.available_models if
  // present, otherwise fall back to capabilities.candidate_models.
  // Postgres JSONB columns may come back as a string or an array depending on
  // the driver, so normalise here.
  const candidates = normaliseModelList(cred.available_models)
    || normaliseModelList(p.capabilities && p.capabilities.candidate_models)
    || [];

  return `<section class="tx-provider-card" data-provider-key="${p.provider_key}"
    style="padding:16px;border:1px solid var(--ln,#ddd);border-radius:8px;margin-bottom:12px;background:var(--bg,#fff);">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px;">
      <div>
        <strong style="font-size:15px;">${escapeHtml(p.display_name)}</strong>
        <div style="font-size:12px;color:var(--text-3);">${escapeHtml(p.provider_key)} · ${kindLabel}</div>
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;">
        <input type="checkbox" class="tx-provider-toggle" ${p.is_enabled ? 'checked' : ''}>
        ${_t('Bật','Enabled')}
      </label>
    </header>

    ${isCli ? `
      <!-- Account section -->
      <div style="padding:10px;background:var(--bg-2,#f5f7fb);border-radius:6px;margin-bottom:10px;">
        <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap;">
          <div style="font-size:13px;">
            ${isConnected ? `
              <span style="color:var(--success,#0a7e3a);">●</span>
              <strong>${_t('Đã đăng nhập','Connected')}:</strong> ${escapeHtml(cred.cli_auth_subject || '?')}
            ` : `
              <span style="color:var(--text-3);">○</span>
              <em style="color:var(--text-3);">${_t('Chưa đăng nhập tài khoản','No account connected')}</em>
            `}
          </div>
          <div style="display:flex;gap:6px;">
            <button class="tx-cli-login" style="padding:6px 14px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:12px;">
              ${isConnected ? _t('🔄 Đổi tài khoản','🔄 Switch account') : _t('🔑 Đăng nhập','🔑 Connect')}
            </button>
            ${isConnected ? `<button class="tx-cli-logout" style="padding:6px 14px;background:none;border:1px solid var(--danger,#c00);color:var(--danger,#c00);border-radius:4px;cursor:pointer;font-size:12px;">${_t('Đăng xuất','Logout')}</button>` : ''}
            <button class="tx-probe-cli" style="padding:6px 14px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:4px;cursor:pointer;font-size:12px;">${_t('Probe','Probe')}</button>
          </div>
        </div>
        <div style="font-size:12px;color:var(--text-2);margin-top:6px;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${statusColor};margin-right:5px;"></span>
          ${cred.last_test_status ? escapeHtml(cred.last_test_status) : _t('Chưa test','Never tested')}
          ${cred.last_test_message ? ' — ' + escapeHtml(String(cred.last_test_message).substr(0, 180)) : ''}
        </div>
      </div>

      <!-- Runtime config (binary path, auth home) -->
      <details style="margin-bottom:8px;">
        <summary style="cursor:pointer;color:var(--text-3);font-size:12px;">${_t('Cấu hình runtime (binary, auth home)','Runtime config (binary, auth home)')}</summary>
        <div style="margin-top:6px;display:grid;grid-template-columns:1fr 1fr auto;gap:6px;align-items:center;font-size:12px;">
          <input type="text" class="tx-cli-binary" placeholder="${escapeHtml(p.capabilities && p.capabilities.cli_binary_default || '/usr/local/bin/...')}"
                 value="${escapeHtml(cred.cli_binary_path || '')}" style="padding:5px;border:1px solid var(--ln,#ddd);border-radius:4px;">
          <input type="text" class="tx-cli-home" placeholder="${escapeHtml(p.capabilities && p.capabilities.cli_auth_home_default || '/var/lib/dcc-cli-runtime')}"
                 value="${escapeHtml(cred.cli_auth_home_path || '')}" style="padding:5px;border:1px solid var(--ln,#ddd);border-radius:4px;">
          <button class="tx-save-cli" style="padding:5px 12px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;">${_t('Lưu','Save')}</button>
        </div>
        <small style="color:var(--text-3);">${_t('Path tới binary CLI / thư mục HOME chứa credentials','Binary path / HOME directory containing credentials')}</small>
      </details>

      <!-- Available models -->
      ${candidates.length > 0 ? `
        <div style="font-size:12px;color:var(--text-3);">
          <strong>${_t('Models có thể dùng','Available models')}:</strong>
          ${candidates.map(m => `<code style="background:var(--bg-2,#f5f5f5);padding:1px 5px;border-radius:3px;margin:0 2px;">${escapeHtml(m.id)}</code>`).join(' ')}
        </div>
      ` : `<small style="color:var(--text-3);">${_t('Refresh ở tab Model để probe danh sách model','Refresh on Model tab to probe model list')}</small>`}
    ` : ''}

    ${isApi ? `
      <div style="margin-top:10px;display:grid;grid-template-columns:1fr auto auto;gap:6px;align-items:center;font-size:12px;">
        <input type="password" class="tx-api-key" placeholder="${cred.key_fingerprint ? '••••••••' + escapeHtml(String(cred.key_fingerprint).substr(-6)) : 'sk-...'}"
               style="padding:5px;border:1px solid var(--ln,#ddd);border-radius:4px;">
        <button class="tx-save-key" style="padding:5px 12px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;" ${STATE.vaultReady ? '' : 'disabled'}>${_t('Lưu','Save')}</button>
        <button class="tx-delete-key" style="padding:5px 12px;background:none;color:var(--danger,#c00);border:1px solid var(--danger,#c00);border-radius:4px;cursor:pointer;">${_t('Xóa','Delete')}</button>
      </div>
      ${cred.key_fingerprint ? `<small style="color:var(--text-3);">FP: ${escapeHtml(cred.key_fingerprint)}</small>` : ''}
    ` : ''}

    ${!isCli && !isApi ? `
      <div style="font-size:12px;color:var(--text-3);">
        ${_t('Engine local (không cần đăng nhập)','Local engine (no login required)')}
      </div>
    ` : ''}
  </section>`;
}

function wireProviders() {
  document.querySelectorAll('.tx-provider-card').forEach(card => {
    const key = card.dataset.providerKey;

    const toggle = card.querySelector('.tx-provider-toggle');
    if (toggle) toggle.addEventListener('change', () => {
      api('PUT', `/api/v1/dcc/admin/translation/providers/${encodeURIComponent(key)}`, { is_enabled: toggle.checked })
        .then(() => { toast(_t('Đã cập nhật','Updated')); loadAll(); })
        .catch(err => { toggle.checked = !toggle.checked; toast('Error: ' + err.message); });
    });

    const probe = card.querySelector('.tx-probe-cli');
    if (probe) probe.addEventListener('click', () => {
      probe.disabled = true; probe.textContent = '...';
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}/probe`)
        .then(d => { toast(`${key}: ${d.probe.status} — ${d.probe.message}`); loadAll(); })
        .catch(err => toast('Error: ' + err.message))
        .finally(() => { probe.disabled = false; probe.textContent = _t('Probe','Probe'); });
    });

    const saveCli = card.querySelector('.tx-save-cli');
    if (saveCli) saveCli.addEventListener('click', () => {
      const binary = card.querySelector('.tx-cli-binary').value.trim();
      const home = card.querySelector('.tx-cli-home').value.trim();
      saveCli.disabled = true;
      api('PUT', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`, {
        cli_binary_path: binary, cli_auth_home_path: home,
      }).then(() => { toast(_t('Đã lưu','Saved')); loadAll(); })
        .catch(err => toast('Error: ' + err.message))
        .finally(() => { saveCli.disabled = false; });
    });

    const saveKey = card.querySelector('.tx-save-key');
    if (saveKey) saveKey.addEventListener('click', () => {
      const apiKey = card.querySelector('.tx-api-key').value;
      if (!apiKey) { toast(_t('Nhập API key','Enter API key')); return; }
      saveKey.disabled = true;
      api('PUT', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`, { api_key: apiKey })
        .then(d => { toast(`${_t('Đã lưu — fingerprint','Saved — fingerprint')}: ${d.fingerprint}`); loadAll(); })
        .catch(err => toast('Error: ' + err.message))
        .finally(() => { saveKey.disabled = false; });
    });

    const delKey = card.querySelector('.tx-delete-key');
    if (delKey) delKey.addEventListener('click', () => {
      if (delKey.dataset.pending === '1') {
        api('DELETE', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`)
          .then(() => { toast(_t('Đã xóa','Deleted')); loadAll(); })
          .catch(err => toast('Error: ' + err.message));
        return;
      }
      delKey.dataset.pending = '1';
      const orig = delKey.textContent;
      delKey.textContent = _t('Xác nhận xóa?','Confirm delete?');
      delKey.style.background = 'var(--danger,#c00)';
      delKey.style.color = '#fff';
      setTimeout(() => {
        if (delKey.dataset.pending === '1') {
          delete delKey.dataset.pending;
          delKey.textContent = orig;
          delKey.style.background = '';
          delKey.style.color = 'var(--danger,#c00)';
        }
      }, 3000);
    });

    const loginBtn = card.querySelector('.tx-cli-login');
    if (loginBtn) loginBtn.addEventListener('click', () => openCliLoginModal(key));

    const logoutBtn = card.querySelector('.tx-cli-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      if (logoutBtn.dataset.pending === '1') {
        api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}/logout`)
          .then(() => { toast(_t('Đã đăng xuất','Logged out')); loadAll(); })
          .catch(err => toast('Error: ' + err.message));
        return;
      }
      logoutBtn.dataset.pending = '1';
      const orig = logoutBtn.textContent;
      logoutBtn.textContent = _t('Xác nhận đăng xuất?','Confirm logout?');
      logoutBtn.style.background = 'var(--danger,#c00)';
      logoutBtn.style.color = '#fff';
      logoutBtn.style.borderColor = 'var(--danger,#c00)';
      setTimeout(() => {
        if (logoutBtn.dataset.pending === '1') {
          delete logoutBtn.dataset.pending;
          logoutBtn.textContent = orig;
          logoutBtn.style.background = '';
          logoutBtn.style.color = 'var(--danger,#c00)';
        }
      }, 3000);
    });
  });
}

// ── CLI login modal ──────────────────────────────────────────────────────────

function openCliLoginModal(providerKey) {
  // Build / replace modal scaffolding
  let modal = document.getElementById('tx-cli-login-modal');
  if (modal) modal.remove();
  modal = document.createElement('div');
  modal.id = 'tx-cli-login-modal';
  modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:99999;display:flex;align-items:center;justify-content:center;';
  modal.innerHTML = `<div style="background:var(--bg,#fff);border-radius:10px;padding:24px;max-width:600px;width:90%;max-height:90vh;overflow:auto;">
    <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:14px;">
      <h3 style="margin:0;">${_t('Đăng nhập CLI','CLI Login')}: <code>${escapeHtml(providerKey)}</code></h3>
      <button id="tx-cli-modal-close" style="background:none;border:0;font-size:24px;cursor:pointer;color:var(--text-3);">×</button>
    </header>
    <div id="tx-cli-modal-body">
      <div style="text-align:center;padding:30px;color:var(--text-3);">
        ⟳ ${_t('Đang khởi tạo session đăng nhập...','Starting login session...')}
      </div>
    </div>
  </div>`;
  document.body.appendChild(modal);
  document.getElementById('tx-cli-modal-close').addEventListener('click', () => modal.remove());
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  // Kick off the login session
  api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(providerKey)}/login/start`)
    .then(d => renderCliLoginModalBody(providerKey, d.session))
    .catch(err => {
      const body = document.getElementById('tx-cli-modal-body');
      if (body) body.innerHTML = `<div style="color:var(--danger,#c00);padding:14px;">${escapeHtml(err.message)}</div>`;
    });
}

function renderCliLoginModalBody(providerKey, session) {
  const body = document.getElementById('tx-cli-modal-body');
  if (!body) return;
  const flow = session.flow || 'paste';
  const instructions = (lang === 'en' ? session.instructions_en : session.instructions_vi) || '';

  // ── API-key flow (Codex): no auth URL, just paste the key ───────────────────
  if (flow === 'api_key') {
    body.innerHTML = `
      ${instructions ? `<p style="font-size:13px;color:var(--text-2);white-space:pre-line;margin:0 0 14px;">${escapeHtml(instructions)}</p>` : ''}
      <div style="padding:14px;background:var(--bg-2,#f5f7fb);border-radius:6px;">
        <label style="display:block;font-size:13px;margin-bottom:6px;font-weight:600;">${_t('OpenAI API key','OpenAI API key')}:</label>
        <textarea id="tx-paste-code" rows="2" placeholder="sk-..." style="width:100%;padding:8px;font-family:monospace;font-size:12px;border:1px solid var(--ln,#ddd);border-radius:4px;box-sizing:border-box;"></textarea>
        <div style="margin-top:10px;text-align:right;">
          <button id="tx-cli-submit-code" style="padding:8px 20px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:14px;">${_t('Đăng nhập','Login')}</button>
        </div>
      </div>
    `;
    document.getElementById('tx-cli-submit-code').addEventListener('click', () => {
      const token = (document.getElementById('tx-paste-code').value || '').trim();
      if (!token) return alert(_t('Nhập API key trước','Enter the API key first'));
      const btn = document.getElementById('tx-cli-submit-code');
      btn.disabled = true; btn.textContent = '⟳ ' + _t('Đang xử lý...','Processing...');
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(providerKey)}/login/complete`, {
        session_id: session.session_id, code: token,
      }).then(d => handleLoginResult(d.result, providerKey))
        .catch(err => {
          alert(err.message);
          btn.disabled = false; btn.textContent = _t('Đăng nhập','Login');
        });
    });
    return;
  }

  // ── OAuth / paste flows (Claude and device-auth) ─────────────────────────────
  const url = session.auth_url || '';
  const code = session.pairing_code || '';
  const isPaste = !!session.expects_paste;

  body.innerHTML = `
    <ol style="font-size:14px;line-height:1.6;padding-left:20px;">
      <li>${_t('Mở URL bên dưới trong tab mới của browser','Open the URL below in a new browser tab')}:
        <div style="margin:6px 0;display:flex;gap:6px;align-items:center;">
          <a href="${escapeHtml(url)}" target="_blank" rel="noopener" style="word-break:break-all;color:var(--brand-primary,#0c63e7);text-decoration:underline;">${escapeHtml(url)}</a>
          <button id="tx-copy-url" style="padding:3px 8px;border:1px solid var(--ln,#ddd);background:var(--bg-2,#f5f5f5);border-radius:3px;cursor:pointer;font-size:11px;">📋</button>
        </div>
      </li>
      ${code ? `
        <li>${_t('Nhập mã sau khi browser hỏi','Enter this code when the browser asks')}:
          <div style="font-family:monospace;font-size:18px;background:var(--bg-2,#f5f5f5);padding:8px 12px;border-radius:4px;display:inline-block;margin:6px 0;letter-spacing:2px;font-weight:600;">${escapeHtml(code)}</div>
          <button id="tx-copy-code" style="padding:3px 8px;border:1px solid var(--ln,#ddd);background:var(--bg-2,#f5f5f5);border-radius:3px;cursor:pointer;font-size:11px;">📋</button>
        </li>` : ''}
      <li>${_t('Đăng nhập tài khoản subscription của bạn rồi nhấn Approve','Sign in to your subscription account, then click Approve')}</li>
    </ol>

    ${isPaste ? `
      <div style="margin-top:14px;padding:14px;background:var(--bg-2,#f5f7fb);border-radius:6px;">
        <label style="display:block;font-size:13px;margin-bottom:6px;font-weight:600;">${_t('Paste token từ Claude vào đây','Paste the token from Claude here')}:</label>
        <textarea id="tx-paste-code" rows="3" placeholder="sk-ant-oat01-..." style="width:100%;padding:8px;font-family:monospace;font-size:12px;border:1px solid var(--ln,#ddd);border-radius:4px;"></textarea>
        <div style="margin-top:8px;text-align:right;">
          <button id="tx-cli-submit-code" style="padding:8px 18px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;">${_t('Hoàn tất đăng nhập','Complete login')}</button>
        </div>
      </div>
    ` : `
      <div style="margin-top:14px;padding:14px;background:var(--bg-2,#f5f7fb);border-radius:6px;text-align:center;">
        <button id="tx-cli-poll" style="padding:10px 22px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:14px;">${_t('Đợi xác nhận từ browser','Wait for browser approval')}</button>
        <div id="tx-cli-poll-status" style="margin-top:8px;font-size:12px;color:var(--text-3);"></div>
      </div>
    `}
  `;

  const copyUrl = document.getElementById('tx-copy-url');
  if (copyUrl) copyUrl.addEventListener('click', () => navigator.clipboard.writeText(url).then(() => toast(_t('Đã copy URL','URL copied'))));
  const copyCode = document.getElementById('tx-copy-code');
  if (copyCode) copyCode.addEventListener('click', () => navigator.clipboard.writeText(code).then(() => toast(_t('Đã copy mã','Code copied'))));

  if (isPaste) {
    document.getElementById('tx-cli-submit-code').addEventListener('click', () => {
      const tokenInput = document.getElementById('tx-paste-code');
      const token = (tokenInput.value || '').trim();
      if (!token) { toast(_t('Paste token trước','Paste the token first')); return; }
      const btn = document.getElementById('tx-cli-submit-code');
      btn.disabled = true; btn.textContent = '⟳ ' + _t('Đang xử lý...','Processing...');
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(providerKey)}/login/complete`, {
        session_id: session.session_id, code: token,
      }).then(d => handleLoginResult(d.result, providerKey))
        .catch(err => {
          toast('Error: ' + err.message);
          btn.disabled = false; btn.textContent = _t('Hoàn tất đăng nhập','Complete login');
        });
    });
  } else {
    document.getElementById('tx-cli-poll').addEventListener('click', () => {
      pollDeviceAuth(providerKey, session.session_id);
    });
  }
}

function pollDeviceAuth(providerKey, sessionId) {
  const status = document.getElementById('tx-cli-poll-status');
  const btn = document.getElementById('tx-cli-poll');
  if (btn) { btn.disabled = true; btn.textContent = '⟳ ' + _t('Đang đợi...','Waiting...'); }
  if (status) status.textContent = _t('Đang poll mỗi 25s...','Polling every 25s...');

  let attempts = 0;
  const maxAttempts = 12; // ~5 min total (25s × 12)
  const poll = () => {
    attempts++;
    api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(providerKey)}/login/complete`, {
      session_id: sessionId, code: '',
    }).then(d => {
      if (d.result.state === 'completed') {
        handleLoginResult(d.result, providerKey);
      } else if (d.result.state === 'pending' && attempts < maxAttempts) {
        if (status) status.textContent = `${_t('Đang đợi','Waiting')}... (${attempts}/${maxAttempts})`;
        setTimeout(poll, 1000);
      } else {
        handleLoginResult(d.result, providerKey);
      }
    }).catch(err => {
      if (status) status.textContent = String(err.message || err);
      if (btn) { btn.disabled = false; btn.textContent = _t('Thử lại','Retry'); }
    });
  };
  poll();
}

function handleLoginResult(result, providerKey) {
  const body = document.getElementById('tx-cli-modal-body');
  if (!body) return;
  if (result.state === 'completed') {
    body.innerHTML = `<div style="text-align:center;padding:30px;">
      <div style="font-size:48px;margin-bottom:10px;">✅</div>
      <h3 style="margin:6px 0;color:var(--success,#0a7e3a);">${_t('Đăng nhập thành công','Login successful')}</h3>
      <p style="font-size:13px;color:var(--text-2);">
        ${_t('Tài khoản','Account')}: <strong>${escapeHtml(result.account.subject || '?')}</strong><br>
        ${_t('Subscription','Subscription')}: <strong>${escapeHtml(result.account.subscription || '?')}</strong>
      </p>
      <button id="tx-cli-modal-close-2" style="margin-top:16px;padding:8px 22px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;">${_t('Đóng','Close')}</button>
    </div>`;
    document.getElementById('tx-cli-modal-close-2').addEventListener('click', () => {
      document.getElementById('tx-cli-login-modal').remove();
      loadAll();
    });
    toast(`${providerKey}: ${_t('connected','connected')} ✓`);
  } else if (result.state === 'failed') {
    body.innerHTML = `<div style="padding:18px;color:var(--danger,#c00);">
      <strong>${_t('Đăng nhập thất bại','Login failed')}</strong>
      <p>${escapeHtml(result.message || '')}</p>
      <details style="margin-top:8px;"><summary style="cursor:pointer;">CLI output</summary>
        <pre style="font-size:11px;background:var(--bg-2,#f5f5f5);padding:8px;border-radius:4px;white-space:pre-wrap;">${escapeHtml(result.tail || '')}</pre>
      </details>
    </div>`;
  } else {
    // pending / unknown
    body.innerHTML += `<div style="margin-top:10px;padding:10px;background:var(--warn-bg,#fff8e1);border-radius:6px;font-size:12px;">
      ${_t('Vẫn đang đợi xác nhận. Đảm bảo bạn đã hoàn tất bước Approve trên browser.','Still waiting for approval. Make sure you have completed the Approve step in the browser.')}
    </div>`;
  }
}

// ── Tab 3: Models ────────────────────────────────────────────────────────────

function renderModels() {
  return STATE.providers.map(p => {
    const models = STATE.modelsByProvider[p.provider_key];
    return `<section style="padding:14px;border:1px solid var(--ln,#ddd);border-radius:8px;margin-bottom:10px;background:var(--bg,#fff);">
      <header style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
        <strong>${escapeHtml(p.display_name)}</strong>
        <button class="tx-refresh-models" data-key="${p.provider_key}" style="padding:4px 10px;border:1px solid var(--ln,#ddd);background:var(--bg-2,#f5f5f5);border-radius:4px;cursor:pointer;font-size:12px;">↻ ${_t('Refresh','Refresh')}</button>
      </header>
      ${!models ? `<i style="color:var(--text-3);font-size:13px;">${_t('Đang tải...','Loading...')}</i>`
        : models.length === 0 ? `<i style="color:var(--text-3);font-size:13px;">${_t('Không có model','No models')}</i>`
        : `<ul style="margin:0;padding-left:20px;font-size:13px;">
            ${models.map(m => `<li><code style="background:var(--bg-2,#f5f5f5);padding:1px 4px;border-radius:3px;">${escapeHtml(m.id)}</code> — ${escapeHtml(m.label || m.id)} <span style="color:var(--text-3);">(${escapeHtml(m.state || '?')})</span></li>`).join('')}
          </ul>`}
    </section>`;
  }).join('');
}

function wireModels() {
  document.querySelectorAll('.tx-refresh-models').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      btn.disabled = true; btn.textContent = '...';
      api('POST', `/api/v1/dcc/admin/translation/models/${encodeURIComponent(key)}/refresh`)
        .then(d => { STATE.modelsByProvider[key] = d.models || []; render(); toast(_t('Đã refresh','Refreshed')); })
        .catch(err => toast('Error: ' + err.message))
        .finally(() => { btn.disabled = false; btn.textContent = '↻ ' + _t('Refresh','Refresh'); });
    });
  });
}

// ── Tab 4: Test Bench ────────────────────────────────────────────────────────

function renderTestBench() {
  const enabled = STATE.providers.filter(p => p.is_enabled);
  return `<section>
    <p style="color:var(--text-3);font-size:13px;margin:0 0 10px 0;">${_t(
      'Dán đoạn HTML/text tiếng Việt và chọn 1+ provider để dịch song song. Kết quả KHÔNG ghi vào tài liệu nào — chỉ để so sánh.',
      'Paste a Vietnamese HTML/text snippet and pick 1+ providers. Results are NOT written to any document — comparison only.'
    )}</p>
    <textarea id="tx-test-source" rows="6" placeholder="${_t('Dán nội dung tiếng Việt ở đây...','Paste Vietnamese content here...')}"
      style="width:100%;padding:10px;border:1px solid var(--ln,#ddd);border-radius:6px;font-family:monospace;font-size:13px;">${escapeHtml(STATE.testInput.source_html)}</textarea>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px;">
      <input id="tx-test-title" type="text" placeholder="${_t('Title (vd: QMS Manual)','Title (e.g. QMS Manual)')}" value="${escapeHtml(STATE.testInput.title)}" style="padding:6px;border:1px solid var(--ln,#ddd);border-radius:4px;">
      <input id="tx-test-subtitle" type="text" placeholder="${_t('Subtitle','Subtitle')}" value="${escapeHtml(STATE.testInput.subtitle)}" style="padding:6px;border:1px solid var(--ln,#ddd);border-radius:4px;">
    </div>
    <div style="margin:10px 0;display:flex;flex-direction:column;gap:6px;">
      ${enabled.map(p => {
        const checked = STATE.testInput.selectedProviders.includes(p.provider_key);
        const currentModel = STATE.testInput.modelByProvider[p.provider_key]
          || defaultModelForProvider(p.provider_key) || '';
        const hasModels = (modelsForProvider(p.provider_key) || []).length > 0;
        return `
        <div style="display:flex;align-items:center;gap:10px;padding:6px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
          <label style="display:flex;align-items:center;gap:6px;cursor:pointer;flex:0 0 auto;">
            <input type="checkbox" class="tx-test-provider-pick" data-key="${p.provider_key}" ${checked ? 'checked' : ''}>
            <strong>${escapeHtml(p.display_name)}</strong>
          </label>
          ${hasModels ? `
            <span style="color:var(--text-3);font-size:12px;">model:</span>
            <select class="tx-test-model-pick" data-key="${p.provider_key}" style="padding:3px 6px;border:1px solid var(--ln,#ddd);border-radius:3px;font-size:12px;">
              ${renderModelOptions(p.provider_key, currentModel)}
            </select>
          ` : `<span style="color:var(--text-3);font-size:12px;">${_t('không có model','no model')}</span>`}
        </div>`;
      }).join('')}
    </div>
    <button id="tx-test-run" style="padding:10px 20px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:6px;cursor:pointer;font-size:14px;">▶ ${_t('Chạy test','Run test')}</button>

    <div id="tx-test-results" style="margin-top:18px;display:grid;grid-template-columns:repeat(auto-fit,minmax(380px,1fr));gap:10px;">
      ${STATE.testResults.map(r => renderTestResult(r)).join('')}
    </div>
  </section>`;
}

function renderTestResult(r) {
  const ok = r.ok;
  const html = (r.response && r.response.html) || (r.response && r.response.raw_stdout) || '';
  return `<div style="padding:12px;border:1px solid ${ok ? 'var(--ln,#ddd)' : 'var(--danger,#c00)'};border-radius:6px;background:var(--bg,#fff);">
    <header style="display:flex;justify-content:space-between;font-size:13px;margin-bottom:6px;">
      <strong>${escapeHtml(r.provider_key)}${r.model_id ? ` / ${escapeHtml(r.model_id)}` : ''}</strong>
      <span style="color:${ok ? 'var(--success,#0a7e3a)' : 'var(--danger,#c00)'};">${ok ? '✓' : '✗'} ${r.duration_ms}ms</span>
    </header>
    ${ok ? `<div style="max-height:300px;overflow:auto;font-size:12px;border:1px solid var(--ln-2,#eee);padding:8px;background:var(--bg-2,#fafafa);">${escapeHtml(html.substr(0, 2000))}${html.length > 2000 ? '...' : ''}</div>`
         : `<div style="color:var(--danger,#c00);font-size:12px;">${escapeHtml(JSON.stringify(r.response || {}).substr(0, 500))}</div>`}
    ${r.stderr_excerpt ? `<details style="margin-top:6px;font-size:11px;color:var(--text-3);"><summary>stderr</summary><pre style="white-space:pre-wrap;">${escapeHtml(r.stderr_excerpt)}</pre></details>` : ''}
  </div>`;
}

function wireTestBench() {
  const sourceEl = document.getElementById('tx-test-source');
  const titleEl = document.getElementById('tx-test-title');
  const subEl = document.getElementById('tx-test-subtitle');
  if (sourceEl) sourceEl.addEventListener('input', e => { STATE.testInput.source_html = e.target.value; });
  if (titleEl) titleEl.addEventListener('input', e => { STATE.testInput.title = e.target.value; });
  if (subEl) subEl.addEventListener('input', e => { STATE.testInput.subtitle = e.target.value; });

  document.querySelectorAll('.tx-test-provider-pick').forEach(cb => {
    cb.addEventListener('change', () => {
      const key = cb.dataset.key;
      const set = new Set(STATE.testInput.selectedProviders);
      if (cb.checked) set.add(key); else set.delete(key);
      STATE.testInput.selectedProviders = [...set];
    });
  });
  document.querySelectorAll('.tx-test-model-pick').forEach(sel => {
    sel.addEventListener('change', () => {
      STATE.testInput.modelByProvider[sel.dataset.key] = sel.value;
    });
  });

  const runBtn = document.getElementById('tx-test-run');
  if (runBtn) runBtn.addEventListener('click', () => {
    if (!STATE.testInput.source_html.trim()) { toast(_t('Cần paste nội dung nguồn','Source content required')); return; }
    if (STATE.testInput.selectedProviders.length === 0) { toast(_t('Chọn ít nhất 1 provider','Select at least 1 provider')); return; }
    runBtn.disabled = true; runBtn.textContent = '⟳ ' + _t('Đang dịch...','Translating...');
    const providers = STATE.testInput.selectedProviders.map(pk => {
      const model = STATE.testInput.modelByProvider[pk] || defaultModelForProvider(pk) || null;
      return { provider_key: pk, model };
    });
    api('POST', '/api/v1/dcc/admin/translation/test', {
      providers,
      source_html: STATE.testInput.source_html,
      title: STATE.testInput.title,
      subtitle: STATE.testInput.subtitle,
    }).then(d => {
      STATE.testResults = d.results || [];
      render();
    }).catch(err => { toast('Error: ' + err.message); })
      .finally(() => { runBtn.disabled = false; runBtn.textContent = '▶ ' + _t('Chạy test','Run test'); });
  });
}

// ── Tab 5: Cost & Usage ──────────────────────────────────────────────────────

function renderUsage() {
  if (!STATE.usage) return `<div style="color:var(--text-3);">${_t('Đang tải...','Loading...')}</div>`;
  const s = STATE.usage.summary || {};
  const recent = STATE.usage.recent || [];
  return `
    <section style="margin-bottom:18px;">
      <h3 style="font-size:14px;margin:0 0 8px 0;">${_t('Tổng quan 30 ngày','30-day summary')}</h3>
      <div style="display:flex;gap:14px;flex-wrap:wrap;">
        <div style="padding:14px;border:1px solid var(--ln,#ddd);border-radius:8px;min-width:160px;">
          <div style="font-size:12px;color:var(--text-3);">${_t('Tổng chi phí','Total spend')}</div>
          <div style="font-size:24px;font-weight:600;">$${(s.total_cost_usd || 0).toFixed(4)}</div>
        </div>
        ${(s.providers || []).map(p => `
          <div style="padding:14px;border:1px solid var(--ln,#ddd);border-radius:8px;min-width:160px;">
            <div style="font-size:12px;color:var(--text-3);">${escapeHtml(p.provider_key)}</div>
            <div style="font-size:18px;font-weight:600;">$${(p.cost_usd || 0).toFixed(4)}</div>
            <div style="font-size:11px;color:var(--text-3);">
              ${p.successes}/${p.attempts} ok · ${(p.input_tokens || 0).toLocaleString()} in / ${(p.output_tokens || 0).toLocaleString()} out · ~${p.avg_ms}ms
            </div>
          </div>
        `).join('')}
      </div>
    </section>

    <section>
      <h3 style="font-size:14px;margin:0 0 8px 0;">${_t('50 lần gần nhất','Last 50 attempts')}</h3>
      <table style="width:100%;border-collapse:collapse;font-size:12px;">
        <thead><tr style="text-align:left;border-bottom:1px solid var(--ln,#ddd);">
          <th style="padding:6px 4px;">${_t('Khi','When')}</th>
          <th style="padding:6px 4px;">${_t('Doc','Doc')}</th>
          <th style="padding:6px 4px;">${_t('Provider/Model','Provider/Model')}</th>
          <th style="padding:6px 4px;">${_t('Trigger','Trigger')}</th>
          <th style="padding:6px 4px;text-align:right;">${_t('Tokens','Tokens')}</th>
          <th style="padding:6px 4px;text-align:right;">$</th>
          <th style="padding:6px 4px;text-align:right;">ms</th>
          <th style="padding:6px 4px;">${_t('Kết quả','Outcome')}</th>
        </tr></thead>
        <tbody>
          ${recent.map(r => `<tr style="border-bottom:1px solid var(--ln-2,#eee);">
            <td style="padding:6px 4px;color:var(--text-3);font-family:monospace;">${escapeHtml((r.created_at || '').substr(5, 14))}</td>
            <td style="padding:6px 4px;">${escapeHtml(r.doc_code || '-')}</td>
            <td style="padding:6px 4px;">${escapeHtml(r.provider_key)}${r.model_id ? '/' + escapeHtml(r.model_id) : ''}</td>
            <td style="padding:6px 4px;color:var(--text-3);">${escapeHtml(r.trigger_kind || '')}</td>
            <td style="padding:6px 4px;text-align:right;">${(r.input_tokens || 0).toLocaleString()}/${(r.output_tokens || 0).toLocaleString()}</td>
            <td style="padding:6px 4px;text-align:right;">$${(r.cost_usd || 0).toFixed(6)}</td>
            <td style="padding:6px 4px;text-align:right;">${r.duration_ms || 0}</td>
            <td style="padding:6px 4px;color:${r.outcome === 'ok' ? 'var(--success,#0a7e3a)' : 'var(--danger,#c00)'};">${escapeHtml(r.outcome)}${r.fallback_from ? ' (←' + escapeHtml(r.fallback_from) + ')' : ''}</td>
          </tr>`).join('')}
        </tbody>
      </table>
    </section>
  `;
}

// ── Tab 4: Translated Documents ───────────────────────────────────────────────

function loadDocuments() {
  const params = new URLSearchParams({ page: STATE.docPage, per_page: 50 });
  if (STATE.docSearch) params.set('search', STATE.docSearch);
  if (STATE.docStateFilter) params.set('state', STATE.docStateFilter);
  api('GET', '/api/v1/dcc/admin/translation/documents?' + params.toString())
    .then(d => {
      // Detect completions vs the previous snapshot so we can toast.
      const prevList = (STATE.documents && Array.isArray(STATE.documents.documents)) ? STATE.documents.documents : [];
      const nextList = (d && Array.isArray(d.documents)) ? d.documents : [];
      if (prevList.length > 0 && nextList.length > 0) {
        const prevQueued = new Set(prevList.filter(isDocQueued).map(x => x.doc_code));
        nextList.forEach(doc => {
          if (prevQueued.has(doc.doc_code) && !isDocQueued(doc)) {
            const eng = (doc.engine_version || '').replace(/_v\d+$/, '');
            const stateLabel = doc.translation_state === 'blocked'
              ? _t('thất bại: ' + (doc.engine_version || ''), 'failed: ' + (doc.engine_version || ''))
              : _t('xong với ' + eng, 'completed with ' + eng);
            toast(_t('✓ ' + doc.doc_code + ' — ' + stateLabel, '✓ ' + doc.doc_code + ' — ' + stateLabel));
          }
        });
      }
      STATE.documents = d;
      render();
      scheduleDocsPoll();
      startLiveTimers();
    })
    .catch(err => { STATE.error = String(err.message || err); render(); });
}

// ── Async queue polling ──────────────────────────────────────────────────────
// A retranslate now enqueues a job and returns immediately; the backend
// worker may take several minutes. Poll the list every 20s while at least
// one row is still in `queued_background_worker` so the admin can see
// progress + completion without manual refresh. Polling stops automatically
// when nothing is in flight.
let _docsPollHandle = null;
// Live elapsed timers: doc_code → intervalId
let _liveTimers = {};

function isDocQueued(doc) {
  return (doc && doc.engine_version === 'queued_background_worker');
}
function queuedElapsedMinutes(doc) {
  if (!doc || !doc.translated_at) return null;
  // PG returns "YYYY-MM-DD HH:MM:SS.fff+TZ"; Date.parse handles it.
  const ts = Date.parse(doc.translated_at);
  if (isNaN(ts)) return null;
  return Math.max(0, Math.round((Date.now() - ts) / 60000));
}
// Format elapsed seconds (integer) into "5s", "2m 07s", "1h 03m".
function formatElapsedSec(sec) {
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return m + 'm ' + String(s).padStart(2, '0') + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}
// Wire up a 1-second setInterval for each queued doc. The interval writes to
// the cell identified by id="tx-dur-CODE", which survives DOM rebuilds because
// each tick re-queries by id. Non-queued docs get their timer cleared.
function startLiveTimers() {
  const docs = STATE.documents;
  if (!docs || !Array.isArray(docs.documents)) return;
  docs.documents.forEach(doc => {
    const code = doc.doc_code;
    if (isDocQueued(doc)) {
      if (_liveTimers[code]) return; // already running
      const startTs = doc.translated_at ? Date.parse(doc.translated_at) : Date.now();
      _liveTimers[code] = setInterval(() => {
        const el = document.getElementById('tx-dur-' + code);
        if (el) {
          el.textContent = formatElapsedSec(Math.floor((Date.now() - startTs) / 1000));
        }
      }, 1000);
    } else {
      if (_liveTimers[code]) {
        clearInterval(_liveTimers[code]);
        delete _liveTimers[code];
      }
    }
  });
}
function clearLiveTimers() {
  Object.values(_liveTimers).forEach(id => clearInterval(id));
  _liveTimers = {};
}
function scheduleDocsPoll() {
  if (_docsPollHandle) { clearTimeout(_docsPollHandle); _docsPollHandle = null; }
  const docs = STATE.documents;
  if (!docs || !Array.isArray(docs.documents)) return;
  // Only poll while user is still on the Documents tab.
  if (STATE.activeTab !== 'documents') return;
  if (!docs.documents.some(isDocQueued)) return;
  _docsPollHandle = setTimeout(() => {
    _docsPollHandle = null;
    if (STATE.activeTab === 'documents') loadDocuments();
  }, 20_000);
}

// ── Auto-translate toggle (top of Translated Docs tab) ──────────────────
// Global ON/OFF switch backed by translation_runtime_setting.auto_translate_enabled.
// When OFF, the 5 event-driven hooks in DocumentController (create / save /
// submit / approve / ensureLocale) and dcc_translation_cron.php bail out
// before spawning any translator command. Manual Retranslate button stays
// unconditional. Saves Opus tokens on busy editing days.
function loadAutoTranslateSetting() {
  api('GET', '/api/v1/dcc/admin/translation/auto-translate')
    .then(d => {
      STATE.autoTranslateEnabled = !!d.enabled;
      STATE.autoTranslateUpdatedBy = d.updated_by || null;
      STATE.autoTranslateUpdatedAt = d.updated_at || null;
      render();
    })
    .catch(() => {
      // On failure: default UI to "ON (assumed)" — backend defaults to ON
      // too if the row is missing. Show a small warning.
      STATE.autoTranslateEnabled = true;
      STATE.autoTranslateUpdatedBy = null;
      STATE.autoTranslateUpdatedAt = null;
      render();
    });
}

function toggleAutoTranslate(nextEnabled) {
  if (STATE.autoTranslateBusy) return;
  STATE.autoTranslateBusy = true;
  render();
  api('PUT', '/api/v1/dcc/admin/translation/auto-translate', { enabled: !!nextEnabled })
    .then(d => {
      STATE.autoTranslateEnabled = !!d.enabled;
      STATE.autoTranslateBusy = false;
      toast(d.enabled
        ? _t('✓ Đã BẬT dịch tự động', '✓ Auto-translate ON')
        : _t('✓ Đã TẮT dịch tự động (tiết kiệm token)', '✓ Auto-translate OFF (saves tokens)'));
      // Refresh metadata (updated_by, updated_at).
      loadAutoTranslateSetting();
    })
    .catch(err => {
      STATE.autoTranslateBusy = false;
      toast(_t('Lỗi: ', 'Error: ') + (err.message || err));
      render();
    });
}

function renderAutoTranslateToggle() {
  ensureTxV43Styles();
  const enabled = STATE.autoTranslateEnabled;
  if (enabled === null) {
    return `<div class="tx-auto-banner"><div class="tx-auto-banner__body">
      <div class="tx-auto-banner__hint">${_t('Đang tải trạng thái dịch tự động…', 'Loading auto-translate state…')}</div>
    </div></div>`;
  }
  const busy = STATE.autoTranslateBusy;
  const cls = enabled ? 'tx-auto-banner--on' : 'tx-auto-banner--off';
  const headline = enabled
    ? _t('Dịch tự động đang BẬT', 'Auto-translate is ON')
    : _t('Dịch tự động đang TẮT', 'Auto-translate is OFF');
  const explainOn = _t(
    'Mỗi khi tài liệu được tạo / lưu / duyệt, hệ thống tự chạy translator và reviewer. Tiêu hao token AI.',
    'On every document create / save / submit / approve, translator + reviewer run automatically. Consumes AI tokens.'
  );
  const explainOff = _t(
    'Hệ thống không tự dịch khi tài liệu thay đổi. Phải bấm “Dịch lại” thủ công cho từng tài liệu. Tiết kiệm token AI.',
    'The system does NOT auto-translate on document changes. Click “Retranslate” per document. Saves AI tokens.'
  );
  const meta = (STATE.autoTranslateUpdatedAt || STATE.autoTranslateUpdatedBy)
    ? `<div class="tx-auto-banner__meta">${_t('Đổi gần nhất', 'Last change')}: ${escapeHtml(STATE.autoTranslateUpdatedAt || '?')}${STATE.autoTranslateUpdatedBy ? ' · ' + escapeHtml(STATE.autoTranslateUpdatedBy) : ''}</div>`
    : '';
  return `
    <div class="tx-auto-banner ${cls}">
      <div class="tx-auto-banner__body">
        <div class="tx-auto-banner__title">
          <span class="tx-auto-banner__title-dot"></span>${escapeHtml(headline)}
        </div>
        <div class="tx-auto-banner__hint">${enabled ? explainOn : explainOff}</div>
        ${meta}
      </div>
      <button id="tx-auto-toggle" class="tx-switch ${enabled ? 'tx-switch--on' : ''}" ${busy ? 'disabled' : ''}
        aria-label="${escapeHtml(_t('Bật/Tắt dịch tự động', 'Toggle auto-translate'))}">
        <span class="tx-switch__knob"></span>
      </button>
      <div class="tx-switch-label">${enabled ? 'ON' : 'OFF'}</div>
    </div>
  `;
}

function docStateBadgeStyle(state) {
  const map = {
    machine_preview: 'background:var(--info-bg,#e3f0ff);color:var(--info,#0c63e7)',
    blocked: 'background:var(--danger-bg,#fff0f0);color:var(--danger,#c00)',
    review_pending: 'background:var(--warn-bg,#fff8e1);color:var(--warn,#e0a000)',
    published: 'background:var(--success-bg,#e6f9ee);color:var(--success,#0a7e3a)',
  };
  return map[state] || 'background:var(--bg-2,#f5f7fb);color:var(--text-3)';
}

// Post-translation reviewer (Claude Haiku 4.5) badge. Surfaces the most-recent
// reviewer outcome cached on dcc_document_locale_variant.last_review_*.
// Clicking opens a modal that fetches the full JSON issue list.
function reviewBadgeIcon(outcome) {
  return ({ pass: '✓', advisory: '⚠', fail: '✗', error: '?', skipped: '·' })[outcome] || '·';
}
function reviewBadgeVariant(outcome) {
  if (outcome === 'pass') return 'tx-review-badge--pass';
  if (outcome === 'advisory') return 'tx-review-badge--advisory';
  if (outcome === 'fail') return 'tx-review-badge--fail';
  return 'tx-review-badge--neutral';
}
function renderReviewBadge(doc) {
  ensureTxV43Styles();
  const outcome = doc.last_review_outcome;
  if (!outcome) return '';
  const crit = doc.last_review_issues_critical || 0;
  const adv  = doc.last_review_issues_advisory || 0;
  const reviewId = doc.last_review_id;
  const summary = (outcome === 'pass')
    ? _t('Đã rà soát', 'Reviewed')
    : (outcome === 'advisory')
      ? _t(adv + ' khuyến nghị', adv + ' advisory')
      : (outcome === 'fail')
        ? _t(crit + ' lỗi nghiêm trọng', crit + ' critical')
        : (outcome === 'error')
          ? _t('Lỗi reviewer', 'Reviewer error')
          : _t('Bỏ qua', 'Skipped');
  const tip = _t('Bấm để xem chi tiết review (Claude Haiku 4.5)', 'Click for review details (Claude Haiku 4.5)');
  const clickable = reviewId ? 'tx-review-badge--clickable' : '';
  return `<span class="tx-review-badge ${reviewBadgeVariant(outcome)} ${clickable}"
    data-review-id="${reviewId || ''}" title="${escapeHtml(tip)}">
    <span aria-hidden="true">${reviewBadgeIcon(outcome)}</span> ${escapeHtml(summary)}
  </span>`;
}
function openReviewModal(reviewId) {
  if (!reviewId) return;
  ensureTxV43Styles();
  const overlay = document.createElement('div');
  overlay.className = 'tx-modal-overlay';
  overlay.innerHTML = `
    <div class="tx-modal-panel">
      <div class="tx-modal-head">
        <strong>${escapeHtml(_t('Chi tiết review (Claude Haiku)', 'Review detail (Claude Haiku)'))}</strong>
        <button class="tx-modal-close" aria-label="${escapeHtml(_t('Đóng', 'Close'))}">×</button>
      </div>
      <div class="tx-modal-body">
        <i style="color:var(--text-3,#8a93a3);">${escapeHtml(_t('Đang tải…', 'Loading…'))}</i>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.tx-modal-close').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });

  api('GET', '/api/v1/dcc/admin/translation/reviews/' + encodeURIComponent(reviewId))
    .then(d => {
      const r = (d && d.review) || {};
      let issues = r.issues_jsonb;
      if (typeof issues === 'string') { try { issues = JSON.parse(issues); } catch (_) { issues = []; } }
      if (!Array.isArray(issues)) issues = [];
      const body = overlay.querySelector('.tx-modal-body');
      const outcomeBadge = `<span class="tx-review-badge ${reviewBadgeVariant(r.outcome)}">${escapeHtml(r.outcome || '—')}</span>`;
      const head = `
        <div class="tx-review-summary">
          <div class="tx-review-summary__row">
            <span><b>${escapeHtml(_t('Tài liệu', 'Doc'))}:</b> <code>${escapeHtml(r.doc_code || '—')}</code></span>
            <span><b>${escapeHtml(_t('Kết quả', 'Outcome'))}:</b> ${outcomeBadge}</span>
            <span><b>${escapeHtml(_t('Nghiêm trọng', 'Critical'))}:</b> ${r.issues_critical || 0}</span>
            <span><b>${escapeHtml(_t('Khuyến nghị', 'Advisory'))}:</b> ${r.issues_advisory || 0}</span>
          </div>
          ${r.summary ? `<div class="tx-review-summary__text">${escapeHtml(r.summary)}</div>` : ''}
          <div class="tx-review-summary__row" style="margin-top:6px;font-size:11px;color:var(--text-3,#8a93a3);">
            <span>${escapeHtml(_t('Mô hình', 'Model'))}: <code>${escapeHtml(r.reviewer_model || '—')}</code></span>
            <span>${escapeHtml(_t('Số đoạn rà soát', 'Paragraphs reviewed'))}: ${r.paragraphs_reviewed || 0}</span>
            <span>${escapeHtml(r.created_at || '')}</span>
          </div>
        </div>`;
      const list = issues.length === 0
        ? `<div style="color:var(--text-3,#8a93a3);padding:16px;text-align:center;font-style:italic;">${escapeHtml(_t('Không có vấn đề.', 'No issues.'))}</div>`
        : issues.map(i => {
            const sev = i.severity === 'critical' ? 'critical' : 'advisory';
            return `
              <div class="tx-issue tx-issue--${sev}">
                <div class="tx-issue__head">
                  <code class="tx-issue__seg">${escapeHtml(i.segment || '—')}</code>
                  <span class="tx-issue__sev tx-issue__sev--${sev}">${escapeHtml(i.severity || '—')}</span>
                  <span class="tx-issue__cat">${escapeHtml(i.category || '—')}</span>
                </div>
                ${i.vi_excerpt ? `<div class="tx-issue__line"><b>VI</b> ${escapeHtml(i.vi_excerpt)}</div>` : ''}
                ${i.en_excerpt ? `<div class="tx-issue__line"><b>EN</b> <span class="tx-issue__en-wrong">${escapeHtml(i.en_excerpt)}</span></div>` : ''}
                ${i.explanation ? `<div class="tx-issue__line"><b>${escapeHtml(_t('Lý do', 'Why'))}</b> ${escapeHtml(i.explanation)}</div>` : ''}
                ${i.suggestion ? `<div class="tx-issue__line"><b>${escapeHtml(_t('Đề xuất', 'Fix'))}</b> <span class="tx-issue__suggestion">${escapeHtml(i.suggestion)}</span></div>` : ''}
              </div>`;
          }).join('');
      body.innerHTML = head + list;
    })
    .catch(err => {
      const body = overlay.querySelector('.tx-modal-body');
      if (body) body.innerHTML = `<div style="color:var(--danger,#c00);padding:14px;">${escapeHtml(_t('Không tải được', 'Load failed'))}: ${escapeHtml(String(err && err.message || err))}</div>`;
    });
}

// Inline keyframes so the "translating" pulse works without a CSS edit.
function ensureTxQueuedStyles() {
  if (document.getElementById('tx-queued-styles')) return;
  const s = document.createElement('style');
  s.id = 'tx-queued-styles';
  s.textContent = '@keyframes tx-queued-pulse{0%,100%{opacity:1}50%{opacity:.45}}'
    + '.tx-queued-dot{display:inline-block;width:7px;height:7px;border-radius:50%;background:var(--warn,#e0a000);margin-right:6px;animation:tx-queued-pulse 1.2s ease-in-out infinite;vertical-align:middle}'
    + '.tx-queued-stuck{background:var(--danger,#c00)!important}'
    + '.tx-translating-wrap{position:relative;display:inline-block}'
    + '.tx-translating-wrap .tx-cancel-btn{display:none}'
    + '.tx-translating-wrap:hover .tx-translating-btn{display:none}'
    + '.tx-translating-wrap:hover .tx-cancel-btn{display:inline-block}';
  document.head.appendChild(s);
}

// v4.3 styles for the auto-translate banner, review badge/modal, and learnings
// tab. Tone matches the rest of the portal admin: neutral surface, subtle
// accent rules, no gradient/emoji-heavy decoration. Injected once.
function ensureTxV43Styles() {
  if (document.getElementById('tx-v43-styles')) return;
  const s = document.createElement('style');
  s.id = 'tx-v43-styles';
  s.textContent = `
    /* ── Auto-translate banner ───────────────────────────────────────── */
    .tx-auto-banner{display:flex;gap:16px;align-items:center;
      padding:14px 18px;margin-bottom:16px;
      border:1px solid var(--ln,#e3e6ec);border-left-width:4px;border-radius:8px;
      background:var(--bg,#fff);}
    .tx-auto-banner--on{border-left-color:var(--success,#0a7e3a);}
    .tx-auto-banner--off{border-left-color:var(--warn,#e0a000);}
    .tx-auto-banner__body{flex:1;min-width:0;}
    .tx-auto-banner__title{font-weight:600;font-size:14px;color:var(--text-1,#1a1f29);
      display:flex;align-items:center;gap:8px;}
    .tx-auto-banner__title-dot{width:8px;height:8px;border-radius:50%;flex-shrink:0;}
    .tx-auto-banner--on .tx-auto-banner__title-dot{background:var(--success,#0a7e3a);}
    .tx-auto-banner--off .tx-auto-banner__title-dot{background:var(--warn,#e0a000);}
    .tx-auto-banner__hint{font-size:12px;line-height:1.5;color:var(--text-2,#5a6573);margin-top:4px;}
    .tx-auto-banner__meta{font-size:11px;color:var(--text-3,#8a93a3);margin-top:6px;}

    button.tx-switch{position:relative;display:inline-block;
      width:44px;height:24px;min-height:0;max-height:24px;line-height:1;
      border-radius:12px;border:0;outline:0;cursor:pointer;flex-shrink:0;
      padding:0;margin:0;vertical-align:middle;box-sizing:border-box;
      background:var(--text-3,#8a93a3);transition:background .15s;
      -webkit-appearance:none;appearance:none;}
    button.tx-switch.tx-switch--on{background:var(--success,#0a7e3a);}
    button.tx-switch:disabled{opacity:.6;cursor:wait;}
    button.tx-switch:focus-visible{box-shadow:0 0 0 2px var(--brand-primary,#0c63e7);}
    .tx-switch__knob{position:absolute;top:3px;left:3px;width:18px;height:18px;
      border-radius:50%;background:#fff;pointer-events:none;
      box-shadow:0 1px 3px rgba(0,0,0,.18);transition:left .15s;}
    .tx-switch--on .tx-switch__knob{left:23px;}
    .tx-switch-label{font-size:11px;font-weight:700;letter-spacing:.5px;
      color:var(--text-2,#5a6573);min-width:28px;text-align:center;
      flex-shrink:0;line-height:24px;}

    /* ── Review badge (inline next to translation_state) ─────────────── */
    .tx-review-badge{display:inline-flex;align-items:center;gap:4px;
      margin-left:6px;padding:2px 8px;border-radius:10px;
      font-size:10.5px;font-weight:500;line-height:1.5;
      border:1px solid transparent;white-space:nowrap;}
    .tx-review-badge--clickable{cursor:pointer;transition:transform .1s;}
    .tx-review-badge--clickable:hover{transform:translateY(-1px);}
    .tx-review-badge--pass{background:rgba(10,126,58,.08);color:var(--success,#0a7e3a);
      border-color:rgba(10,126,58,.2);}
    .tx-review-badge--advisory{background:rgba(224,160,0,.1);color:var(--warn,#e0a000);
      border-color:rgba(224,160,0,.25);}
    .tx-review-badge--fail{background:rgba(204,0,0,.08);color:var(--danger,#c00);
      border-color:rgba(204,0,0,.25);}
    .tx-review-badge--neutral{background:var(--bg-2,#f5f7fb);color:var(--text-3,#8a93a3);
      border-color:var(--ln,#e3e6ec);}

    /* ── Review modal ─────────────────────────────────────────────────── */
    .tx-modal-overlay{position:fixed;inset:0;background:rgba(15,20,28,.55);
      z-index:9999;display:flex;align-items:center;justify-content:center;
      padding:24px;}
    .tx-modal-panel{background:var(--bg,#fff);border-radius:10px;
      max-width:820px;width:100%;max-height:84vh;
      display:flex;flex-direction:column;
      box-shadow:0 12px 40px rgba(0,0,0,.25);
      border:1px solid var(--ln,#e3e6ec);}
    .tx-modal-head{display:flex;justify-content:space-between;align-items:center;
      padding:14px 20px;border-bottom:1px solid var(--ln,#e3e6ec);}
    .tx-modal-head strong{font-size:14px;color:var(--text-1,#1a1f29);}
    .tx-modal-close{border:0;background:transparent;font-size:22px;line-height:1;
      cursor:pointer;color:var(--text-2,#5a6573);padding:0 4px;}
    .tx-modal-close:hover{color:var(--text-1,#1a1f29);}
    .tx-modal-body{padding:16px 20px;overflow:auto;font-size:13px;}

    .tx-review-summary{padding:12px 14px;background:var(--bg-2,#f5f7fb);
      border-radius:6px;margin-bottom:14px;border:1px solid var(--ln,#e3e6ec);}
    .tx-review-summary__row{display:flex;flex-wrap:wrap;gap:14px;
      font-size:12px;color:var(--text-2,#5a6573);margin-bottom:4px;}
    .tx-review-summary__row b{color:var(--text-1,#1a1f29);}
    .tx-review-summary__text{font-size:13px;color:var(--text-1,#1a1f29);margin-top:6px;}

    .tx-issue{border:1px solid var(--ln-2,#eef0f3);border-radius:6px;
      padding:10px 12px;margin-bottom:8px;background:var(--bg,#fff);
      border-left:3px solid var(--ln-2,#eef0f3);}
    .tx-issue--critical{border-left-color:var(--danger,#c00);}
    .tx-issue--advisory{border-left-color:var(--warn,#e0a000);}
    .tx-issue__head{display:flex;flex-wrap:wrap;gap:8px;align-items:center;
      margin-bottom:6px;}
    .tx-issue__seg{font-family:monospace;font-size:11px;
      background:var(--bg-2,#f5f7fb);padding:2px 6px;border-radius:3px;
      color:var(--text-2,#5a6573);}
    .tx-issue__sev{font-size:10px;font-weight:600;letter-spacing:.5px;
      padding:2px 7px;border-radius:3px;color:#fff;text-transform:uppercase;}
    .tx-issue__sev--critical{background:var(--danger,#c00);}
    .tx-issue__sev--advisory{background:var(--warn,#e0a000);}
    .tx-issue__cat{font-size:11px;color:var(--text-3,#8a93a3);font-family:monospace;}
    .tx-issue__line{font-size:12.5px;color:var(--text-2,#5a6573);
      margin-top:2px;line-height:1.5;}
    .tx-issue__line b{display:inline-block;min-width:36px;color:var(--text-3,#8a93a3);
      font-weight:600;font-size:11px;letter-spacing:.3px;}
    .tx-issue__en-wrong{color:var(--danger,#c00);}
    .tx-issue__suggestion{color:var(--success,#0a7e3a);}

    .tx-promote-btn{margin-top:8px;padding:5px 12px;
      border:1px solid var(--brand-primary,#0c63e7);
      background:var(--brand-primary,#0c63e7);color:#fff;
      border-radius:4px;cursor:pointer;font-size:11.5px;
      font-weight:500;transition:opacity .15s;}
    .tx-promote-btn:hover:not(:disabled){opacity:.88;}
    .tx-promote-btn:disabled{opacity:.5;cursor:default;}

    /* ── Learnings tab ───────────────────────────────────────────────── */
    .tx-learning-status{display:inline-block;padding:2px 9px;border-radius:10px;
      font-size:11px;font-weight:500;border:1px solid transparent;}
    .tx-learning-status--auto{background:rgba(224,160,0,.1);color:var(--warn,#e0a000);
      border-color:rgba(224,160,0,.25);}
    .tx-learning-status--approved{background:rgba(10,126,58,.08);color:var(--success,#0a7e3a);
      border-color:rgba(10,126,58,.2);}
    .tx-learning-status--disabled{background:var(--bg-2,#f5f7fb);color:var(--text-3,#8a93a3);
      border-color:var(--ln,#e3e6ec);}
  `;
  document.head.appendChild(s);
}

// Format a duration_ms value into a short human label: "67s", "5m 11s",
// "1h 03m". Returns "—" for null / non-numeric values.
function formatDuration(ms) {
  if (ms === null || ms === undefined || ms === '' || isNaN(ms)) return '—';
  const sec = Math.round(Number(ms) / 1000);
  if (sec < 60) return sec + 's';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  if (m < 60) return m + 'm ' + String(s).padStart(2, '0') + 's';
  const h = Math.floor(m / 60);
  return h + 'h ' + String(m % 60).padStart(2, '0') + 'm';
}

function renderDocuments() {
  const docs = STATE.documents;
  if (!docs) {
    return `<div style="padding:40px;text-align:center;color:var(--text-3);">⟳ ${_t('Đang tải tài liệu...', 'Loading documents...')}</div>`;
  }

  const stateOpts = [
    { v: '', l: _t('Tất cả trạng thái', 'All states') },
    { v: 'machine_preview', l: 'machine_preview' },
    { v: 'blocked', l: 'blocked' },
    { v: 'review_pending', l: 'review_pending' },
    { v: 'published', l: 'published' },
  ];

  const enabledProviders = STATE.providers.filter(p => p.is_enabled);
  const list       = docs.documents || [];
  const total      = docs.total || 0;
  const page       = docs.page || 1;
  const perPage    = docs.per_page || 50;
  const totalPages = Math.ceil(total / perPage) || 1;

  return `
    ${renderAutoTranslateToggle()}
    <div style="margin-bottom:14px;display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
      <input id="tx-doc-search" type="text" value="${escapeHtml(STATE.docSearch)}"
        placeholder="${_t('Tìm theo mã/tên tài liệu', 'Search by code or title')}"
        style="padding:7px 10px;border:1px solid var(--ln,#ddd);border-radius:6px;font-size:13px;min-width:220px;">
      <select id="tx-doc-state-filter" style="padding:7px 8px;border:1px solid var(--ln,#ddd);border-radius:6px;font-size:13px;">
        ${stateOpts.map(o => `<option value="${escapeHtml(o.v)}" ${STATE.docStateFilter === o.v ? 'selected' : ''}>${escapeHtml(o.l)}</option>`).join('')}
      </select>
      <button id="tx-doc-refresh" style="padding:7px 14px;border:1px solid var(--ln,#ddd);border-radius:6px;background:var(--bg,#fff);cursor:pointer;font-size:13px;">${_t('Làm mới', 'Refresh')}</button>
      <span style="margin-left:auto;font-size:12px;color:var(--text-3);">
        ${_t('Tổng', 'Total')}: <strong>${total}</strong> &nbsp;·&nbsp; ${_t('Trang', 'Page')} ${page} / ${totalPages}
      </span>
    </div>

    <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="text-align:left;border-bottom:2px solid var(--ln,#ddd);background:var(--bg-2,#f5f7fb);">
            <th style="padding:9px 8px;">${_t('Tài liệu', 'Document')}</th>
            <th style="padding:9px 8px;">${_t('Loại', 'Type')}</th>
            <th style="padding:9px 8px;">${_t('Phiên bản', 'Revision')}</th>
            <th style="padding:9px 8px;">${_t('Engine dịch', 'Translation engine')}</th>
            <th style="padding:9px 8px;">${_t('Ngày dịch', 'Translated')}</th>
            <th style="padding:9px 8px;" title="${_t('Thời gian của lần dịch thành công gần nhất', 'Duration of the last successful translation')}">${_t('Thời gian dịch', 'Duration')}</th>
            <th style="padding:9px 8px;">${_t('Trạng thái', 'State')}</th>
            <th style="padding:9px 8px;min-width:200px;"></th>
          </tr>
        </thead>
        <tbody>
          ${list.length === 0
            ? `<tr><td colspan="8" style="padding:28px;text-align:center;color:var(--text-3);">${_t('Chưa có tài liệu nào được dịch.', 'No translated documents found.')}</td></tr>`
            : list.map(doc => renderDocRow(doc, enabledProviders)).join('')}
        </tbody>
      </table>
    </div>

    ${totalPages > 1 ? `
      <div style="margin-top:12px;display:flex;gap:6px;justify-content:flex-end;">
        <button class="tx-doc-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}
          style="padding:6px 12px;border:1px solid var(--ln,#ddd);border-radius:4px;cursor:${page <= 1 ? 'default' : 'pointer'};font-size:13px;opacity:${page <= 1 ? '.4' : '1'};">
          ‹ ${_t('Trước', 'Prev')}
        </button>
        <button class="tx-doc-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}
          style="padding:6px 12px;border:1px solid var(--ln,#ddd);border-radius:4px;cursor:${page >= totalPages ? 'default' : 'pointer'};font-size:13px;opacity:${page >= totalPages ? '.4' : '1'};">
          ${_t('Sau', 'Next')} ›
        </button>
      </div>
    ` : ''}
  `;
}

function renderDocRow(doc, enabledProviders) {
  ensureTxQueuedStyles();
  const code         = doc.doc_code;
  const srcRev       = doc.source_revision || '—';
  const trlRev       = doc.translated_revision || '—';
  const stale        = srcRev !== '—' && trlRev !== '—' && srcRev !== trlRev;
  const queued       = isDocQueued(doc);
  const elapsedMin   = queued ? queuedElapsedMinutes(doc) : null;
  // After 30 min in queue the worker is almost certainly dead (codex crash,
  // PHP-FPM kill, autoload failure). Surface a clear "stuck" warning so the
  // admin knows to re-queue rather than wait indefinitely.
  const stuck        = queued && elapsedMin !== null && elapsedMin >= 30;
  const retranslating = !!STATE.docRetranslating[code] || (queued && !stuck);
  const expanded     = STATE.docExpandedOverride === code;

  // Build the engine label. When queued, keep showing the actual engine/provider
  // and prepend a pulsing dot so the admin can see which engine is running.
  const stuckBadge = stuck
    ? `<br><span style="font-size:11px;color:var(--danger,#c00);font-weight:600;">⚠ ${_t('Worker có thể đã chết — bấm Dịch lại để re-queue', 'Worker may have died — click Retranslate to re-queue')}</span>`
    : '';
  let engineLabel;
  if (doc.override_provider) {
    engineLabel = `<div style="font-size:10px;color:var(--text-3);margin-bottom:1px;">${_t('override', 'override')}:</div>`
      + `<span style="color:var(--brand-primary,#0c63e7);font-weight:600;">${escapeHtml(doc.override_provider)}${doc.override_model ? ' / ' + escapeHtml(doc.override_model) : ''}</span>`;
  } else {
    const evClean = (doc.engine_version || '').replace(/_v\d+$/, '');
    const evDisplay = evClean === 'queued_background_worker' || evClean === '' ? '' : evClean;
    engineLabel = `<span style="color:var(--text-2);">${escapeHtml(doc.translation_provider || '—')}${evDisplay ? '<br><span style="font-size:11px;color:var(--text-3);">' + escapeHtml(evDisplay) + '</span>' : ''}</span>`;
  }
  if (queued) {
    engineLabel = `<span class="tx-queued-dot${stuck ? ' tx-queued-stuck' : ''}"></span>${engineLabel}${stuckBadge}`;
  }

  return `
    <tr class="tx-doc-row" data-doc-code="${escapeHtml(code)}"
        style="border-bottom:1px solid var(--ln-2,#eee);${expanded ? 'background:var(--bg-2,#f5f7fb);' : ''}vertical-align:top;">
      <td style="padding:9px 8px;">
        <div style="font-weight:600;font-family:monospace;font-size:12px;">${escapeHtml(code)}</div>
        <div style="color:var(--text-2);font-size:12px;max-width:240px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${escapeHtml(doc.title || '')}">${escapeHtml(doc.title || '')}</div>
      </td>
      <td style="padding:9px 8px;">
        <span style="padding:2px 6px;background:var(--bg-2,#f5f7fb);border-radius:4px;font-size:11px;font-family:monospace;">${escapeHtml(doc.doc_type || '?')}</span>
      </td>
      <td style="padding:9px 8px;font-family:monospace;font-size:12px;">
        <div>${escapeHtml(srcRev)}</div>
        ${stale
          ? `<div style="font-size:11px;color:var(--warn,#e0a000);">⚠ ${_t('dịch', 'translated')} ${escapeHtml(trlRev)}</div>`
          : `<div style="font-size:11px;color:var(--text-3);">${_t('dịch', 'translated')} ${escapeHtml(trlRev)}</div>`}
      </td>
      <td style="padding:9px 8px;font-size:12px;">${engineLabel}</td>
      <td style="padding:9px 8px;font-size:12px;color:var(--text-3);white-space:nowrap;">
        ${doc.translated_at ? escapeHtml(doc.translated_at.substr(0, 16).replace('T', ' ')) : '—'}
      </td>
      ${queued
        ? `<td id="tx-dur-${escapeHtml(code)}" style="padding:9px 8px;font-size:12px;color:var(--warn,#e0a000);white-space:nowrap;text-align:right;font-family:monospace;">
            ${formatElapsedSec(Math.max(0, Math.floor((Date.now() - (doc.translated_at ? Date.parse(doc.translated_at) : Date.now())) / 1000)))}
          </td>`
        : `<td style="padding:9px 8px;font-size:12px;color:var(--text-3);white-space:nowrap;text-align:right;font-family:monospace;"
              title="${doc.last_provider_key ? escapeHtml(doc.last_provider_key + (doc.last_model_id ? ' / ' + doc.last_model_id : '')) : ''}">
            ${escapeHtml(formatDuration(doc.last_duration_ms))}
          </td>`}
      <td style="padding:9px 8px;">
        ${queued && !stuck
          ? `<span style="padding:3px 8px;border-radius:4px;font-size:11px;white-space:nowrap;background:var(--warn-bg,#fff8e1);color:var(--warn,#e0a000);font-weight:600;">⟳ ${_t('đang dịch', 'translating')}</span>`
          : `<span style="padding:3px 8px;border-radius:4px;font-size:11px;white-space:nowrap;${docStateBadgeStyle(doc.translation_state)}">${escapeHtml(doc.translation_state || 'unknown')}</span>`}
        ${renderReviewBadge(doc)}
      </td>
      <td style="padding:9px 8px;text-align:right;white-space:nowrap;">
        <button class="tx-doc-override-toggle" data-doc-code="${escapeHtml(code)}"
          style="padding:5px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;background:${expanded ? 'var(--bg-2,#f5f7fb)' : 'var(--bg,#fff)'};cursor:pointer;font-size:12px;margin-right:4px;">
          ${_t('Đổi engine', 'Change engine')} ${expanded ? '▲' : '▼'}
        </button>
        ${queued && !stuck ? `
        <span class="tx-translating-wrap">
          <button class="tx-translating-btn" disabled
            style="padding:5px 10px;border:0;border-radius:4px;background:var(--brand-primary,#0c63e7);color:#fff;cursor:default;font-size:12px;opacity:.6;">
            ⟳ ${_t('Đang dịch...', 'Translating...')}
          </button>
          <button class="tx-cancel-btn tx-doc-cancel" data-doc-code="${escapeHtml(code)}"
            title="${_t('Hủy job đang chạy + kill worker', 'Cancel running job + kill worker')}"
            style="padding:5px 10px;border:0;border-radius:4px;background:var(--danger,#c00);color:#fff;cursor:pointer;font-size:12px;">
            ✕ ${_t('Hủy', 'Cancel')}
          </button>
        </span>
        ` : `
        <button class="tx-doc-retranslate" data-doc-code="${escapeHtml(code)}"
          ${retranslating && !stuck ? 'disabled' : ''}
          title="${stuck ? _t('Worker quá hạn — bấm để re-queue', 'Worker timeout — click to re-queue') : ''}"
          style="padding:5px 10px;border:0;border-radius:4px;background:${stuck ? 'var(--danger,#c00)' : 'var(--brand-primary,#0c63e7)'};color:#fff;cursor:${retranslating && !stuck ? 'default' : 'pointer'};font-size:12px;opacity:${retranslating && !stuck ? '.6' : '1'};">
          ${stuck ? '↻ ' + _t('Re-queue', 'Re-queue') : (retranslating ? '⟳ ' + _t('Đang dịch...', 'Translating...') : _t('Dịch lại', 'Retranslate'))}
        </button>
        `}
      </td>
    </tr>
    ${expanded ? `<tr data-override-for="${escapeHtml(code)}" style="background:var(--bg-2,#f5f7fb);">
      <td colspan="8" style="padding:0;">${renderDocOverridePanel(doc, enabledProviders)}</td>
    </tr>` : ''}
  `;
}

function renderDocOverridePanel(doc, enabledProviders) {
  const code        = doc.doc_code;
  const curProvider = doc.override_provider || (enabledProviders[0] && enabledProviders[0].provider_key) || '';
  const curModel    = doc.override_model || '';

  return `
    <div style="padding:14px 16px;border-top:1px solid var(--ln,#ddd);">
      <div style="font-size:12px;font-weight:600;margin-bottom:10px;color:var(--text-2);">
        ${_t('Override engine dịch cho', 'Per-document translation override for')}
        <code style="background:var(--bg,#fff);padding:1px 5px;border-radius:3px;">${escapeHtml(code)}</code>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;">
        <select class="tx-doc-override-provider" data-doc-code="${escapeHtml(code)}"
          style="padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
          ${enabledProviders.map(p => `
            <option value="${escapeHtml(p.provider_key)}" ${p.provider_key === curProvider ? 'selected' : ''}>${escapeHtml(p.display_name)}</option>
          `).join('')}
        </select>
        <select class="tx-doc-override-model" data-doc-code="${escapeHtml(code)}"
          style="padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
          ${renderModelOptions(curProvider, curModel)}
        </select>
        <button class="tx-doc-save-override" data-doc-code="${escapeHtml(code)}"
          style="padding:6px 14px;background:var(--brand-primary,#0c63e7);color:#fff;border:0;border-radius:4px;cursor:pointer;font-size:13px;">
          ${_t('Lưu override', 'Save override')}
        </button>
        ${doc.override_provider ? `
          <button class="tx-doc-remove-override" data-doc-code="${escapeHtml(code)}"
            style="padding:6px 10px;background:none;border:1px solid var(--danger,#c00);color:var(--danger,#c00);border-radius:4px;cursor:pointer;font-size:13px;">
            ${_t('Xóa override', 'Remove override')}
          </button>
        ` : ''}
      </div>
      <p style="margin:8px 0 0;font-size:11px;color:var(--text-3);">
        ${_t(
          'Override này được lưu và áp dụng cho tất cả các lần dịch tự động tiếp theo của tài liệu này.',
          'This override is saved and applied to all future automatic translations of this document.'
        )}
      </p>
    </div>
  `;
}

function wireDocuments() {
  const searchEl  = document.getElementById('tx-doc-search');
  const stateEl   = document.getElementById('tx-doc-state-filter');
  const refreshEl = document.getElementById('tx-doc-refresh');

  let searchTimer = null;
  if (searchEl) {
    searchEl.addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        STATE.docSearch = searchEl.value.trim();
        STATE.docPage = 1;
        STATE.documents = null;
        loadDocuments();
      }, 400);
    });
  }
  if (stateEl) {
    stateEl.addEventListener('change', () => {
      STATE.docStateFilter = stateEl.value;
      STATE.docPage = 1;
      STATE.documents = null;
      loadDocuments();
    });
  }
  if (refreshEl) {
    refreshEl.addEventListener('click', () => {
      STATE.documents = null;
      loadDocuments();
    });
  }

  document.querySelectorAll('.tx-doc-page').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      STATE.docPage = parseInt(btn.dataset.page, 10) || 1;
      STATE.documents = null;
      loadDocuments();
    });
  });

  const autoToggleBtn = document.getElementById('tx-auto-toggle');
  if (autoToggleBtn) {
    autoToggleBtn.addEventListener('click', () => {
      const next = !(STATE.autoTranslateEnabled);
      if (!next) {
        const ok = confirm(_t(
          'TẮT dịch tự động? Tài liệu mới hoặc thay đổi sẽ KHÔNG được dịch cho đến khi bạn bấm "Dịch lại" thủ công.',
          'Turn auto-translate OFF? New or changed documents will NOT be translated until you click "Retranslate" manually.'
        ));
        if (!ok) return;
      }
      toggleAutoTranslate(next);
    });
  }

  document.querySelectorAll('.tx-review-badge').forEach(badge => {
    const reviewId = badge.getAttribute('data-review-id');
    if (!reviewId) return;
    badge.addEventListener('click', () => openReviewModal(reviewId));
  });

  document.querySelectorAll('.tx-doc-override-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.docCode;
      STATE.docExpandedOverride = STATE.docExpandedOverride === code ? null : code;
      render();
    });
  });

  // Override panel: refresh model dropdown when provider changes
  document.querySelectorAll('.tx-doc-override-provider').forEach(sel => {
    sel.addEventListener('change', () => {
      const td = sel.closest('td');
      const modelSel = td && td.querySelector('.tx-doc-override-model');
      if (modelSel) modelSel.innerHTML = renderModelOptions(sel.value, '');
    });
  });

  // Save override
  document.querySelectorAll('.tx-doc-save-override').forEach(btn => {
    btn.addEventListener('click', () => {
      const code = btn.dataset.docCode;
      const td = btn.closest('td');
      const providerSel = td && td.querySelector('.tx-doc-override-provider');
      const modelSel    = td && td.querySelector('.tx-doc-override-model');
      const provider    = providerSel ? providerSel.value : '';
      const model       = (modelSel && modelSel.value.trim()) || null;
      if (!provider) return;
      btn.disabled = true;
      api('PUT', `/api/v1/dcc/admin/translation/documents/${encodeURIComponent(code)}/override`, {
        primary_provider: provider,
        primary_model: model,
      }).then(() => {
        toast(_t('Đã lưu override', 'Override saved'));
        STATE.docExpandedOverride = null;
        STATE.documents = null;
        loadDocuments();
      }).catch(err => { toast('Error: ' + err.message); btn.disabled = false; });
    });
  });

  // Remove override — 2-click confirmation (avoids native confirm() which blocks the event loop)
  document.querySelectorAll('.tx-doc-remove-override').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.pending === '1') {
        // Second click: execute
        const code = btn.dataset.docCode;
        api('DELETE', `/api/v1/dcc/admin/translation/documents/${encodeURIComponent(code)}/override`)
          .then(() => {
            toast(_t('Đã xóa override', 'Override removed'));
            STATE.docExpandedOverride = null;
            STATE.documents = null;
            loadDocuments();
          }).catch(err => toast('Error: ' + err.message));
        return;
      }
      // First click: arm
      btn.dataset.pending = '1';
      const origText = btn.textContent;
      btn.textContent = _t('Xác nhận xóa?', 'Confirm remove?');
      btn.style.background = 'var(--danger,#c00)';
      btn.style.color = '#fff';
      setTimeout(() => {
        if (btn.dataset.pending === '1') {
          delete btn.dataset.pending;
          btn.textContent = origText;
          btn.style.background = '';
          btn.style.color = 'var(--danger,#c00)';
        }
      }, 3000);
    });
  });

  // Cancel a queued retranslate (kills worker, removes job/lock, restores
  // variant out of the queued_background_worker placeholder).
  document.querySelectorAll('.tx-doc-cancel').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const code = btn.dataset.docCode;
      if (!confirm(_t('Hủy job dịch của ' + code + '?', 'Cancel translation job for ' + code + '?'))) return;
      btn.disabled = true;
      const orig = btn.textContent;
      btn.textContent = '⟳ ' + _t('Đang hủy...', 'Canceling...');
      api('POST', `/api/v1/dcc/admin/translation/documents/${encodeURIComponent(code)}/cancel-job`, {})
        .then(d => {
          const killed = (d && d.killed) || {};
          const pids = Array.isArray(killed.worker_pids) ? killed.worker_pids.length : 0;
          toast(_t(
            '✕ ' + code + ' — đã hủy (killed ' + pids + ' worker)',
            '✕ ' + code + ' — canceled (killed ' + pids + ' worker)'
          ));
          loadDocuments();
        })
        .catch(err => {
          btn.disabled = false;
          btn.textContent = orig;
          toast(_t('Lỗi hủy: ' + err.message, 'Cancel error: ' + err.message));
        });
    });
  });

  // Force retranslate — 2-click confirmation
  document.querySelectorAll('.tx-doc-retranslate').forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      const code = btn.dataset.docCode;
      if (btn.dataset.pending === '1') {
        // Second click: execute
        STATE.docRetranslating[code] = true;
        render();
        api('POST', `/api/v1/dcc/admin/translation/documents/${encodeURIComponent(code)}/retranslate`, {})
          .then(d => {
            delete STATE.docRetranslating[code];
            // Endpoint now enqueues the job and returns immediately. The
            // worker runs in background via nohup; UI just confirms queued.
            if (d.queued === true || (d.result && d.result.queued)) {
              toast(_t('Đã đưa vào hàng đợi: ' + code + ' — refresh danh sách sau vài phút', 'Queued: ' + code + ' — refresh in a few minutes'));
            } else {
              const ok = !d.result || d.result.ok !== false;
              if (ok) {
                toast(_t('Dịch thành công: ' + code, 'Translation complete: ' + code));
              } else {
                const reason = (d.result && (d.result.reason || d.result.message)) || 'unknown';
                toast(_t('Dịch thất bại: ' + reason, 'Translation failed: ' + reason));
              }
            }
            STATE.documents = null;
            loadDocuments();
          }).catch(err => {
            delete STATE.docRetranslating[code];
            STATE.documents = null;
            loadDocuments();
            toast('Error: ' + err.message);
          });
        return;
      }
      // First click: arm
      btn.dataset.pending = '1';
      const origText = btn.textContent.trim();
      btn.textContent = _t('Xác nhận dịch?', 'Confirm retranslate?');
      btn.style.background = 'var(--warn,#e0a000)';
      setTimeout(() => {
        if (btn.dataset.pending === '1') {
          delete btn.dataset.pending;
          btn.textContent = origText;
          btn.style.background = 'var(--brand-primary,#0c63e7)';
        }
      }, 3000);
    });
  });
}

// ── Tab 7: Learnings (curated anti-pattern memory) ───────────────────────────

const LEARNING_CATEGORIES = [
  'vietnamese_residue', 'word_salad', 'expanded_acronym', 'wrong_terminology',
  'missing_translation', 'broken_html', 'css_class_translated', 'reversed_noun_order',
  'stuttering', 'untranslated_linking_word', 'style_violation', 'other',
];

function loadLearnings() {
  const params = new URLSearchParams({ limit: 50, offset: (STATE.learningPage - 1) * 50 });
  if (STATE.learningStatusFilter)   params.set('status', STATE.learningStatusFilter);
  if (STATE.learningCategoryFilter) params.set('category', STATE.learningCategoryFilter);
  if (STATE.learningSearch)         params.set('search', STATE.learningSearch);
  api('GET', '/api/v1/dcc/admin/translation/learnings?' + params.toString())
    .then(d => { STATE.learnings = d; render(); })
    .catch(err => { STATE.error = String(err.message || err); render(); });
}

function learningStatusBadge(status) {
  ensureTxV43Styles();
  const variant = (status === 'approved' || status === 'auto' || status === 'disabled') ? status : 'disabled';
  const labels = {
    auto:     _t('Chờ duyệt', 'Pending'),
    approved: _t('Đã duyệt', 'Approved'),
    disabled: _t('Đã tắt', 'Disabled'),
  };
  return `<span class="tx-learning-status tx-learning-status--${variant}">${escapeHtml(labels[status] || status)}</span>`;
}

function renderLearnings() {
  const data  = STATE.learnings;
  const rows  = (data && Array.isArray(data.rows)) ? data.rows : [];
  const stats = (data && data.stats) || { auto: 0, approved: 0, disabled: 0, total: 0 };
  const total = (data && data.total) || 0;
  const page  = STATE.learningPage;
  const totalPages = Math.max(1, Math.ceil(total / 50));

  return `
    <section>
      <h3 style="margin:0 0 6px 0;">${_t('Bộ nhớ lỗi (Learning loop)', 'Learning memory')}</h3>
      <p style="color:var(--text-3);font-size:13px;margin:0 0 14px 0;">
        ${_t('Mỗi lần reviewer (Haiku) phát hiện lỗi, hệ thống tự ghi vào đây với trạng thái <b>Chờ duyệt</b>. Bạn duyệt các lỗi đúng — chúng sẽ được tự động chèn vào prompt của lần dịch sau để engine không lặp lại.',
             'Every time the reviewer (Haiku) flags an issue, it lands here as <b>Pending</b>. Approve the ones that are genuine errors — they will be auto-injected into the next translator/reviewer prompt so the engine learns not to repeat them.')}
      </p>

      <div style="display:flex;gap:10px;margin-bottom:14px;flex-wrap:wrap;align-items:center;">
        <div style="display:flex;gap:6px;">
          <span style="padding:4px 10px;border-radius:4px;background:var(--warn-bg,#fff8e1);color:var(--warn,#e0a000);font-size:12px;">
            ${_t('Chờ duyệt', 'Pending')}: <b>${stats.auto}</b>
          </span>
          <span style="padding:4px 10px;border-radius:4px;background:var(--success-bg,#e6f9ee);color:var(--success,#0a7e3a);font-size:12px;">
            ${_t('Đã duyệt', 'Approved')}: <b>${stats.approved}</b>
          </span>
          <span style="padding:4px 10px;border-radius:4px;background:var(--bg-2,#f5f7fb);color:var(--text-3);font-size:12px;">
            ${_t('Đã tắt', 'Disabled')}: <b>${stats.disabled}</b>
          </span>
        </div>
        <div style="margin-left:auto;display:flex;gap:6px;">
          <button id="tx-learning-new" style="padding:6px 12px;border:1px solid var(--brand-primary,#0c63e7);background:var(--brand-primary,#0c63e7);color:#fff;border-radius:4px;cursor:pointer;font-size:12px;">
            + ${_t('Thêm thủ công', 'New manual rule')}
          </button>
          <button id="tx-learning-regen" style="padding:6px 12px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:4px;cursor:pointer;font-size:12px;">
            ${_t('Tạo lại cache prompt', 'Rebuild prompt cache')}
          </button>
        </div>
      </div>

      <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;">
        <input id="tx-learning-search" placeholder="${_t('Tìm trong VI/EN/correct...', 'Search VI/EN/correct...')}"
          value="${escapeHtml(STATE.learningSearch)}"
          style="flex:1;min-width:240px;padding:7px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
        <select id="tx-learning-status" style="padding:7px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
          <option value="">${_t('— Mọi trạng thái —', '— Any status —')}</option>
          <option value="auto"    ${STATE.learningStatusFilter === 'auto' ? 'selected' : ''}>${_t('Chờ duyệt', 'Pending')}</option>
          <option value="approved"${STATE.learningStatusFilter === 'approved' ? 'selected' : ''}>${_t('Đã duyệt', 'Approved')}</option>
          <option value="disabled"${STATE.learningStatusFilter === 'disabled' ? 'selected' : ''}>${_t('Đã tắt', 'Disabled')}</option>
        </select>
        <select id="tx-learning-category" style="padding:7px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;font-size:13px;">
          <option value="">${_t('— Mọi loại —', '— Any category —')}</option>
          ${LEARNING_CATEGORIES.map(c => `<option value="${c}" ${STATE.learningCategoryFilter === c ? 'selected' : ''}>${c}</option>`).join('')}
        </select>
      </div>

      <div style="overflow-x:auto;">
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="text-align:left;border-bottom:2px solid var(--ln,#ddd);background:var(--bg-2,#f5f7fb);">
            <th style="padding:9px 8px;width:90px;">${_t('Trạng thái', 'Status')}</th>
            <th style="padding:9px 8px;">${_t('VI nguồn', 'VI source')}</th>
            <th style="padding:9px 8px;">${_t('EN sai (cấm)', 'EN wrong (ban)')}</th>
            <th style="padding:9px 8px;">${_t('EN đúng', 'EN correct')}</th>
            <th style="padding:9px 8px;width:140px;">${_t('Loại', 'Category')}</th>
            <th style="padding:9px 8px;width:60px;text-align:center;">${_t('Hits', 'Hits')}</th>
            <th style="padding:9px 8px;width:200px;text-align:right;"></th>
          </tr>
        </thead>
        <tbody>
          ${rows.length === 0
            ? `<tr><td colspan="7" style="padding:28px;text-align:center;color:var(--text-3);">${_t('Chưa có ghi nhớ nào.', 'No learnings yet.')}</td></tr>`
            : rows.map(renderLearningRow).join('')}
        </tbody>
      </table>
      </div>

      ${totalPages > 1 ? `
        <div style="margin-top:12px;display:flex;gap:6px;justify-content:flex-end;align-items:center;font-size:12px;color:var(--text-3);">
          ${_t('Trang', 'Page')} ${page} / ${totalPages}
          <button class="tx-learning-page" data-page="${page - 1}" ${page <= 1 ? 'disabled' : ''}
            style="padding:5px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;background:var(--bg,#fff);cursor:${page <= 1 ? 'default' : 'pointer'};opacity:${page <= 1 ? '.4' : '1'};">‹</button>
          <button class="tx-learning-page" data-page="${page + 1}" ${page >= totalPages ? 'disabled' : ''}
            style="padding:5px 10px;border:1px solid var(--ln,#ddd);border-radius:4px;background:var(--bg,#fff);cursor:${page >= totalPages ? 'default' : 'pointer'};opacity:${page >= totalPages ? '.4' : '1'};">›</button>
        </div>
      ` : ''}
    </section>
  `;
}

function renderLearningRow(row) {
  const id = row.learning_id;
  const status = row.status;
  return `
    <tr data-learning-id="${id}" style="border-bottom:1px solid var(--ln-2,#eee);vertical-align:top;">
      <td style="padding:9px 8px;">${learningStatusBadge(status)}</td>
      <td style="padding:9px 8px;font-size:12px;max-width:220px;word-break:break-word;">${escapeHtml(row.vi_pattern || '')}</td>
      <td style="padding:9px 8px;font-size:12px;color:var(--danger,#c00);max-width:200px;word-break:break-word;">${escapeHtml(row.en_wrong_pattern || '—')}</td>
      <td style="padding:9px 8px;font-size:12px;color:var(--success,#0a7e3a);max-width:220px;word-break:break-word;">${escapeHtml(row.en_correct || '—')}</td>
      <td style="padding:9px 8px;font-size:11px;color:var(--text-3);"><code>${escapeHtml(row.category || '')}</code><br><span style="font-size:10px;">${escapeHtml(row.severity || '')}</span></td>
      <td style="padding:9px 8px;font-size:12px;text-align:center;font-family:monospace;">${row.hit_count || 0}</td>
      <td style="padding:9px 8px;text-align:right;white-space:nowrap;">
        ${status !== 'approved' ? `<button class="tx-learning-approve" data-id="${id}" style="padding:4px 8px;border:1px solid var(--success,#0a7e3a);background:var(--success,#0a7e3a);color:#fff;border-radius:3px;cursor:pointer;font-size:11px;margin-right:3px;">${_t('Duyệt', 'Approve')}</button>` : ''}
        ${status !== 'disabled' ? `<button class="tx-learning-disable" data-id="${id}" style="padding:4px 8px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:3px;cursor:pointer;font-size:11px;margin-right:3px;">${_t('Tắt', 'Disable')}</button>` : ''}
        <button class="tx-learning-edit"   data-id="${id}" style="padding:4px 8px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:3px;cursor:pointer;font-size:11px;margin-right:3px;">${_t('Sửa', 'Edit')}</button>
        <button class="tx-learning-delete" data-id="${id}" style="padding:4px 8px;border:1px solid var(--danger,#c00);background:var(--bg,#fff);color:var(--danger,#c00);border-radius:3px;cursor:pointer;font-size:11px;">${_t('Xóa', 'Delete')}</button>
      </td>
    </tr>
  `;
}

function wireLearnings() {
  const sEl = document.getElementById('tx-learning-search');
  let st;
  if (sEl) sEl.addEventListener('input', () => {
    clearTimeout(st);
    st = setTimeout(() => {
      STATE.learningSearch = sEl.value.trim();
      STATE.learningPage = 1;
      loadLearnings();
    }, 400);
  });
  const statusEl = document.getElementById('tx-learning-status');
  if (statusEl) statusEl.addEventListener('change', () => {
    STATE.learningStatusFilter = statusEl.value;
    STATE.learningPage = 1;
    loadLearnings();
  });
  const catEl = document.getElementById('tx-learning-category');
  if (catEl) catEl.addEventListener('change', () => {
    STATE.learningCategoryFilter = catEl.value;
    STATE.learningPage = 1;
    loadLearnings();
  });
  document.querySelectorAll('.tx-learning-page').forEach(b => {
    b.addEventListener('click', () => {
      const p = parseInt(b.getAttribute('data-page'), 10);
      if (!isNaN(p) && p >= 1) { STATE.learningPage = p; loadLearnings(); }
    });
  });
  document.querySelectorAll('.tx-learning-approve').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      api('POST', '/api/v1/dcc/admin/translation/learnings/' + id + '/approve')
        .then(() => { toast(_t('✓ Đã duyệt', '✓ Approved')); loadLearnings(); })
        .catch(err => toast(_t('Lỗi: ', 'Error: ') + (err.message || err)));
    });
  });
  document.querySelectorAll('.tx-learning-disable').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      api('POST', '/api/v1/dcc/admin/translation/learnings/' + id + '/disable')
        .then(() => { toast(_t('✓ Đã tắt', '✓ Disabled')); loadLearnings(); })
        .catch(err => toast(_t('Lỗi: ', 'Error: ') + (err.message || err)));
    });
  });
  document.querySelectorAll('.tx-learning-delete').forEach(b => {
    b.addEventListener('click', () => {
      if (!confirm(_t('Xóa vĩnh viễn rule này?', 'Delete this rule permanently?'))) return;
      const id = b.getAttribute('data-id');
      api('DELETE', '/api/v1/dcc/admin/translation/learnings/' + id)
        .then(() => { toast(_t('✓ Đã xóa', '✓ Deleted')); loadLearnings(); })
        .catch(err => toast(_t('Lỗi: ', 'Error: ') + (err.message || err)));
    });
  });
  document.querySelectorAll('.tx-learning-edit').forEach(b => {
    b.addEventListener('click', () => {
      const id = b.getAttribute('data-id');
      const rows = (STATE.learnings && STATE.learnings.rows) || [];
      const row = rows.find(r => String(r.learning_id) === String(id));
      if (row) openLearningEditor(row);
    });
  });
  const newBtn = document.getElementById('tx-learning-new');
  if (newBtn) newBtn.addEventListener('click', () => openLearningEditor(null));
  const regenBtn = document.getElementById('tx-learning-regen');
  if (regenBtn) regenBtn.addEventListener('click', () => {
    api('POST', '/api/v1/dcc/admin/translation/learnings/regenerate-block')
      .then(d => toast(_t('✓ Cache cập nhật: ', '✓ Cache rebuilt: ') + (d.cache_path || '')))
      .catch(err => toast(_t('Lỗi: ', 'Error: ') + (err.message || err)));
  });
}

function openLearningEditor(row) {
  const isNew = !row;
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,.45);z-index:9999;display:flex;align-items:center;justify-content:center;';
  overlay.innerHTML = `
    <div style="background:var(--bg,#fff);border-radius:8px;max-width:640px;width:90vw;box-shadow:0 8px 32px rgba(0,0,0,.3);">
      <div style="padding:14px 18px;border-bottom:1px solid var(--ln,#ddd);display:flex;justify-content:space-between;align-items:center;">
        <strong>${isNew ? _t('Thêm rule thủ công', 'New manual rule') : _t('Sửa rule', 'Edit rule')}</strong>
        <button class="tx-learn-close" style="border:0;background:transparent;font-size:22px;cursor:pointer;">×</button>
      </div>
      <div style="padding:14px 18px;display:flex;flex-direction:column;gap:10px;font-size:13px;">
        <label>${_t('VI nguồn (bắt buộc)', 'VI source (required)')}
          <textarea class="tx-learn-vi" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;font-family:inherit;">${escapeHtml(row ? row.vi_pattern : '')}</textarea>
        </label>
        <label>${_t('EN sai (engine không được sinh ra)', 'EN wrong (forbidden output)')}
          <textarea class="tx-learn-wrong" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;color:var(--danger,#c00);">${escapeHtml(row ? (row.en_wrong_pattern || '') : '')}</textarea>
        </label>
        <label>${_t('EN đúng (bắt buộc)', 'EN correct (required)')}
          <textarea class="tx-learn-correct" rows="2" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;color:var(--success,#0a7e3a);">${escapeHtml(row ? (row.en_correct || '') : '')}</textarea>
        </label>
        <div style="display:flex;gap:10px;">
          <label style="flex:1;">${_t('Loại', 'Category')}
            <select class="tx-learn-cat" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;">
              ${LEARNING_CATEGORIES.map(c => `<option value="${c}" ${row && row.category === c ? 'selected' : ''}>${c}</option>`).join('')}
            </select>
          </label>
          <label style="flex:1;">${_t('Mức độ', 'Severity')}
            <select class="tx-learn-sev" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;">
              <option value="advisory" ${!row || row.severity === 'advisory' ? 'selected' : ''}>advisory</option>
              <option value="critical" ${row && row.severity === 'critical' ? 'selected' : ''}>critical</option>
            </select>
          </label>
        </div>
        <label>${_t('Ghi chú (tùy)', 'Notes (optional)')}
          <input type="text" class="tx-learn-notes" value="${escapeHtml(row ? (row.notes || '') : '')}" style="width:100%;padding:6px 8px;border:1px solid var(--ln,#ddd);border-radius:4px;">
        </label>
      </div>
      <div style="padding:12px 18px;border-top:1px solid var(--ln,#ddd);display:flex;justify-content:flex-end;gap:8px;">
        <button class="tx-learn-cancel" style="padding:7px 14px;border:1px solid var(--ln,#ddd);background:var(--bg,#fff);border-radius:4px;cursor:pointer;">${_t('Hủy', 'Cancel')}</button>
        <button class="tx-learn-save" style="padding:7px 14px;border:0;background:var(--brand-primary,#0c63e7);color:#fff;border-radius:4px;cursor:pointer;">
          ${isNew ? _t('Tạo + Duyệt', 'Create + Approve') : _t('Lưu', 'Save')}
        </button>
      </div>
    </div>`;
  document.body.appendChild(overlay);
  const close = () => overlay.remove();
  overlay.querySelector('.tx-learn-close').addEventListener('click', close);
  overlay.querySelector('.tx-learn-cancel').addEventListener('click', close);
  overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
  overlay.querySelector('.tx-learn-save').addEventListener('click', () => {
    const body = {
      vi_pattern: overlay.querySelector('.tx-learn-vi').value.trim(),
      en_wrong_pattern: overlay.querySelector('.tx-learn-wrong').value.trim(),
      en_correct: overlay.querySelector('.tx-learn-correct').value.trim(),
      category: overlay.querySelector('.tx-learn-cat').value,
      severity: overlay.querySelector('.tx-learn-sev').value,
      notes: overlay.querySelector('.tx-learn-notes').value.trim(),
    };
    const url = isNew
      ? '/api/v1/dcc/admin/translation/learnings'
      : '/api/v1/dcc/admin/translation/learnings/' + row.learning_id;
    api(isNew ? 'POST' : 'PUT', url, body)
      .then(() => { toast(_t('✓ Đã lưu', '✓ Saved')); close(); loadLearnings(); })
      .catch(err => alert(_t('Lỗi: ', 'Error: ') + (err.message || err)));
  });
}

// ── Promote-to-learning button injected into the review modal ─────────────
// `openReviewModal` (Documents tab) renders each issue with vi/en excerpts but
// no learning hook. Patch the issue card after render: find each .tx-review-body
// issue block and append a "Promote" button bound to the issue payload.
const _origOpenReviewModal = (typeof openReviewModal === 'function') ? openReviewModal : null;
if (_origOpenReviewModal) {
  window.openReviewModal = function (reviewId) {
    _origOpenReviewModal(reviewId);
    // The review JSON is fetched async; observe the body until issues land.
    let attempts = 0;
    const tick = setInterval(() => {
      attempts++;
      if (attempts > 40) { clearInterval(tick); return; }
      const body = document.querySelector('.tx-modal-body');
      if (!body) { clearInterval(tick); return; }
      const issueDivs = body.querySelectorAll('.tx-issue');
      if (issueDivs.length === 0) return;
      clearInterval(tick);
      // Pull review issues from the rendered DOM by walking each issue card.
      issueDivs.forEach((card, idx) => {
        if (card.querySelector('.tx-promote-learning')) return;
        const btn = document.createElement('button');
        btn.className = 'tx-promote-learning tx-promote-btn';
        btn.textContent = _t('+ Ghi vào bộ nhớ lỗi và duyệt', '+ Promote to learning (auto-approve)');
        btn.addEventListener('click', () => {
          // Extract the issue fields from the card's textContent. We re-fetch
          // the review JSON to get the structured issue rather than parse DOM.
          api('GET', '/api/v1/dcc/admin/translation/reviews/' + encodeURIComponent(reviewId))
            .then(d => {
              const r = (d && d.review) || {};
              let issues = r.issues_jsonb;
              if (typeof issues === 'string') { try { issues = JSON.parse(issues); } catch (_) { issues = []; } }
              if (!Array.isArray(issues) || !issues[idx]) {
                toast(_t('Không tìm thấy issue', 'Issue not found'));
                return;
              }
              return api('POST', '/api/v1/dcc/admin/translation/learnings/from-issue', {
                issue: issues[idx],
                doc_code: r.doc_code || '',
                review_id: parseInt(reviewId, 10),
                approve: true,
              });
            })
            .then(d => {
              if (d) {
                toast(_t('✓ Đã thêm vào bộ nhớ lỗi', '✓ Added to learning memory'));
                btn.disabled = true;
                btn.textContent = _t('✓ Đã thêm', '✓ Added');
                btn.style.opacity = '.6';
              }
            })
            .catch(err => toast(_t('Lỗi: ', 'Error: ') + (err.message || err)));
        });
        card.appendChild(btn);
      });
    }, 100);
  };
}

})();
