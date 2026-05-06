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
};

const TABS = [
  { id: 'routing',   vi: 'Routing',     en: 'Routing' },
  { id: 'providers', vi: 'Provider',    en: 'Providers' },
  { id: 'models',    vi: 'Model',       en: 'Models' },
  { id: 'test',      vi: 'Test bench',  en: 'Test bench' },
  { id: 'usage',     vi: 'Chi phí',     en: 'Cost & Usage' },
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
      throw new Error(msg);
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

window.renderAdminTranslationModule = function () {
  const el = document.getElementById('admin-content');
  if (!el) return;
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
    case 'test':      bodyEl.innerHTML = renderTestBench(); wireTestBench(); break;
    case 'usage':     bodyEl.innerHTML = renderUsage(); break;
  }
}

function switchTab(id) {
  STATE.activeTab = id;
  if (id === 'usage' && !STATE.usage) loadUsage();
  if (id === 'models') loadAllModels();
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
      if (!confirm(_t('Xóa rule này?', 'Delete this rule?'))) return;
      const id = parseInt(btn.dataset.ruleId, 10);
      api('DELETE', `/api/v1/dcc/admin/translation/routing/${id}`)
        .then(() => { toast(_t('Đã xóa', 'Deleted')); loadAll(); })
        .catch(err => alert(err.message));
    });
  });

  const addBtn = document.getElementById('tx-rule-add');
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const scopeValue = prompt(_t('Nhập doc_code chính xác hoặc pattern (vd: qms-man-* hoặc QMS-MAN-001):', 'Enter exact doc_code or pattern (e.g. qms-man-* or QMS-MAN-001):'));
      if (!scopeValue) return;
      const scopeType = scopeValue.includes('*') ? 'doc_pattern' : 'doc_code';
      const enabled = STATE.providers.filter(p => p.is_enabled);
      const provider = prompt(_t('Provider key (vd nllb, claude_cli, codex_cli):', 'Provider key (e.g. nllb, claude_cli, codex_cli):'),
        enabled[0] ? enabled[0].provider_key : '');
      if (!provider) return;
      const model = prompt(_t('Model (để trống nếu provider không có model):', 'Model (blank for providers without models):'), '') || null;
      api('POST', '/api/v1/dcc/admin/translation/routing', {
        scope_type: scopeType, scope_value: scopeValue,
        primary_provider: provider, primary_model: model,
        fallback_chain: [], is_enabled: true,
      }).then(() => { toast(_t('Đã thêm', 'Added')); loadAll(); })
        .catch(err => alert(err.message));
    });
  }
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
        .catch(err => alert(err.message));
    });

    const probe = card.querySelector('.tx-probe-cli');
    if (probe) probe.addEventListener('click', () => {
      probe.disabled = true; probe.textContent = '...';
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}/probe`)
        .then(d => { toast(`${key}: ${d.probe.status} — ${d.probe.message}`); loadAll(); })
        .catch(err => alert(err.message))
        .finally(() => { probe.disabled = false; probe.textContent = _t('Probe','Probe'); });
    });

    const saveCli = card.querySelector('.tx-save-cli');
    if (saveCli) saveCli.addEventListener('click', () => {
      const binary = card.querySelector('.tx-cli-binary').value.trim();
      const home = card.querySelector('.tx-cli-home').value.trim();
      api('PUT', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`, {
        cli_binary_path: binary, cli_auth_home_path: home,
      }).then(() => { toast(_t('Đã lưu','Saved')); loadAll(); })
        .catch(err => alert(err.message));
    });

    const saveKey = card.querySelector('.tx-save-key');
    if (saveKey) saveKey.addEventListener('click', () => {
      const apiKey = card.querySelector('.tx-api-key').value;
      if (!apiKey) return alert(_t('Nhập API key','Enter API key'));
      api('PUT', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`, { api_key: apiKey })
        .then(d => { toast(`${_t('Đã lưu — fingerprint','Saved — fingerprint')}: ${d.fingerprint}`); loadAll(); })
        .catch(err => alert(err.message));
    });

    const delKey = card.querySelector('.tx-delete-key');
    if (delKey) delKey.addEventListener('click', () => {
      if (!confirm(_t('Xóa credential cho provider này?','Delete credential for this provider?'))) return;
      api('DELETE', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}`)
        .then(() => { toast(_t('Đã xóa','Deleted')); loadAll(); })
        .catch(err => alert(err.message));
    });

    const loginBtn = card.querySelector('.tx-cli-login');
    if (loginBtn) loginBtn.addEventListener('click', () => openCliLoginModal(key));

    const logoutBtn = card.querySelector('.tx-cli-logout');
    if (logoutBtn) logoutBtn.addEventListener('click', () => {
      if (!confirm(_t('Đăng xuất CLI cho provider này? Sẽ phải đăng nhập lại để dùng.','Logout this CLI provider? You will need to connect again to use it.'))) return;
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(key)}/logout`)
        .then(() => { toast(_t('Đã đăng xuất','Logged out')); loadAll(); })
        .catch(err => alert(err.message));
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
  const url = session.auth_url;
  const code = session.pairing_code || '';
  const isPaste = !!session.expects_paste;
  const instructions = (lang === 'en' ? session.instructions_en : session.instructions_vi) || '';

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
      if (!token) return alert(_t('Paste token trước','Paste the token first'));
      const btn = document.getElementById('tx-cli-submit-code');
      btn.disabled = true; btn.textContent = '⟳ ' + _t('Đang xử lý...','Processing...');
      api('POST', `/api/v1/dcc/admin/translation/credentials/${encodeURIComponent(providerKey)}/login/complete`, {
        session_id: session.session_id, code: token,
      }).then(d => handleLoginResult(d.result, providerKey))
        .catch(err => {
          alert(err.message);
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
        .catch(err => alert(err.message))
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
    if (!STATE.testInput.source_html.trim()) return alert(_t('Cần source','Source required'));
    if (STATE.testInput.selectedProviders.length === 0) return alert(_t('Chọn ít nhất 1 provider','Select at least 1 provider'));
    runBtn.disabled = true; runBtn.textContent = '⟳ ' + _t('Đang dịch...','Translating...');
    const providers = STATE.testInput.selectedProviders.map(pk => {
      // Trust the per-test dropdown first; fall back to the routing rule's
      // primary_model so the test mirrors what production would send.
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
    }).catch(err => alert(err.message))
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

})();
