// APP STATE
// ═══════════════════════════════════════════════════
let currentUser = null;
let currentPage = 'dashboard';
let currentFilter = 'ALL';
let searchQuery = '';
let currentFolderPath = []; // Hierarchical navigation: ['08-Organization','03-Job-Descriptions','01-JD-EXE']
let folderEditMode = false; // Toggle for file manager edit mode
let docHeaderMetaCollapsed = true;
const PORTAL_VIEW_STATE_KEY = 'hesem_portal_view_state_v1';
const PORTAL_VIEW_STATE_TTL_MS = 12 * 60 * 60 * 1000;
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
let pendingAuthTimer = null;
let loginSubmitInFlight = false;

function syncCurrentUserRef(user){
  currentUser = user || null;
  try{
    window.currentUser = currentUser;
    window.__currentUser = currentUser;
  }catch(e){}
  return currentUser;
}

syncCurrentUserRef(null);

function portalViewStateStore(){
  try{ return window.sessionStorage || null; }catch(e){ return null; }
}

function normalizePortalViewFolderPath(value){
  try{
    return Array.isArray(value)
      ? value.map(v => String(v || '').trim()).filter(Boolean).slice(0, 12)
      : [];
  }catch(e){
    return [];
  }
}

function readPortalViewState(){
  try{
    const store = portalViewStateStore();
    if(!store) return null;
    const raw = store.getItem(PORTAL_VIEW_STATE_KEY);
    if(!raw) return null;
    const state = JSON.parse(raw);
    if(!state || typeof state !== 'object') return null;
    const savedAt = Number(state.savedAt || 0);
    if(!savedAt || (Date.now() - savedAt) > PORTAL_VIEW_STATE_TTL_MS){
      store.removeItem(PORTAL_VIEW_STATE_KEY);
      return null;
    }
    return state;
  }catch(e){
    return null;
  }
}

function writePortalViewState(state){
  try{
    const store = portalViewStateStore();
    if(!store) return;
    store.setItem(PORTAL_VIEW_STATE_KEY, JSON.stringify(state || {}));
  }catch(e){}
}

function persistPortalViewState(reason='update'){
  try{
    const viewer = document.getElementById('doc-viewer');
    const activeDocCode = String(currentDoc || '').trim();
    const doc = activeDocCode && typeof DOCS !== 'undefined' && Array.isArray(DOCS)
      ? (DOCS.find(d => String(d && d.code || '').trim() === activeDocCode) || null)
      : null;
    const viewerOpen = !!(viewer && viewer.classList.contains('active') && activeDocCode);
    const state = {
      savedAt: Date.now(),
      reason: String(reason || 'update'),
      lang: String(lang || 'vi') === 'en' ? 'en' : 'vi',
      page: String(currentPage || 'dashboard'),
      filter: String(currentFilter || 'ALL'),
      folderPath: normalizePortalViewFolderPath(currentFolderPath),
      type: viewerOpen ? 'doc' : 'page'
    };
    if(viewerOpen){
      state.page = state.page || 'documents';
      state.docCode = activeDocCode;
      state.docPath = String(window.currentDocPath || (doc && doc.path) || '');
    }
    writePortalViewState(state);
  }catch(e){}
}

async function restorePortalViewAfterBoot(){
  const state = readPortalViewState();
  if(!state){
    navigateTo('dashboard');
    return false;
  }

  const nextLang = String(state.lang || '').trim();
  if(nextLang === 'en' || nextLang === 'vi'){
    lang = nextLang;
    try{ localStorage.setItem('hesem_lang', nextLang); }catch(e){}
    try{ initLang(); }catch(e){}
  }

  const savedFilter = String(state.filter || 'ALL').trim() || 'ALL';
  const savedFolderPath = normalizePortalViewFolderPath(state.folderPath);

  if(state.type === 'doc'){
    try{
      const docRef = {code:String(state.docCode || '').trim(), path:String(state.docPath || '').trim()};
      const doc = (typeof resolveDocRecord === 'function')
        ? resolveDocRecord(docRef)
        : (typeof DOCS !== 'undefined' && Array.isArray(DOCS) ? DOCS.find(d => String(d && d.path || '') === docRef.path || String(d && d.code || '') === docRef.code) : null);
      if(doc && !(typeof isDocHidden === 'function' && isDocHidden(doc.code) && !isAdmin())
          && !(typeof canAccessDoc === 'function' && !canAccessDoc(doc.code))){
        const restoredPage = String(state.page || 'documents').trim() || 'documents';
        currentPage = restoredPage === 'dashboard' ? 'documents' : restoredPage;
        currentFilter = savedFilter;
        currentFolderPath = savedFolderPath;
        try{ renderSidebar(); }catch(e){}
        try{ syncSidebarToggleState(); }catch(e){}
        await openDoc(doc);
        return true;
      }
    }catch(e){}
  }

  currentFolderPath = savedFolderPath;
  const restoredPage = String(state.page || 'dashboard').trim() || 'dashboard';
  if(restoredPage === 'documents'){
    currentFilter = savedFilter;
    navigateTo('documents', undefined, true);
  }else{
    navigateTo(restoredPage, undefined, true);
  }
  return true;
}

window.__hesemPortalBeforeHardReload = function(){
  persistPortalViewState('before-hard-reload');
};
window.__hesemPortalPersistViewState = persistPortalViewState;
window.__hesemPortalRestoreViewAfterBoot = restorePortalViewAfterBoot;

function clearPendingAuthTimer(){
  if(pendingAuthTimer){
    clearTimeout(pendingAuthTimer);
    pendingAuthTimer = null;
  }
}

function getPendingAuthExpiredMessage(kind){
  if(kind === 'enroll'){
    return lang==='en'
      ? 'Authenticator setup timed out. Please sign in again.'
      : 'Phiên thiết lập Authenticator đã hết hạn. Vui lòng đăng nhập lại.';
  }
  return lang==='en'
    ? 'Authenticator verification timed out. Please sign in again.'
    : 'Phiên xác thực OTP đã hết hạn. Vui lòng đăng nhập lại.';
}

function schedulePendingAuthTimer(stage, pendingExpiresIn){
  clearPendingAuthTimer();
  if(stage !== 'mfa' && stage !== 'enroll') return;
  const ttlSeconds = Number(pendingExpiresIn);
  const ttlMs = Number.isFinite(ttlSeconds) && ttlSeconds > 0
    ? Math.max(1000, ttlSeconds * 1000)
    : PENDING_AUTH_TTL_MS;
  pendingAuthTimer = setTimeout(()=>{
    resetPortalToLogin({stage:'password', errorMsg:getPendingAuthExpiredMessage(stage)});
  }, ttlMs + 250);
}

function resetPortalToLogin(options={}){
  const opts = options || {};
  const stage = opts.stage || 'password';
  const stageMsg = opts.stageMsg || '';
  const errorMsg = opts.errorMsg || '';
  const preserveUsername = opts.preserveUsername !== false;

  clearPendingAuthTimer();
  try{ if(typeof stopLiveDocsSync==='function') stopLiveDocsSync(); }catch(e){}
  syncCurrentUserRef(null);
  _syncCsrf(null);
  enrollInfo = null;

  const app = document.getElementById('app');
  if(app) app.classList.remove('active');
  const login = document.getElementById('login-screen');
  if(login) login.style.display = 'flex';
  document.getElementById('doc-viewer')?.classList.remove('active');
  document.getElementById('user-dropdown')?.classList.remove('show');
  setDocHeaderToolbar('');

  const savedUsername = preserveUsername ? (document.getElementById('inp-user')?.value || '') : '';
  setLoginStage(stage, stageMsg, opts.pendingExpiresIn);
  if(preserveUsername){
    const user = document.getElementById('inp-user');
    if(user) user.value = savedUsername;
  }
  if(errorMsg) showLoginError(errorMsg);
}

function showPendingAuthStage(stage, stageMsg='', pendingExpiresIn=null){
  resetPortalToLogin({stage, stageMsg, pendingExpiresIn});
}

function setDocHeaderMetaCollapsed(collapsed){
  docHeaderMetaCollapsed = !!collapsed;
}

function syncDocViewerDetailVisibility(){
  const headerEl = document.getElementById('doc-viewer-header');
  if(headerEl){
    headerEl.classList.toggle('details-collapsed', docHeaderMetaCollapsed);
    headerEl.style.display = docHeaderMetaCollapsed ? 'none' : '';
  }
  const historyEl = document.getElementById('vh-container');
  if(historyEl){
    historyEl.classList.toggle('is-collapsed', docHeaderMetaCollapsed);
  }
}

function setDocHeaderToolbar(html=''){
  const toolbarEl = document.getElementById('doc-header-toolbar');
  if(!toolbarEl) return;
  const content = String(html || '').trim();
  toolbarEl.innerHTML = content;
  toolbarEl.classList.toggle('is-active', !!content);
}

function toggleDocHeaderMeta(force){
  setDocHeaderMetaCollapsed(typeof force === 'boolean' ? force : !docHeaderMetaCollapsed);
  syncDocViewerDetailVisibility();
  if(currentDoc){
    const doc = DOCS.find(d=>d.code===currentDoc);
    if(doc) updateDocViewerHeader(doc);
  }
}

function getDocHeaderIcon(name){
  const icons = {
    edit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
    save:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8"/><path d="M7 3v5h8"/></svg>',
    upload:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M20 16.5a3.5 3.5 0 0 1-3.5 3.5h-9A3.5 3.5 0 0 1 4 16.5"/></svg>',
    submit:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M22 2 11 13"/><path d="m22 2-7 20-4-9-9-4 20-7z"/></svg>',
    cancel:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>',
    approve:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/></svg>',
    reject:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 9 9 15"/><path d="m9 9 6 6"/><circle cx="12" cy="12" r="9"/></svg>',
    revision:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M23 4v6h-6"/><path d="M20.5 15a9 9 0 1 1-2.6-9.4L23 10"/></svg>',
    back:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 18-6-6 6-6"/><path d="M21 12H9"/></svg>',
    external:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6"/><path d="M10 14 20 4"/><path d="M20 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h5"/></svg>',
    download:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/></svg>',
    expand:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m6 9 6 6 6-6"/></svg>',
    collapse:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 15-6-6-6 6"/></svg>'
  };
  return icons[name] || icons.expand;
}

function cleanDocHeaderButtonLabel(label){
  return String(label || '').replace(/^[^\p{L}\p{N}]+/u, '').trim();
}

function renderDocHeaderButton(label, icon, tone, onClick, extraClass='', extraAttrs=''){
  const toneClass = tone ? ` dv-btn-${tone}` : '';
  const className = extraClass ? ` ${extraClass}` : '';
  const attrs = extraAttrs ? ` ${extraAttrs}` : '';
  const cleanLabel = cleanDocHeaderButtonLabel(label);
  return `<button class="dv-btn${toneClass}${className}"${attrs} onclick="${onClick}"><span class="dv-btn-ico">${getDocHeaderIcon(icon)}</span><span class="dv-btn-label">${cleanLabel}</span></button>`;
}

function renderDocViewerBreadcrumb(doc){
  const bc = document.getElementById('header-breadcrumb');
  if(!bc || !doc) return;
  const docCode = String((doc && doc.code) || currentDoc || '').trim();
  const displayTitle = (typeof getDocDisplayTitle === 'function') ? getDocDisplayTitle(doc) : String((doc && doc.title) || '').trim();
  const displayCode = (typeof getDocDisplayCode === 'function') ? getDocDisplayCode(doc) : docCode;
  const safe = (typeof escapeHtml === 'function') ? escapeHtml : function(v){
    return String(v || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  };
  const filterId = String(currentFilter || 'ALL').trim();
  let bcHtml = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];navigateTo('documents')">🏠</span>`;
  if(filterId && filterId !== 'ALL'){
    const cat = Array.isArray(CATEGORIES) ? CATEGORIES.find(c => String(c && c.id || '') === filterId) : null;
    const rawCatLabel = cat && typeof catLabel === 'function' ? catLabel(cat) : (cat ? String(cat.label || filterId) : filterId);
    const catText = String(rawCatLabel || filterId).split('(')[0].trim() || filterId;
    bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
    bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];navigateTo('documents','${safe(filterId)}')">${cat ? safe(cat.icon || '') : ''} ${safe(catText)}</span>`;
  }
  const folders = Array.isArray(currentFolderPath) ? currentFolderPath : [];
  for(let i=0; i<folders.length; i++){
    const seg = String(folders[i] || '').trim();
    if(!seg) continue;
    const label = (typeof getSubfolderLabel === 'function') ? getSubfolderLabel(seg) : seg;
    bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
    bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});navigateTo('documents')">${safe(label)}</span>`;
  }
  bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span><span style="font-weight:700">${safe(displayCode)}</span>`;
  if(displayTitle && displayTitle.toUpperCase() !== String(displayCode || '').toUpperCase()){
    bcHtml += `<span style="color:var(--text-3);margin:0 6px">•</span><span class="current">${safe(displayTitle)}</span>`;
  }
  bc.innerHTML = bcHtml;
  bc.style.display = 'flex';
  bc.style.alignItems = 'center';
  bc.style.flex = '1';
}
window.renderDocViewerBreadcrumb = renderDocViewerBreadcrumb;

// Server-backed (folder-based) document workflow state + DCR record
// NOTE: This replaces the old sessionStorage-only versioning for ISO compliance.
const SERVER_DOC_STATE = {};      // code -> state
const SERVER_DOC_VERSIONS = {};   // code -> versions[] (manifest)

// Document visibility (Effective Documents)
// Hidden docs are removed from the user-facing portal lists/search.
// Admin can manage them in Admin ? Effective Documents.
let HIDDEN_DOCS = new Set();

function isDocHidden(code){
  try{ return HIDDEN_DOCS && HIDDEN_DOCS.has(code); }catch(e){ return false; }
}

function getVisibleDocs(){
  return DOCS.filter(d=>!isDocHidden(d.code));
}

async function loadDocVisibilityFromServer(){
  try{
    const res = await apiCall('docs_visibility_get', null, 'GET');
    if(res && res.ok){
      const hidden = Array.isArray(res.hidden) ? res.hidden : [];
      HIDDEN_DOCS = new Set(hidden);
    }
  }catch(e){ /* ignore */ }
}

async function saveDocVisibilityToServer(){
  const hidden = Array.from(HIDDEN_DOCS || []);
  return await apiCall('admin_docs_visibility_save', {hidden});
}

let userDocOverridesHydrated = false;
let userDocOverridesLoadPromise = null;

function userPermOverrideKey(user){
  if(!user || typeof user !== 'object') return '';
  const username = String(user.username || '').trim().toLowerCase();
  if(username) return username;
  const employeeId = String(user.employee_id || user.id || '').trim();
  return employeeId.toLowerCase();
}

function normalizeUserDocOverrideEntry(entry){
  const safe = (entry && typeof entry === 'object') ? entry : {};
  const grant = Array.from(new Set((Array.isArray(safe.grant) ? safe.grant : []).map(code => String(code||'').trim().toUpperCase()).filter(Boolean)));
  const deny = Array.from(new Set((Array.isArray(safe.deny) ? safe.deny : []).map(code => String(code||'').trim().toUpperCase()).filter(Boolean)));
  return {grant, deny};
}

function normalizeUserDocOverridesMap(map){
  const normalized = {};
  if(!map || typeof map !== 'object') return normalized;
  Object.keys(map).forEach(key => {
    const safeKey = String(key || '').trim().toLowerCase();
    if(!safeKey) return;
    const row = normalizeUserDocOverrideEntry(map[key]);
    if(!row.grant.length && !row.deny.length) return;
    normalized[safeKey] = row;
  });
  return normalized;
}

async function loadUserDocOverridesFromServer(options={}){
  if(!currentUser) return PERM_OVERRIDES;
  if(userDocOverridesLoadPromise && !options.force) return userDocOverridesLoadPromise;
  if(userDocOverridesHydrated && !options.force) return PERM_OVERRIDES;

  userDocOverridesLoadPromise = (async ()=>{
    try{
      const res = await apiCall('user_doc_overrides_get', null, 'GET');
      if(res && res.ok){
        PERM_OVERRIDES = normalizeUserDocOverridesMap(res.overrides || {});
        userDocOverridesHydrated = true;
        try{ savePermOverrides(); }catch(e){}
      }else if(!options.silent){
        showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en' ? 'user_doc_overrides_load_failed' : 'Không tải được override quyền tài liệu')));
      }
    }catch(e){
      if(!options.silent){
        showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'user_doc_overrides_load_failed' : 'Không tải được override quyền tài liệu')));
      }
    }finally{
      userDocOverridesLoadPromise = null;
    }
    return PERM_OVERRIDES;
  })();

  return userDocOverridesLoadPromise;
}

async function saveUserDocOverridesToServer(){
  const overrides = normalizeUserDocOverridesMap(PERM_OVERRIDES);
  const res = await apiCall('admin_user_doc_overrides_save', {overrides});
  if(res && res.ok){
    PERM_OVERRIDES = normalizeUserDocOverridesMap(res.overrides || overrides);
    userDocOverridesHydrated = true;
    try{ savePermOverrides(); }catch(e){}
  }
  return res;
}

const PORTAL_DISPLAY_BUILTIN_EXTENSIONS = Object.freeze(['html','pdf','doc','docx','docm','xls','xlsx','xlsm','xlsb','csv','ppt','pptx','pptm']);
let PORTAL_DISPLAY_CONFIG = createDefaultPortalDisplayConfig();
let PORTAL_DISPLAY_CONFIG_DRAFT = null;
let portalDisplayConfigDirty = false;
let portalDisplayConfigHydrated = false;
let portalDisplayConfigLoadPromise = null;

function createDefaultPortalDisplayConfig(){
  return {
    extensions: {
      builtin: [...PORTAL_DISPLAY_BUILTIN_EXTENSIONS],
      custom: [],
      known: [...PORTAL_DISPLAY_BUILTIN_EXTENSIONS],
      enabled: [...PORTAL_DISPLAY_BUILTIN_EXTENSIONS]
    },
    sidebar: {
      hidden_core_items: [],
      hidden_sections: [],
      hidden_categories: []
    }
  };
}

function normalizePortalDisplayExt(value){
  return String(value||'').trim().toLowerCase().replace(/^\./,'').replace(/[^a-z0-9]+/g,'').slice(0,16);
}

function normalizePortalDisplayLowerList(values){
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach(value => {
    const token = String(value||'').trim().toLowerCase().replace(/[^a-z0-9_-]+/g,'');
    if(!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });
  return out;
}

function normalizePortalDisplayUpperList(values){
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach(value => {
    const token = String(value||'').trim().toUpperCase().replace(/[^A-Z0-9_-]+/g,'');
    if(!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });
  return out;
}

function sanitizePortalDisplayConfig(config){
  const base = createDefaultPortalDisplayConfig();
  const builtin = [...PORTAL_DISPLAY_BUILTIN_EXTENSIONS];
  const custom = [];
  const customSeen = new Set();
  (Array.isArray(config?.extensions?.custom) ? config.extensions.custom : []).forEach(value => {
    const ext = normalizePortalDisplayExt(value);
    if(!ext || customSeen.has(ext) || builtin.includes(ext)) return;
    customSeen.add(ext);
    custom.push(ext);
  });
  const known = [...builtin, ...custom];
  const enabledTokens = new Set((Array.isArray(config?.extensions?.enabled) ? config.extensions.enabled : builtin).map(normalizePortalDisplayExt).filter(Boolean));
  const enabled = known.filter(ext => enabledTokens.has(ext));
  const hiddenCoreItems = normalizePortalDisplayLowerList(config?.sidebar?.hidden_core_items).filter(id => id !== 'admin');
  return {
    extensions: {
      builtin,
      custom,
      known,
      enabled
    },
    sidebar: {
      hidden_core_items: hiddenCoreItems,
      hidden_sections: normalizePortalDisplayLowerList(config?.sidebar?.hidden_sections),
      hidden_categories: normalizePortalDisplayUpperList(config?.sidebar?.hidden_categories)
    }
  };
}

function portalDisplayConfigFingerprint(config){
  try{ return JSON.stringify(sanitizePortalDisplayConfig(config)); }catch(e){ return String(Date.now()); }
}

function applyPortalDisplayConfig(config, options={}){
  const next = sanitizePortalDisplayConfig(config);
  const changed = portalDisplayConfigFingerprint(next) !== portalDisplayConfigFingerprint(PORTAL_DISPLAY_CONFIG);
  PORTAL_DISPLAY_CONFIG = next;
  portalDisplayConfigHydrated = true;
  if(!portalDisplayConfigDirty || options.forceDraftSync){
    PORTAL_DISPLAY_CONFIG_DRAFT = sanitizePortalDisplayConfig(next);
    portalDisplayConfigDirty = false;
  }
  try{
    if(currentPage === 'documents' && currentFilter && !isPortalSidebarCategoryVisible(currentFilter)){
      currentFilter = '';
    }
  }catch(e){}
  return changed;
}

function ensurePortalDisplayConfigDraft(){
  if(!PORTAL_DISPLAY_CONFIG_DRAFT){
    PORTAL_DISPLAY_CONFIG_DRAFT = sanitizePortalDisplayConfig(PORTAL_DISPLAY_CONFIG);
  }
  return PORTAL_DISPLAY_CONFIG_DRAFT;
}

async function loadPortalDisplayConfigFromServer(options={}){
  if(!isAdmin()) return PORTAL_DISPLAY_CONFIG;
  if(portalDisplayConfigLoadPromise && !options.force){
    return portalDisplayConfigLoadPromise;
  }
  if(portalDisplayConfigHydrated && !options.force){
    return PORTAL_DISPLAY_CONFIG;
  }
  const shouldSyncDraft = !!options.forceDraftSync || !portalDisplayConfigDirty;
  portalDisplayConfigLoadPromise = (async () => {
    try{
      const res = await apiCall('admin_portal_display_config_get', null, 'GET');
      if(res && res.ok && res.config){
        applyPortalDisplayConfig(res.config, {forceDraftSync: shouldSyncDraft});
        if(currentPage === 'admin' && adminTab === 'portal_display'){
          renderAdminPortalDisplay();
        }else{
          try{ renderSidebar(); }catch(e){}
        }
      }else if(!options.silent){
        showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en'?'display_config_load_failed':'Không tải được cấu hình hiển thị portal')));
      }
    }catch(e){
      if(!options.silent){
        showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en'?'display_config_load_failed':'Không tải được cấu hình hiển thị portal')));
      }
    }finally{
      portalDisplayConfigLoadPromise = null;
    }
    return PORTAL_DISPLAY_CONFIG;
  })();
  return portalDisplayConfigLoadPromise;
}

const ACCESS_ROLE_LEGACY_MAP = Object.freeze({
  general_director:'ceo',
  purchasing_officer:'buyer',
  procurement_manager:'supply_chain_manager',
  warehouse_staff:'warehouse_clerk',
  warehouse_lead:'supply_chain_manager',
  planning_manager:'production_planner',
  production_manager:'cnc_workshop_manager',
  qms_supervisor:'qms_engineer',
  doc_controller:'qms_engineer'
});

const PURCHASING_MODULE_DEFAULT_ROLES = Object.freeze([
  'admin',
  'it_admin',
  'ceo',
  'qa_manager',
  'quality_manager',
  'qms_engineer',
  'quality_engineer',
  'qc_inspector',
  'supply_chain_manager',
  'buyer',
  'warehouse_clerk',
  'tool_storekeeper',
  'logistics_coordinator',
  'production_planner'
]);

let MODULE_ACCESS_CONFIG = createDefaultModuleAccessConfig();
let MODULE_ACCESS_CONFIG_DRAFT = null;
let moduleAccessConfigDirty = false;
let moduleAccessConfigHydrated = false;
let moduleAccessConfigLoadPromise = null;

function normalizeAccessRole(value){
  const token = String(value || '').trim().toLowerCase().replace(/[^a-z0-9_-]+/g, '');
  if(!token) return '';
  return ACCESS_ROLE_LEGACY_MAP[token] || token;
}

function normalizeAccessRoleList(values){
  const out = [];
  const seen = new Set();
  (Array.isArray(values) ? values : []).forEach(value => {
    const token = normalizeAccessRole(value);
    if(!token || seen.has(token)) return;
    seen.add(token);
    out.push(token);
  });
  return out;
}

function normalizedUserAccessRoles(user){
  if(!user || typeof user !== 'object') return [];
  const rawRoles = Array.isArray(user.roles) && user.roles.length ? user.roles : [user.role];
  return normalizeAccessRoleList(rawRoles);
}

function isAdminUser(user){
  if(!user) return false;
  return normalizedUserAccessRoles(user).some(role => ADMIN_ROLES.includes(role));
}

function moduleAccessPortalCatalog(){
  return [
    {id:'dashboard', group:'core', icon:'🏠', labelEn:'Dashboard', labelVi:'Dashboard', noteEn:'Landing workspace and operational summary.', noteVi:'Màn hình tổng quan và điều hành chung.', defaultAccess:'all'},
    {id:'documents', group:'core', icon:'📁', labelEn:'All documents', labelVi:'Tất cả tài liệu', noteEn:'Governed document library.', noteVi:'Thư viện tài liệu được kiểm soát.', defaultAccess:'all'},
    {id:'search', group:'core', icon:'🔍', labelEn:'Search', labelVi:'Tìm kiếm', noteEn:'Portal-wide search.', noteVi:'Tìm kiếm toàn portal.', defaultAccess:'all'},
    {id:'dictionary', group:'core', icon:'📖', labelEn:'Dictionary', labelVi:'Từ điển thuật ngữ', noteEn:'Shared terminology and definitions.', noteVi:'Thuật ngữ và định nghĩa dùng chung.', defaultAccess:'all'},
    {id:'access', group:'core', icon:'📋', labelEn:'Access matrix', labelVi:'Ma trận phân quyền', noteEn:'Personal access and permission matrix view.', noteVi:'Xem ma trận quyền truy cập cá nhân.', defaultAccess:'all'},
    {id:'deploy', group:'core', icon:'🚀', labelEn:'Operations deploy', labelVi:'Triển khai vận hành', noteEn:'Deployment overview entry.', noteVi:'Điểm vào cho điều phối triển khai.', defaultAccess:'all'},
    {id:'exceptions', group:'quality', icon:'⚠️', labelEn:'Exception dashboard', labelVi:'Bảng ngoại lệ', noteEn:'Legacy exception dashboard entry.', noteVi:'Điểm vào bảng ngoại lệ cũ.', defaultAccess:'all', deprecated:true, deprecatedNote:'Merged into EQMS Suite → NCR/CAPA tab'},
    {id:'orders', group:'production', icon:'📦', labelEn:'Orders', labelVi:'Đơn hàng', noteEn:'Sales / job / work order coordination.', noteVi:'Điều phối SO / JO / WO.', defaultAccess:'all'},
    {id:'dispatch', group:'production', icon:'📋', labelEn:'Production dispatch', labelVi:'Phân công sản xuất', noteEn:'Dispatching and production assignment.', noteVi:'Phân công và điều phối sản xuất.', defaultAccess:'all'},
    {id:'mes', group:'production', icon:'🏭', labelEn:'Shop floor', labelVi:'Xưởng sản xuất', noteEn:'Execution workspace for production.', noteVi:'Không gian thực thi sản xuất.', defaultAccess:'all'},
    {id:'mobile-shopfloor', group:'production', icon:'📱', labelEn:'Operator mobile', labelVi:'Công nhân di động', noteEn:'Mobile operator workflow.', noteVi:'Quy trình cho công nhân di động.', defaultAccess:'all'},
    {id:'quoting', group:'production', icon:'💰', labelEn:'Quoting', labelVi:'Báo giá', noteEn:'Quoting and estimation workflow.', noteVi:'Quy trình báo giá và ước tính.', defaultAccess:'all'},
    {id:'purchasing', group:'supply', icon:'🧾', labelEn:'Purchasing & IQC', labelVi:'Mua hàng & IQC', noteEn:'Purchasing, incoming quality and warehouse touchpoints.', noteVi:'Mua hàng, chất lượng đầu vào và kho.', defaultAccess:'roles', defaultRoles:[...PURCHASING_MODULE_DEFAULT_ROLES]},
    {id:'quality-exceptions', group:'quality', icon:'🔴', labelEn:'Nonconformance', labelVi:'Sự không phù hợp', noteEn:'[Deprecated] Use EQMS Suite → NCR/CAPA. Legacy NCR/exception workflow.', noteVi:'[Đã hợp nhất] Dùng EQMS Suite → NCR/CAPA. Quy trình NCR/ngoại lệ cũ.', defaultAccess:'all', deprecated:true, deprecatedNote:'Merged into EQMS Suite → NCR/CAPA'},
    {id:'supplier-quality', group:'quality', icon:'🏪', labelEn:'Supplier quality', labelVi:'Chất lượng NCC', noteEn:'[Deprecated] Use EQMS Suite → Supplier Quality Network. Legacy supplier QA.', noteVi:'[Đã hợp nhất] Dùng EQMS Suite → Mạng lưới NCC. Đảm bảo chất lượng NCC cũ.', defaultAccess:'all', deprecated:true, deprecatedNote:'Merged into EQMS Suite → Suppliers'},
    {id:'fmea', group:'quality', icon:'⚡', labelEn:'FMEA & Control Plan', labelVi:'FMEA & Control Plan', noteEn:'[Deprecated] Use EQMS Suite → Risk & FMEA. Legacy risk analysis and control planning.', noteVi:'[Đã hợp nhất] Dùng EQMS Suite → Rủi ro & FMEA. Phân tích rủi ro cũ.', defaultAccess:'all', deprecated:true, deprecatedNote:'Merged into EQMS Suite → Risks/FMEA'},
    {id:'apqp-ppap', group:'quality', icon:'🎯', labelEn:'APQP / PPAP', labelVi:'APQP / PPAP', noteEn:'[Integrated] Now a native module inside EQMS Suite → Pre-Launch Quality group.', noteVi:'[Tích hợp] Nay là module nội bộ bên trong EQMS Suite → nhóm Tiền sản xuất.', defaultAccess:'all', deprecated:true, deprecatedNote:'Integrated into EQMS Suite → Pre-Launch Quality (IATF 16949)'},
    {id:'ai-scheduling', group:'quality', icon:'🤖', labelEn:'AI scheduling & quality', labelVi:'AI Lập lịch & Chất lượng', noteEn:'[Sidebar hidden] AI scheduling (accessible from Orders) + AI quality (use EQMS Tower).', noteVi:'[Ẩn sidebar] AI lập lịch (từ Đơn hàng) + AI chất lượng (dùng EQMS Tower).', defaultAccess:'all', deprecated:true, deprecatedNote:'AI quality merged into EQMS Tower; scheduling accessible from Orders module'},
    {id:'eqms', group:'eqms', icon:'🏯', labelEn:'EQMS Suite', labelVi:'EQMS Suite', noteEn:'Enterprise Quality Management System — 31 world-class quality modules (v4.1).', noteVi:'Hệ thống Quản lý Chất lượng Doanh nghiệp — 31 module chất lượng đẳng cấp (v4.1).', defaultAccess:'all'},
    {id:'forms', group:'records', icon:'📋', labelEn:'Evidence control', labelVi:'Kiểm soát chứng cứ', noteEn:'Controlled forms and evidence capture.', noteVi:'Biểu mẫu kiểm soát và thu thập chứng cứ.', defaultAccess:'all'},
    /* 'evidence' nav removed — Evidence Vault is now inside "Kiểm soát chứng cứ" (forms module), Chứng cứ tab */
    {id:'compliance-reports', group:'records', icon:'📊', labelEn:'Reports', labelVi:'Báo cáo', noteEn:'Compliance and operational reporting.', noteVi:'Báo cáo tuân thủ và vận hành.', defaultAccess:'all'},
    {id:'continuous-improvement', group:'records', icon:'🔄', labelEn:'Improvement', labelVi:'Cải tiến liên tục', noteEn:'Improvement tracking and follow-up.', noteVi:'Theo dõi cải tiến và hành động.', defaultAccess:'all'},
    {id:'knowledge-base', group:'records', icon:'💡', labelEn:'Knowledge base', labelVi:'Kho kiến thức', noteEn:'Governed know-how workspace.', noteVi:'Không gian tri thức được kiểm soát.', defaultAccess:'all'},
    {id:'cnc-programs', group:'tools', icon:'⚙', labelEn:'CNC programs', labelVi:'Chương trình CNC', noteEn:'CNC program management.', noteVi:'Quản lý chương trình CNC.', defaultAccess:'all'},
    {id:'product-passport', group:'tools', icon:'🔗', labelEn:'Product passport', labelVi:'Hộ chiếu sản phẩm', noteEn:'Digital product passport workspace.', noteVi:'Không gian hộ chiếu sản phẩm số.', defaultAccess:'all'},
    {id:'schema-studio', group:'tools', icon:'🗄', labelEn:'Schema studio', labelVi:'Schema Studio', noteEn:'Schema and metadata tooling.', noteVi:'Công cụ schema và metadata.', defaultAccess:'all'},
    {id:'energy-dashboard', group:'tools', icon:'⚡', labelEn:'Energy', labelVi:'Năng lượng', noteEn:'Energy and utility dashboards.', noteVi:'Dashboard năng lượng và tiện ích.', defaultAccess:'all'},
    {id:'customer-portal', group:'tools', icon:'🌐', labelEn:'Customer portal', labelVi:'Cổng khách hàng', noteEn:'Customer-facing workspace administration.', noteVi:'Quản trị không gian khách hàng.', defaultAccess:'all'},
    {id:'admin', group:'admin', icon:'⚙', labelEn:'Admin', labelVi:'Admin', noteEn:'System administration shell for the portal.', noteVi:'Không gian quản trị hệ thống portal.', defaultAccess:'admin', locked:true},
    {id:'template-demo', group:'admin', icon:'🧩', labelEn:'Master module template', labelVi:'Master Module Template', noteEn:'Template lab preview workspace.', noteVi:'Không gian xem trước template lab.', defaultAccess:'admin'},
    {id:'module-builder', group:'admin', icon:'➕', labelEn:'Module builder', labelVi:'Tạo Module mới', noteEn:'Module creation workspace.', noteVi:'Không gian tạo module mới.', defaultAccess:'admin'}
  ];
}

function moduleAccessAdminTabCatalog(){
  return [
    {id:'users', group:'identity', icon:'👥', labelEn:'Users', labelVi:'Người dùng', noteEn:'User account administration.', noteVi:'Quản trị tài khoản người dùng.', defaultAccess:'admin'},
    {id:'dept_title', group:'identity', icon:'🏢', labelEn:'Dept & Titles', labelVi:'Phòng ban & Chức danh', noteEn:'Departments and job titles.', noteVi:'Phòng ban và chức danh.', defaultAccess:'admin'},
    {id:'roles', group:'governance', icon:'🛡', labelEn:'Roles', labelVi:'Vai trò', noteEn:'Role model definition.', noteVi:'Định nghĩa mô hình vai trò.', defaultAccess:'admin'},
    {id:'orgchart', group:'identity', icon:'🏗', labelEn:'Org chart', labelVi:'Sơ đồ tổ chức', noteEn:'Organisation structure view.', noteVi:'Sơ đồ cấu trúc tổ chức.', defaultAccess:'admin'},
    {id:'perms', group:'governance', icon:'🔐', labelEn:'Permissions', labelVi:'Phân quyền tài liệu', noteEn:'Document and workflow permissions.', noteVi:'Phân quyền tài liệu và workflow.', defaultAccess:'admin'},
    {id:'module_access', group:'governance', icon:'🧭', labelEn:'Module access', labelVi:'Phân quyền module', noteEn:'Central visibility and access control for portal modules.', noteVi:'Điều khiển tập trung việc hiển thị và truy cập module.', defaultAccess:'admin', locked:true},
    {id:'activity', group:'governance', icon:'📊', labelEn:'Activity log', labelVi:'Kiểm soát hành vi', noteEn:'Audit and activity review.', noteVi:'Rà soát audit và hành vi.', defaultAccess:'admin'},
    {id:'docs', group:'content', icon:'📄', labelEn:'Effective docs', labelVi:'Tài liệu hiệu lực', noteEn:'Effective document administration.', noteVi:'Quản trị tài liệu hiệu lực.', defaultAccess:'admin'},
    {id:'portal_display', group:'content', icon:'🧭', labelEn:'Portal display', labelVi:'Hiển thị portal', noteEn:'Portal file and sidebar display control.', noteVi:'Điều khiển hiển thị file và sidebar portal.', defaultAccess:'admin'},
    {id:'retention', group:'content', icon:'📋', labelEn:'Retention', labelVi:'Lưu giữ', noteEn:'Retention policies and controlled evidence lifecycle.', noteVi:'Chính sách lưu giữ và vòng đời chứng cứ.', defaultAccess:'admin'},
    {id:'data_sources', group:'data', icon:'🗄', labelEn:'Data sources', labelVi:'Nguồn dữ liệu', noteEn:'Runtime data sources and integration status.', noteVi:'Nguồn dữ liệu runtime và trạng thái tích hợp.', defaultAccess:'admin'},
    {id:'metadata_studio', group:'data', icon:'🧬', labelEn:'Data Schema', labelVi:'Data Schema', noteEn:'Schema, metadata and data contract tooling.', noteVi:'Công cụ schema, metadata và data contract.', defaultAccess:'admin'},
    {id:'infrastructure', group:'data', icon:'🖥', labelEn:'VPS infrastructure', labelVi:'Hạ tầng VPS', noteEn:'Terminal, observability and host control plane.', noteVi:'Control plane cho host, terminal và observability.', defaultAccess:'admin'},
    {id:'manual_runtime', group:'operations', icon:'🧾', labelEn:'Manual runtime', labelVi:'Nhập tay vận hành', noteEn:'Manual runtime fallback workspace.', noteVi:'Không gian fallback nhập tay vận hành.', defaultAccess:'admin'},
    {id:'version_control', group:'operations', icon:'🔄', labelEn:'Version control', labelVi:'Điều khiển phiên bản', noteEn:'Git synchronization and release hygiene.', noteVi:'Đồng bộ Git và vệ sinh phát hành.', defaultAccess:'admin'},
    {id:'mfa', group:'security', icon:'🔑', labelEn:'MFA security', labelVi:'Bảo mật MFA', noteEn:'MFA policy and enrollment status.', noteVi:'Chính sách MFA và trạng thái kích hoạt.', defaultAccess:'admin'},
    {id:'ai_control', group:'operations', icon:'🤖', labelEn:'AI Control', labelVi:'Điều khiển AI', noteEn:'AI engine on/off, model selection, feature toggles, usage and cost tracking.', noteVi:'Bật/tắt AI engine, chọn model, tính năng, theo dõi sử dụng và chi phí.', defaultAccess:'admin'},
    {id:'appearance', group:'content', icon:'🎨', labelEn:'Appearance', labelVi:'Giao diện', noteEn:'Portal design system and theme settings.', noteVi:'Thiết lập giao diện và design system.', defaultAccess:'admin'}
  ];
}

function moduleAccessCatalog(scope){
  return scope === 'admin_tabs' ? moduleAccessAdminTabCatalog() : moduleAccessPortalCatalog();
}

function moduleAccessMeta(scope, id){
  const target = String(id || '').trim().toLowerCase();
  return moduleAccessCatalog(scope).find(item => String(item.id || '').toLowerCase() === target) || null;
}

function createDefaultModuleAccessConfig(){
  const config = { portal_modules:{}, admin_tabs:{} };
  moduleAccessPortalCatalog().forEach(meta => {
    config.portal_modules[meta.id] = {
      enabled: true,
      access: meta.defaultAccess || 'all',
      roles: normalizeAccessRoleList(meta.defaultRoles || [])
    };
  });
  moduleAccessAdminTabCatalog().forEach(meta => {
    config.admin_tabs[meta.id] = {
      enabled: true,
      access: meta.defaultAccess || 'admin',
      roles: normalizeAccessRoleList(meta.defaultRoles || [])
    };
  });
  return config;
}

function sanitizeModuleAccessPolicy(policy, meta){
  const defaultPolicy = {
    enabled: true,
    access: String(meta && meta.defaultAccess || 'all').toLowerCase(),
    roles: normalizeAccessRoleList(meta && meta.defaultRoles || [])
  };
  if(meta && meta.locked){
    return defaultPolicy;
  }
  const access = ['all','admin','roles'].includes(String(policy && policy.access || '').toLowerCase())
    ? String(policy.access).toLowerCase()
    : defaultPolicy.access;
  return {
    enabled: Object.prototype.hasOwnProperty.call(policy || {}, 'enabled') ? !!policy.enabled : defaultPolicy.enabled,
    access,
    roles: normalizeAccessRoleList(policy && policy.roles || defaultPolicy.roles)
  };
}

function sanitizeModuleAccessConfig(config){
  const next = { portal_modules:{}, admin_tabs:{} };
  moduleAccessPortalCatalog().forEach(meta => {
    next.portal_modules[meta.id] = sanitizeModuleAccessPolicy(config && config.portal_modules && config.portal_modules[meta.id], meta);
  });
  moduleAccessAdminTabCatalog().forEach(meta => {
    next.admin_tabs[meta.id] = sanitizeModuleAccessPolicy(config && config.admin_tabs && config.admin_tabs[meta.id], meta);
  });
  return next;
}

function moduleAccessConfigFingerprint(config){
  try{ return JSON.stringify(sanitizeModuleAccessConfig(config)); }catch(e){ return String(Date.now()); }
}

function applyModuleAccessConfig(config, options={}){
  const next = sanitizeModuleAccessConfig(config);
  MODULE_ACCESS_CONFIG = next;
  moduleAccessConfigHydrated = true;
  if(!moduleAccessConfigDirty || options.forceDraftSync){
    MODULE_ACCESS_CONFIG_DRAFT = sanitizeModuleAccessConfig(next);
    moduleAccessConfigDirty = false;
  }
  return next;
}

function ensureModuleAccessConfigDraft(){
  if(!MODULE_ACCESS_CONFIG_DRAFT){
    MODULE_ACCESS_CONFIG_DRAFT = sanitizeModuleAccessConfig(MODULE_ACCESS_CONFIG);
  }
  return MODULE_ACCESS_CONFIG_DRAFT;
}

function normalizeModuleAccessPageId(page){
  const key = String(page || '').trim().toLowerCase();
  if(key === 'vps-control') return 'admin';
  return key;
}

function moduleAccessPolicy(scope, id, config){
  const safeConfig = (config && typeof config === 'object') ? config : MODULE_ACCESS_CONFIG;
  const key = String(id || '').trim().toLowerCase();
  return scope === 'admin_tabs'
    ? (safeConfig.admin_tabs[key] || null)
    : (safeConfig.portal_modules[normalizeModuleAccessPageId(key)] || null);
}

function canUserAccessPolicy(policy, user=currentUser){
  if(!user || !policy || policy.enabled === false) return false;
  if(policy.access === 'all') return true;
  if(policy.access === 'admin') return isAdminUser(user);
  if(policy.access === 'roles'){
    const allowedRoles = Array.isArray(policy.roles) ? policy.roles : [];
    return isAdminUser(user) || normalizedUserAccessRoles(user).some(role => allowedRoles.includes(role));
  }
  return false;
}

function canUserAccessModule(moduleId, user=currentUser, config=MODULE_ACCESS_CONFIG){
  return canUserAccessPolicy(moduleAccessPolicy('portal_modules', moduleId, config), user);
}

function canUserAccessAdminTab(tabId, user=currentUser, config=MODULE_ACCESS_CONFIG){
  return canUserAccessPolicy(moduleAccessPolicy('admin_tabs', tabId, config), user);
}

function firstAccessiblePortalModule(user=currentUser, config=MODULE_ACCESS_CONFIG){
  const catalog = moduleAccessPortalCatalog();
  for(let i=0;i<catalog.length;i+=1){
    const id = catalog[i] && catalog[i].id;
    if(id && canUserAccessModule(id, user, config)) return id;
  }
  return 'dashboard';
}

function firstAccessibleAdminTab(user=currentUser, config=MODULE_ACCESS_CONFIG){
  const catalog = moduleAccessAdminTabCatalog();
  for(let i=0;i<catalog.length;i+=1){
    const id = catalog[i] && catalog[i].id;
    if(id && canUserAccessAdminTab(id, user, config)) return id;
  }
  return 'users';
}

async function loadModuleAccessConfigFromServer(options={}){
  if(!currentUser) return MODULE_ACCESS_CONFIG;
  if(moduleAccessConfigLoadPromise && !options.force){
    return moduleAccessConfigLoadPromise;
  }
  if(moduleAccessConfigHydrated && !options.force){
    return MODULE_ACCESS_CONFIG;
  }
  const shouldSyncDraft = !!options.forceDraftSync || !moduleAccessConfigDirty;
  moduleAccessConfigLoadPromise = (async () => {
    try{
      const res = await apiCall('module_access_get', null, 'GET');
      if(res && res.ok && res.config){
        applyModuleAccessConfig(res.config, {forceDraftSync: shouldSyncDraft});
        if(currentPage === 'admin' && adminTab === 'module_access'){
          renderAdminModuleAccess();
        }else{
          try{ renderSidebar(); }catch(e){}
        }
      }else if(!options.silent){
        showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en' ? 'module_access_load_failed' : 'Không tải được cấu hình phân quyền module')));
      }
    }catch(e){
      if(!options.silent){
        showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'module_access_load_failed' : 'Không tải được cấu hình phân quyền module')));
      }
    }finally{
      moduleAccessConfigLoadPromise = null;
    }
    return MODULE_ACCESS_CONFIG;
  })();
  return moduleAccessConfigLoadPromise;
}

function portalSidebarCoreItems(){
  return [
    {id:'dashboard', icon:'🏠', label:lang==='en'?'Dashboard':'Dashboard'},
    {id:'documents', icon:'📁', label:lang==='en'?'All documents':'Tất cả tài liệu'},
    {id:'search', icon:'🔍', label:lang==='en'?'Search':'Tìm kiếm'},
    {id:'dictionary', icon:'📖', label:lang==='en'?'Dictionary':'Từ điển thuật ngữ'},
    {id:'deploy', icon:'🚀', label:lang==='en'?'Operations deploy':'Triển khai vận hành'},
    {id:'exceptions', icon:'\u26a0\ufe0f', label:lang==='en'?'Exception dashboard':'B\u1ea3ng ngo\u1ea1i l\u1ec7'},
    {id:'admin', icon:'⚙', label:'Admin', locked:true},
  ];
}

function portalSidebarSections(){
  return [
    {id:'system', label:lang==='en'?'System documents':'Tài liệu hệ thống'},
    {id:'ops', label:lang==='en'?'Operational documents':'Tài liệu vận hành'},
    {id:'train', label:lang==='en'?'Training & competency':'Đào tạo & năng lực'}
  ];
}

function portalSidebarCategoryItems(){
  return (Array.isArray(CATEGORIES) ? CATEGORIES : []).filter(cat => cat && !cat.hidden).map(cat => ({
    id: String(cat.id||'').toUpperCase(),
    icon: cat.icon || '•',
    label: (typeof catLabel === 'function') ? catLabel(cat) : String(cat.label || cat.id || ''),
    section: String(cat.section || '').toLowerCase()
  }));
}

function isPortalSidebarCoreVisible(id){
  const key = String(id||'').toLowerCase();
  if(key === 'admin') return true;
  return !((PORTAL_DISPLAY_CONFIG?.sidebar?.hidden_core_items || []).includes(key));
}

function canAccessVpsControlTower(){
  return !!currentUser && canUserAccessModule('admin') && canUserAccessAdminTab('infrastructure');
}

function canAccessPurchasingWorkspace(){
  return !!currentUser && canUserAccessModule('purchasing');
}

function openPurchasingWorkspaceFromShell(){
  if(canAccessPurchasingWorkspace()){
    navigateTo('purchasing');
    return;
  }
  showToast(lang==='en' ? 'You do not have access to Purchasing & IQC.' : 'Bạn không có quyền truy cập Mua hàng & IQC.');
}

function isPortalSidebarSectionVisible(id){
  const key = String(id||'').toLowerCase();
  return !((PORTAL_DISPLAY_CONFIG?.sidebar?.hidden_sections || []).includes(key));
}

function isPortalSidebarCategoryVisible(id){
  const key = String(id||'').toUpperCase();
  return !((PORTAL_DISPLAY_CONFIG?.sidebar?.hidden_categories || []).includes(key));
}

function portalCategoryHasPhysicalTree(catId){
  try{
    if(typeof getTreeNodesForCategory !== 'function') return false;
    return getTreeNodesForCategory(catId).length > 0;
  }catch(e){
    return false;
  }
}

function getPortalCategoryPhysicalNodeCount(catId){
  try{
    if(typeof getTreeNodesForCategory !== 'function') return 0;
    const nodes = getTreeNodesForCategory(catId);
    if(!Array.isArray(nodes) || nodes.length === 0) return 0;
    const catDocs = Array.isArray(DOCS) ? DOCS.filter(d => d && d.cat === catId) : [];
    const root = (typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(catId, catDocs) : null;
    if(root && Array.isArray(root.subs) && root.subs.length > 0) return root.subs.length;
    return nodes.length;
  }catch(e){
    return 0;
  }
}

function setPortalDisplayConfigDirty(value){
  portalDisplayConfigDirty = !!value;
  const bar = document.getElementById('portal-display-save-bar');
  if(bar) bar.style.display = portalDisplayConfigDirty ? 'flex' : 'none';
}

function setPortalDisplayCoreItemVisible(id, visible){
  const draft = ensurePortalDisplayConfigDraft();
  const key = String(id||'').toLowerCase();
  if(key === 'admin') return;
  const hidden = new Set(draft.sidebar.hidden_core_items || []);
  if(visible) hidden.delete(key); else hidden.add(key);
  draft.sidebar.hidden_core_items = Array.from(hidden);
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function setPortalDisplaySectionVisible(id, visible){
  const draft = ensurePortalDisplayConfigDraft();
  const key = String(id||'').toLowerCase();
  const hidden = new Set(draft.sidebar.hidden_sections || []);
  if(visible) hidden.delete(key); else hidden.add(key);
  draft.sidebar.hidden_sections = Array.from(hidden);
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function setPortalDisplayCategoryVisible(id, visible){
  const draft = ensurePortalDisplayConfigDraft();
  const key = String(id||'').toUpperCase();
  const hidden = new Set(draft.sidebar.hidden_categories || []);
  if(visible) hidden.delete(key); else hidden.add(key);
  draft.sidebar.hidden_categories = Array.from(hidden);
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function setPortalDisplayExtensionVisible(ext, visible){
  const draft = ensurePortalDisplayConfigDraft();
  const key = normalizePortalDisplayExt(ext);
  if(!key) return;
  const enabled = new Set(draft.extensions.enabled || []);
  if(visible) enabled.add(key); else enabled.delete(key);
  draft.extensions.enabled = draft.extensions.known.filter(item => enabled.has(item));
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function removePortalDisplayCustomExtension(ext){
  const draft = ensurePortalDisplayConfigDraft();
  const key = normalizePortalDisplayExt(ext);
  if(!key) return;
  draft.extensions.custom = (draft.extensions.custom || []).filter(item => item !== key);
  draft.extensions.known = draft.extensions.builtin.concat(draft.extensions.custom);
  draft.extensions.enabled = (draft.extensions.enabled || []).filter(item => item !== key);
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function addPortalDisplayCustomExtension(){
  const input = document.getElementById('portal-display-new-ext');
  const ext = normalizePortalDisplayExt(input ? input.value : '');
  if(!ext){
    showToast(lang==='en'?'⚠ Enter a valid extension':'⚠ Nhập đuôi file hợp lệ');
    return;
  }
  const draft = ensurePortalDisplayConfigDraft();
  if((draft.extensions.known || []).includes(ext)){
    showToast(lang==='en'?'ℹ Extension already exists':'ℹ Đuôi file đã tồn tại');
    return;
  }
  draft.extensions.custom = [...(draft.extensions.custom || []), ext];
  draft.extensions.known = draft.extensions.builtin.concat(draft.extensions.custom);
  draft.extensions.enabled = [...(draft.extensions.enabled || []), ext];
  setPortalDisplayConfigDirty(true);
  renderAdminPortalDisplay();
}

function resetPortalDisplayConfigDraft(){
  PORTAL_DISPLAY_CONFIG_DRAFT = sanitizePortalDisplayConfig(PORTAL_DISPLAY_CONFIG);
  setPortalDisplayConfigDirty(false);
  renderAdminPortalDisplay();
}

async function savePortalDisplayConfig(){
  if(!isAdmin()) return;
  const draft = sanitizePortalDisplayConfig(ensurePortalDisplayConfigDraft());
  const current = sanitizePortalDisplayConfig(PORTAL_DISPLAY_CONFIG);
  const extensionsChanged = JSON.stringify(draft.extensions) !== JSON.stringify(current.extensions);
  try{
    const res = await apiCall('admin_portal_display_config_save', {config: draft});
    if(!(res && res.ok && res.config)){
      showToast('⚠ ' + ((res && res.error) ? res.error : 'save_failed'));
      return;
    }
    applyPortalDisplayConfig(res.config, {forceDraftSync:true});
    if(extensionsChanged && typeof rescanDocs === 'function'){
      await rescanDocs();
    }else{
      try{ renderSidebar(); }catch(e){}
      try{
        if(currentPage==='documents' && typeof renderDocuments==='function') renderDocuments();
        if(currentPage==='search' && typeof renderSearch==='function') renderSearch();
        if(currentPage==='dashboard' && typeof renderDashboard==='function') renderDashboard();
      }catch(e){}
    }
    showToast(lang==='en'?'✅ Portal display settings saved':'✅ Đã lưu cấu hình hiển thị portal');
    if(currentPage === 'admin') renderAdmin();
  }catch(e){
    showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en'?'Server error':'Lỗi server')));
  }
}


async function refreshAllDocStatesFromServer(){
  try{
    const docs = DOCS.map(d=>({code:d.code, base_path:d.path}));
    const res = await apiCall('docs_snapshot', {docs});
    if(res && res.ok && res.states){
      Object.keys(res.states).forEach(code=>{ SERVER_DOC_STATE[code]=res.states[code]; });
    }
  }catch(e){ /* ignore */ }
}

async function refreshDocFromServer(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    const res = await controlPlaneDocumentAuthoringRequest('versions', {code, base_path: doc?doc.path:''}, 'GET');
    if(res && res.ok){
      if(res.state) SERVER_DOC_STATE[code]=res.state;
      SERVER_DOC_VERSIONS[code]=Array.isArray(res.versions)?res.versions:[];
      return res;
    }
  }catch(e){ /* ignore */ }
  return null;
}

function normalizeClientRoleDocsMap(raw, fallback){
  const base = (fallback && typeof fallback === 'object') ? fallback : {};
  const source = (raw && typeof raw === 'object') ? raw : {};
  const normalized = {};
  Object.keys(base).forEach(role=>{
    const entry = base[role];
    if(entry === 'ALL'){
      normalized[role] = 'ALL';
      return;
    }
    if(Array.isArray(entry)){
      normalized[role] = Array.from(new Set(entry.map(pattern => String(pattern||'').trim().toUpperCase()).filter(Boolean)));
    }
  });
  Object.keys(source).forEach(role=>{
    const safeRole = String(role || '').trim();
    if(!safeRole) return;
    const entry = source[role];
    if(String(entry || '').trim().toUpperCase() === 'ALL'){
      normalized[safeRole] = 'ALL';
      return;
    }
    if(!Array.isArray(entry)) return;
    normalized[safeRole] = Array.from(new Set(entry.map(pattern => String(pattern||'').trim().toUpperCase()).filter(Boolean)));
  });
  return normalized;
}

function applyAuthoritativeRoleDocs(raw){
  const next = normalizeClientRoleDocsMap(raw, ROLE_DOCS);
  Object.keys(ROLE_DOCS).forEach(role => { delete ROLE_DOCS[role]; });
  Object.keys(next).forEach(role => {
    ROLE_DOCS[role] = next[role] === 'ALL' ? 'ALL' : [...next[role]];
  });
}

function exportAuthoritativeRoleDocs(){
  return normalizeClientRoleDocsMap(ROLE_DOCS);
}

async function loadRolePermsFromServer(){
  try{
    const res = await apiCall('role_perms_get', null, 'GET');
    if(res && res.ok && res.perms){
      Object.keys(res.perms).forEach(r=>{
        if(!ROLES[r]) return;
        if(res.perms[r] && typeof res.perms[r].canEditDocs!=='undefined'){
          ROLES[r].canEditDocs = !!res.perms[r].canEditDocs;
        }
        if(res.perms[r] && typeof res.perms[r].canCreateDocs!=='undefined'){
          ROLES[r].canCreateDocs = !!res.perms[r].canCreateDocs;
        }
      });
      if(res.role_docs && typeof res.role_docs === 'object'){
        applyAuthoritativeRoleDocs(res.role_docs);
      }
    }
  }catch(e){ /* ignore */ }
}

async function saveRolePermsToServer(){
  const perms={};
  Object.keys(ROLES).forEach(r=>{
    perms[r]={
      canEditDocs: !!ROLES[r].canEditDocs,
      canCreateDocs: !!ROLES[r].canCreateDocs
    };
  });
  const res = await apiCall('admin_role_perms_save',{
    perms,
    role_docs: exportAuthoritativeRoleDocs()
  });
  if(res && res.ok){
    if(res.perms && typeof res.perms === 'object'){
      Object.keys(res.perms).forEach(r=>{
        if(!ROLES[r]) return;
        if(res.perms[r] && typeof res.perms[r].canEditDocs!=='undefined'){
          ROLES[r].canEditDocs = !!res.perms[r].canEditDocs;
        }
        if(res.perms[r] && typeof res.perms[r].canCreateDocs!=='undefined'){
          ROLES[r].canCreateDocs = !!res.perms[r].canCreateDocs;
        }
      });
    }
    if(res.role_docs && typeof res.role_docs === 'object'){
      applyAuthoritativeRoleDocs(res.role_docs);
    }
  }
  return res;
}

async function resetAuthoritativeRoleDocsEditor(){
  await loadRolePermsFromServer();
  adminUnsaved = false;
  renderAdminPerms();
}

async function loadCustomDocsFromServer(){
  try{
    const res = await apiCall('docs_custom_list', null, 'GET');
    if(res && res.ok && Array.isArray(res.docs)){
      let added=false;
      res.docs.forEach(d=>{
        if(!d || !d.code) return;
        if(!DOCS.find(x=>x.code===d.code)){
          DOCS.push(d);
          added=true;
        }
      });
      if(added){
        // Keep docs sorted by code for UX
        DOCS.sort((a,b)=>String(a.code).localeCompare(String(b.code)));
      }
    }
  }catch(e){ /* ignore */ }
}


// ═══════════════════════════════════════════════════
// AUTH
// ═══════════════════════════════════════════════════
let csrfToken = null;
// Sync csrfToken to window.csrfToken so EQMS shell modules (40-eqms-shell.js)
// and REST-based modules (50-eqms-audits.js etc.) can read it via window.csrfToken.
function _syncCsrf(v){ csrfToken = v; window.csrfToken = v; }
let loginStage = 'password';
let nextAfterLogin = null;
let enrollInfo = null;

function getNextParam(){
  try{
    const params = new URLSearchParams(window.location.search);
    const n = params.get('next');
    if(n && typeof n === 'string'){
      const cleaned = n.replace(/^\/+/, '');
      if(!cleaned.includes('..') && !cleaned.startsWith('http') && !cleaned.startsWith('//')){
        nextAfterLogin = cleaned;
      }
    }
  }catch(e){}
}

async function apiCall(action, payload=null, method='POST', timeoutMs=45000){
  let url = 'api.php?action=' + encodeURIComponent(action);
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const opts = {method, credentials:'include', headers:{}};
  if(controller) opts.signal = controller.signal;
  if(method !== 'GET') opts.headers['Content-Type'] = 'application/json';
  if(csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(payload && method !== 'GET') {
    opts.body = JSON.stringify(payload);
  } else if(payload && method === 'GET') {
    const params = new URLSearchParams();
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if(value === undefined || value === null || value === '') return;
      params.append(
        key,
        (typeof value === 'object')
          ? JSON.stringify(value)
          : String(value)
      );
    });
    const query = params.toString();
    if(query) url += '&' + query;
  }

  // Track writes so the auto-reload mechanism (00-version-check.js) can
  // defer until after the save completes. Reads are not tracked — losing
  // a re-fetchable read on reload is harmless.
  const isWrite = (method !== 'GET' && method !== 'HEAD');
  if (isWrite) _apiInFlightWrites++;

  let timer = null;
  try{
    if(controller && timeoutMs && timeoutMs > 0){
      timer = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, timeoutMs);
    }
    const res = await fetch(url, opts);
    let data = null;
    try{ data = await res.json(); }catch(e){}
    if(!data) throw new Error('Invalid server response');
    return data;
  }finally{
    if(timer) clearTimeout(timer);
    if (isWrite && _apiInFlightWrites > 0) _apiInFlightWrites--;
  }
}

async function apiCallFormData(action, formData, timeoutMs=120000){
  const url = 'api.php?action=' + encodeURIComponent(action);
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const opts = {method:'POST', credentials:'include', headers:{}};
  if(controller) opts.signal = controller.signal;
  if(csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  opts.body = formData;
  // FormData uploads are always writes — track them for the auto-reload
  // guard the same way apiCall() above does.
  _apiInFlightWrites++;
  let timer = null;
  try{
    if(controller && timeoutMs && timeoutMs > 0){
      timer = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, timeoutMs);
    }
    const res = await fetch(url, opts);
    let data = null;
    try{ data = await res.json(); }catch(e){}
    if(!data) throw new Error('Invalid server response');
    return data;
  }finally{
    if(timer) clearTimeout(timer);
    if (_apiInFlightWrites > 0) _apiInFlightWrites--;
  }
}

const ADMIN_AUTH_STATE = {
  org: {loaded:false, loading:false, error:'', orgUnits:[], positions:[], employees:[], lastLoadedAt:0},
  roles: {loaded:false, loading:false, error:'', items:[], byCode:{}, lastLoadedAt:0},
  audit: {loaded:false, loading:false, error:'', events:[], lastLoadedAt:0}
};

function apiRequest(path, options={}){
  const method = (options.method || 'GET').toUpperCase();
  const payload = Object.prototype.hasOwnProperty.call(options, 'payload') ? options.payload : null;
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 45000;
  const headers = Object.assign({}, options.headers || {});
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const opts = {method, credentials:'include', headers};
  const isWrite = (method !== 'GET' && method !== 'HEAD');
  if(controller) opts.signal = controller.signal;
  let url = path;
  if(!/^https?:\/\//i.test(url) && !url.startsWith('/')){
    url = url.replace(/^\.?\//, '');
  }
  if(payload && method === 'GET'){
    const params = new URLSearchParams();
    Object.keys(payload).forEach(key => {
      const value = payload[key];
      if(value === undefined || value === null || value === '') return;
      params.append(key, (typeof value === 'object') ? JSON.stringify(value) : String(value));
    });
    const query = params.toString();
    if(query){
      url += (url.includes('?') ? '&' : '?') + query;
    }
  }else if(payload && method !== 'GET'){
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(payload);
  }
  if(csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;

  let timer = null;
  if(isWrite) _apiInFlightWrites++;
  return (async ()=>{
    try{
      if(controller && timeoutMs > 0){
        timer = setTimeout(()=>{ try{ controller.abort(); }catch(e){} }, timeoutMs);
      }
      const res = await fetch(url, opts);
      let data = null;
      try{ data = await res.json(); }catch(e){}
      if(!data) throw new Error('Invalid server response');
      return data;
    }finally{
      if(timer) clearTimeout(timer);
      if(isWrite && _apiInFlightWrites > 0) _apiInFlightWrites--;
    }
  })();
}

function controlPlaneDocumentAuthoringPath(action){
  return '/api/v1/eqms/control-plane/documents/' + String(action || '').replace(/^\/+/, '');
}

async function controlPlaneDocumentAuthoringRequest(action, payload=null, method='POST', timeoutMs=45000){
  return await apiRequest(controlPlaneDocumentAuthoringPath(action), {
    method,
    payload,
    timeoutMs
  });
}

function runtimeApiPath(domain, table, recordId=''){
  const base = `/api/runtime/${encodeURIComponent(domain)}/${encodeURIComponent(table)}`;
  return recordId ? `${base}/${encodeURIComponent(recordId)}` : base;
}

function runtimeErrorMessage(res, fallbackKey){
  if(res && typeof res.error === 'string' && res.error.trim()) return res.error.trim();
  return fallbackKey || 'runtime_request_failed';
}

async function runtimeList(domain, table, query, options={}){
  const timeoutMs = Number.isFinite(Number(options.timeoutMs)) ? Number(options.timeoutMs) : 12000;
  return await apiRequest(runtimeApiPath(domain, table), {method:'GET', payload:query||null, timeoutMs});
}

async function runtimeCreate(domain, table, data){
  return await apiRequest(runtimeApiPath(domain, table), {
    method:'POST',
    payload:Object.assign({}, data || {}, {request_id:`${table}_create_${Date.now()}`})
  });
}

async function runtimeUpdate(domain, table, recordId, data, rowVersion=null){
  const payload = Object.assign({}, data || {});
  if(rowVersion !== null && rowVersion !== undefined && rowVersion !== ''){
    payload.expected_row_version = rowVersion;
  }
  return await apiRequest(runtimeApiPath(domain, table, recordId), {method:'PUT', payload});
}

function safeJsonObject(value){
  return (value && typeof value === 'object' && !Array.isArray(value)) ? value : {};
}

function defaultDepartmentColor(code){
  const fallback = (DEFAULT_DEPARTMENTS || []).find(d => String(d.code||'') === String(code||''));
  if(fallback && fallback.color) return fallback.color;
  const palette = ['#2563eb','#16a34a','#dc2626','#7c3aed','#0f766e','#d97706','#0891b2','#a21caf','#65a30d','#475569'];
  const seed = String(code||'GEN').split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0);
  return palette[seed % palette.length];
}

function orgUnitTypeWeight(type){
  const order = {company:0, division:1, department:2, section:3, team:4};
  return Object.prototype.hasOwnProperty.call(order, type) ? order[type] : 99;
}

function roleRecordUi(roleCode, roleRow){
  const legacy = ROLES[roleCode] || {};
  const permissions = safeJsonObject(roleRow && roleRow.permissions);
  const labelVi = String((roleRow && (roleRow.role_label_vi || roleRow.role_label)) || legacy.label || roleCode || '');
  const labelEn = String((roleRow && roleRow.role_label) || legacy.labelEn || labelVi || roleCode || '');
  return {
    level: Number.isFinite(Number(permissions.level)) ? Number(permissions.level) : Number(legacy.level || 5),
    approve: (typeof permissions.approve === 'boolean') ? permissions.approve : !!legacy.approve,
    admin: !!legacy.admin,
    canEditDocs: (typeof permissions.canEditDocs === 'boolean') ? permissions.canEditDocs : !!legacy.canEditDocs,
    canCreateDocs: (typeof permissions.canCreateDocs === 'boolean') ? permissions.canCreateDocs : !!legacy.canCreateDocs,
    canViewActivity: (typeof permissions.canViewActivity === 'boolean') ? permissions.canViewActivity : !!legacy.canViewActivity,
    canExportUsers: (typeof permissions.canExportUsers === 'boolean') ? permissions.canExportUsers : !!legacy.canExportUsers,
    label: labelVi,
    labelEn: labelEn,
    color: String(permissions.color || legacy.color || defaultDepartmentColor((roleRow && roleRow.dept_code) || legacy.dept || roleCode)),
    icon: String(permissions.icon || legacy.icon || '👤'),
    dept: String((roleRow && roleRow.dept_code) || legacy.dept || '')
  };
}

function hydrateAuthoritativeRoleProjection(){
  const byCode = {};
  (ADMIN_AUTH_STATE.roles.items || []).forEach(row => {
    const roleCode = String((row && row.role_code) || '').trim();
    if(!roleCode) return;
    const ui = roleRecordUi(roleCode, row);
    const target = ROLES[roleCode] || {};
    Object.assign(target, ui, {
      roleId: String(row.role_id || target.roleId || ''),
      description: String(row.description || target.description || ''),
      isActive: row.is_active !== false
    });
    ROLES[roleCode] = target;
    byCode[roleCode] = row;
  });
  ADMIN_AUTH_STATE.roles.byCode = byCode;
}

function hydrateAuthoritativeOrgProjection(){
  const activeUnits = (ADMIN_AUTH_STATE.org.orgUnits || []).filter(unit => String(unit.status || 'active') !== 'inactive');
  const activePositions = (ADMIN_AUTH_STATE.org.positions || []).filter(position => String(position.status || 'active') !== 'inactive');
  const departments = activeUnits
    .slice()
    .sort((a,b)=>{
      const typeCmp = orgUnitTypeWeight(String(a.org_unit_type||'')) - orgUnitTypeWeight(String(b.org_unit_type||''));
      if(typeCmp !== 0) return typeCmp;
      return String(a.org_unit_code||'').localeCompare(String(b.org_unit_code||''));
    })
    .map(unit=>{
      const metadata = safeJsonObject(unit.metadata);
      return {
        code: String(unit.org_unit_code || ''),
        label: String(unit.org_unit_name || unit.org_unit_code || ''),
        labelEn: String(metadata.label_en || unit.org_unit_name || unit.org_unit_code || ''),
        color: String(metadata.color || defaultDepartmentColor(unit.org_unit_code)),
        orgUnitId: String(unit.hcm_org_unit_id || ''),
        orgUnitType: String(unit.org_unit_type || 'department'),
        parentOrgUnitId: String(unit.parent_org_unit_id || ''),
        managerEmployeeId: String(unit.manager_employee_id || ''),
        costCenter: String(unit.cost_center || ''),
        status: String(unit.status || 'active')
      };
    })
    .filter(item => item.code);
  DEPARTMENTS = departments;
  const titlesByDept = {};
  const deptCodeById = {};
  departments.forEach(dept=>{
    titlesByDept[dept.code] = [];
    deptCodeById[dept.orgUnitId] = dept.code;
  });
  activePositions.forEach(position=>{
    const deptCode = deptCodeById[String(position.hcm_org_unit_id || '')];
    if(!deptCode) return;
    const title = String(position.position_title || '').trim();
    if(!title) return;
    if(!titlesByDept[deptCode].includes(title)){
      titlesByDept[deptCode].push(title);
    }
  });
  Object.keys(titlesByDept).forEach(code=>{
    titlesByDept[code].sort((a,b)=>a.localeCompare(b));
  });
  DEPT_TITLES = titlesByDept;
  syncTitlesFromDept();
  syncUsersWithAuthoritativeOrg();
}

function resolveAuthoritativeUserAssignment(selection={}){
  const requestedDeptCode = String(selection.dept || '').trim().toUpperCase();
  const requestedTitle = String(selection.title || '').trim();
  const requestedOrgUnitId = String(selection.hcm_org_unit_id || '').trim();
  const requestedPositionId = String(selection.hcm_position_id || '').trim();
  const orgUnits = (ADMIN_AUTH_STATE.org.orgUnits || []).slice();
  const positions = (ADMIN_AUTH_STATE.org.positions || []).slice();
  const orgUnitById = {};
  const orgUnitByCode = {};
  const positionById = {};
  orgUnits.forEach(unit=>{
    const id = String(unit.hcm_org_unit_id || '');
    const code = String(unit.org_unit_code || '').trim().toUpperCase();
    if(id) orgUnitById[id] = unit;
    if(code && !orgUnitByCode[code]) orgUnitByCode[code] = unit;
  });
  positions.forEach(position=>{
    const id = String(position.hcm_position_id || '');
    if(id) positionById[id] = position;
  });

  let orgUnit = requestedOrgUnitId ? (orgUnitById[requestedOrgUnitId] || null) : null;
  if(!orgUnit && requestedDeptCode) orgUnit = orgUnitByCode[requestedDeptCode] || null;

  let position = requestedPositionId ? (positionById[requestedPositionId] || null) : null;
  if(!position && requestedTitle){
    const normalizedTitle = requestedTitle.toLowerCase();
    position = positions.find(item=>{
      if(String(item.position_title || '').trim().toLowerCase() !== normalizedTitle) return false;
      if(!orgUnit) return true;
      return String(item.hcm_org_unit_id || '') === String(orgUnit.hcm_org_unit_id || '');
    }) || null;
    if(!position && orgUnit){
      position = positions.find(item=>String(item.position_title || '').trim().toLowerCase() === normalizedTitle) || null;
    }
  }

  if(position && !orgUnit){
    orgUnit = orgUnitById[String(position.hcm_org_unit_id || '')] || null;
  }
  if(position){
    const positionOrgUnit = orgUnitById[String(position.hcm_org_unit_id || '')] || null;
    if(positionOrgUnit) orgUnit = positionOrgUnit;
  }

  return {
    orgUnit,
    position,
    orgUnitId: String((orgUnit && orgUnit.hcm_org_unit_id) || ''),
    positionId: String((position && position.hcm_position_id) || ''),
    deptCode: String((orgUnit && orgUnit.org_unit_code) || requestedDeptCode || ''),
    positionTitle: String((position && position.position_title) || requestedTitle || '')
  };
}

function syncUsersWithAuthoritativeOrg(){
  if(!Array.isArray(USERS) || !USERS.length) return;
  const employeesByEmployeeId = {};
  (ADMIN_AUTH_STATE.org.employees || []).forEach(employee=>{
    const employeeId = String(employee.employee_id || '');
    if(employeeId) employeesByEmployeeId[employeeId] = employee;
  });
  USERS = USERS.map(user=>{
    const employee = employeesByEmployeeId[String(user.employee_id || '')] || null;
    const resolved = resolveAuthoritativeUserAssignment({
      dept: user.dept,
      title: user.title,
      hcm_org_unit_id: String(user.hcm_org_unit_id || (employee && employee.hcm_org_unit_id) || ''),
      hcm_position_id: String(user.hcm_position_id || (employee && employee.hcm_position_id) || '')
    });
    if(!resolved.orgUnitId && !resolved.positionId) return user;
    const next = Object.assign({}, user, {
      hcm_org_unit_id: resolved.orgUnitId,
      hcm_position_id: resolved.positionId
    });
    if(resolved.deptCode) next.dept = resolved.deptCode;
    if(resolved.positionTitle) next.title = resolved.positionTitle;
    return next;
  });
}

function rolesForAdminGrid(){
  const seen = new Set();
  const list = [];
  (ADMIN_AUTH_STATE.roles.items || []).forEach(row=>{
    const code = String((row && row.role_code) || '').trim();
    if(!code || seen.has(code)) return;
    seen.add(code);
    list.push(row);
  });
  return list.sort((a,b)=>{
    const aUi = roleRecordUi(a.role_code, a);
    const bUi = roleRecordUi(b.role_code, b);
    if(aUi.level !== bUi.level) return aUi.level - bUi.level;
    return String(a.role_code||'').localeCompare(String(b.role_code||''));
  });
}

function userModalRoleRows(){
  const runtimeRows = rolesForAdminGrid().filter(row => row && row.is_active !== false);
  return runtimeRows.length ? runtimeRows : legacyRolesForAdminGrid();
}

function normalizeRoleMatchText(value){
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[\/_.-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function roleCodeExistsInUserCatalog(roleCode){
  const target = String(roleCode || '').trim();
  if(!target) return false;
  return userModalRoleRows().some(row => String(row.role_code || '').trim() === target);
}

function roleCodeForUserTitle(title, deptCode='', position=null){
  const metadata = safeJsonObject(position && position.metadata);
  const metadataRole = String(metadata.role_code || metadata.default_role_code || metadata.role || '').trim();
  if(metadataRole && roleCodeExistsInUserCatalog(metadataRole)) return metadataRole;

  const target = normalizeRoleMatchText(title);
  if(!target) return '';
  const dept = String(deptCode || '').trim().toUpperCase();
  const rows = userModalRoleRows();
  const ranked = rows.slice().sort((a,b)=>{
    const aDept = String(a.dept_code || roleRecordUi(a.role_code, a).dept || '').trim().toUpperCase();
    const bDept = String(b.dept_code || roleRecordUi(b.role_code, b).dept || '').trim().toUpperCase();
    const aScoped = dept && aDept === dept ? 0 : 1;
    const bScoped = dept && bDept === dept ? 0 : 1;
    if(aScoped !== bScoped) return aScoped - bScoped;
    return String(a.role_code || '').localeCompare(String(b.role_code || ''));
  });

  for(const row of ranked){
    const code = String(row.role_code || '').trim();
    if(!code) continue;
    const ui = roleRecordUi(code, row);
    const candidates = [
      row.role_label,
      row.role_label_vi,
      ui.label,
      ui.labelEn,
      code
    ].map(normalizeRoleMatchText).filter(Boolean);
    if(candidates.includes(target)) return code;
  }
  return '';
}

function userRoleOptionHtml(selectedRole=''){
  const rows = userModalRoleRows();
  return rows.map(row => {
    const code = String(row.role_code || '').trim();
    if(!code) return '';
    const ui = roleRecordUi(code, row);
    const label = lang === 'en' ? (ui.labelEn || ui.label || code) : (ui.label || ui.labelEn || code);
    const icon = ui.icon || '';
    return `<option value="${escapeHtml(code)}" ${String(selectedRole)===code?'selected':''}>${escapeHtml((icon ? icon + ' ' : '') + label)}</option>`;
  }).join('');
}

async function loadAuthoritativeOrgCatalog(options={}){
  if(ADMIN_AUTH_STATE.org.loading) return;
  const force = !!options.force;
  if((ADMIN_AUTH_STATE.org.loaded || ADMIN_AUTH_STATE.org.error) && !force) return;
  ADMIN_AUTH_STATE.org.loading = true;
  ADMIN_AUTH_STATE.org.error = '';
  try{
    const [orgUnitsRes, positionsRes, employeesRes] = await Promise.all([
      runtimeList('hcm_workforce', 'hcm_org_units', {limit:500, direction:'asc', sort:'org_unit_code'}, {timeoutMs:9000}),
      runtimeList('hcm_workforce', 'hcm_positions', {limit:500, direction:'asc', sort:'position_code'}, {timeoutMs:9000}),
      runtimeList('hcm_workforce', 'hcm_employees', {limit:500, direction:'asc', sort:'employee_id'}, {timeoutMs:9000})
    ]);
    if(!(orgUnitsRes && orgUnitsRes.ok && Array.isArray(orgUnitsRes.records))) throw new Error(runtimeErrorMessage(orgUnitsRes, 'org_units_load_failed'));
    if(!(positionsRes && positionsRes.ok && Array.isArray(positionsRes.records))) throw new Error(runtimeErrorMessage(positionsRes, 'positions_load_failed'));
    if(!(employeesRes && employeesRes.ok && Array.isArray(employeesRes.records))) throw new Error(runtimeErrorMessage(employeesRes, 'employees_load_failed'));
    ADMIN_AUTH_STATE.org.orgUnits = orgUnitsRes.records;
    ADMIN_AUTH_STATE.org.positions = positionsRes.records;
    ADMIN_AUTH_STATE.org.employees = employeesRes.records;
    ADMIN_AUTH_STATE.org.loaded = true;
    ADMIN_AUTH_STATE.org.lastLoadedAt = Date.now();
    hydrateAuthoritativeOrgProjection();
  }catch(e){
    ADMIN_AUTH_STATE.org.error = (e && e.message) ? e.message : 'org_catalog_load_failed';
  }finally{
    ADMIN_AUTH_STATE.org.loading = false;
    if(currentPage === 'admin' && ['users','dept_title','orgchart'].includes(adminTab)) renderAdmin();
  }
}

async function loadAuthoritativeRoleCatalog(options={}){
  if(ADMIN_AUTH_STATE.roles.loading) return;
  const force = !!options.force;
  if((ADMIN_AUTH_STATE.roles.loaded || ADMIN_AUTH_STATE.roles.error) && !force) return;
  ADMIN_AUTH_STATE.roles.loading = true;
  ADMIN_AUTH_STATE.roles.error = '';
  try{
    const res = await runtimeList('core_system', 'roles', {limit:500, direction:'asc', sort:'role_code'}, {timeoutMs:9000});
    if(!(res && res.ok && Array.isArray(res.records))) throw new Error(runtimeErrorMessage(res, 'roles_load_failed'));
    ADMIN_AUTH_STATE.roles.items = res.records;
    ADMIN_AUTH_STATE.roles.loaded = true;
    ADMIN_AUTH_STATE.roles.lastLoadedAt = Date.now();
    hydrateAuthoritativeRoleProjection();
  }catch(e){
    ADMIN_AUTH_STATE.roles.error = (e && e.message) ? e.message : 'roles_load_failed';
  }finally{
    ADMIN_AUTH_STATE.roles.loading = false;
    if(currentPage === 'admin' && ['roles','users','activity'].includes(adminTab)) renderAdmin();
  }
}

async function loadAuthoritativeAuditTrail(options={}){
  if(ADMIN_AUTH_STATE.audit.loading) return;
  const force = !!options.force;
  if((ADMIN_AUTH_STATE.audit.loaded || ADMIN_AUTH_STATE.audit.error) && !force) return;
  ADMIN_AUTH_STATE.audit.loading = true;
  ADMIN_AUTH_STATE.audit.error = '';
  try{
    const res = await apiCall('admin_audit_trail_list', {limit:500}, 'GET', 9000);
    if(!(res && res.ok && Array.isArray(res.events))) throw new Error(runtimeErrorMessage(res, 'audit_trail_load_failed'));
    ADMIN_AUTH_STATE.audit.events = res.events;
    ADMIN_AUTH_STATE.audit.loaded = true;
    ADMIN_AUTH_STATE.audit.lastLoadedAt = Date.now();
  }catch(e){
    ADMIN_AUTH_STATE.audit.error = (e && e.message) ? e.message : 'audit_trail_load_failed';
  }finally{
    ADMIN_AUTH_STATE.audit.loading = false;
    if(currentPage === 'admin' && canUserAccessAdminTab('activity')) renderAdmin();
  }
}

function authoritativeLoadSummaryHtml(kind){
  const state = ADMIN_AUTH_STATE[kind];
  if(!state) return '';
  if(state.error){
    return '<div class="hm-empty">⚠ ' + escapeHtml(state.error) + '</div>';
  }
  if(state.loading || !state.loaded) return '<div class="hm-empty">'+(lang==='en'?'Loading authoritative data...':'Đang tải dữ liệu authoritative...')+'</div>';
  return '';
}

function legacyRolesForAdminGrid(){
  return Object.keys(ROLES || {}).map(code => {
    const ui = ROLES[code] || {};
    return {
      role_code: code,
      role_id: '',
      role_label: ui.labelEn || ui.label || code,
      role_label_vi: ui.label || ui.labelEn || code,
      dept_code: ui.dept || '',
      description: ui.description || '',
      is_active: true,
      permissions: {
        level: Number(ui.level || 5),
        approve: !!ui.approve,
        canEditDocs: !!ui.canEditDocs,
        canCreateDocs: !!ui.canCreateDocs,
        canViewActivity: !!ui.canViewActivity,
        canExportUsers: !!ui.canExportUsers,
        icon: ui.icon || '👤',
        color: ui.color || defaultDepartmentColor(ui.dept || code)
      }
    };
  }).sort((a,b)=>{
    const aUi = roleRecordUi(a.role_code, a);
    const bUi = roleRecordUi(b.role_code, b);
    if(aUi.level !== bUi.level) return aUi.level - bUi.level;
    return String(a.role_code || '').localeCompare(String(b.role_code || ''));
  });
}

function legacyOrgCatalogSnapshot(){
  const units = (DEPARTMENTS || []).map(dept => ({
    hcm_org_unit_id: String(dept.orgUnitId || dept.code || ''),
    org_unit_code: String(dept.code || ''),
    org_unit_name: String(dept.label || dept.labelEn || dept.code || ''),
    org_unit_type: String(dept.orgUnitType || 'department'),
    parent_org_unit_id: String(dept.parentOrgUnitId || ''),
    manager_employee_id: String(dept.managerEmployeeId || ''),
    cost_center: String(dept.costCenter || ''),
    status: String(dept.status || 'active'),
    metadata: {label_en: String(dept.labelEn || dept.label || ''), color: String(dept.color || defaultDepartmentColor(dept.code))}
  })).filter(unit => unit.org_unit_code);
  const positions = [];
  units.forEach(unit => {
    const deptCode = String(unit.org_unit_code || '');
    const titles = Array.isArray(DEPT_TITLES && DEPT_TITLES[deptCode]) ? DEPT_TITLES[deptCode] : [];
    titles.forEach((title, idx) => {
      const safeTitle = String(title || '').trim();
      if(!safeTitle) return;
      positions.push({
        hcm_position_id: `${deptCode}::${idx}::${safeTitle}`.replace(/\s+/g, '_'),
        position_code: `${deptCode}-${String(idx + 1).padStart(2, '0')}`,
        position_title: safeTitle,
        hcm_org_unit_id: unit.hcm_org_unit_id,
        reports_to_position_id: '',
        required_headcount: 1,
        employment_type: 'full_time',
        status: 'active'
      });
    });
  });
  return {orgUnits: units, positions, employees: []};
}

function legacyAuditEventsForAdmin(){
  return (ACTIVITY_LOG || []).map(session => ({
    recorded_at: String(session.last_activity || session.login_time || ''),
    actor_name: String(session.name || session.user || 'user'),
    event_type: 'portal_session',
    aggregate_type: 'browser_session',
    aggregate_id: String(session.login_time || session.user || ''),
    ip_address: String(session.ip || '—'),
    payload: session
  })).sort((a,b)=>String(b.recorded_at || '').localeCompare(String(a.recorded_at || '')));
}

async function upsertAuthoritativeRole(roleCode, patch={}){
  const row = ADMIN_AUTH_STATE.roles.byCode[roleCode];
  if(!row || !row.role_id){
    showToast('⚠ ' + (lang==='en' ? 'Role not found in authoritative catalog' : 'Không tìm thấy vai trò trong catalog authoritative'), 'error');
    return null;
  }
  const ui = roleRecordUi(roleCode, row);
  const permissions = Object.assign({}, safeJsonObject(row.permissions), {
    level: Number.isFinite(Number(patch.level)) ? Number(patch.level) : ui.level,
    approve: typeof patch.approve === 'boolean' ? patch.approve : ui.approve,
    canEditDocs: typeof patch.canEditDocs === 'boolean' ? patch.canEditDocs : ui.canEditDocs,
    canCreateDocs: typeof patch.canCreateDocs === 'boolean' ? patch.canCreateDocs : ui.canCreateDocs,
    canViewActivity: typeof patch.canViewActivity === 'boolean' ? patch.canViewActivity : ui.canViewActivity,
    canExportUsers: typeof patch.canExportUsers === 'boolean' ? patch.canExportUsers : ui.canExportUsers,
    icon: String(patch.icon || ui.icon || '👤'),
    color: String(patch.color || ui.color || defaultDepartmentColor(patch.dept_code || row.dept_code || roleCode))
  });
  const payload = {
    role_label: String(patch.role_label || row.role_label || ui.labelEn || roleCode),
    role_label_vi: String(patch.role_label_vi || row.role_label_vi || ui.label || row.role_label || roleCode),
    dept_code: String((Object.prototype.hasOwnProperty.call(patch, 'dept_code') ? patch.dept_code : row.dept_code) || ''),
    description: String((Object.prototype.hasOwnProperty.call(patch, 'description') ? patch.description : row.description) || ''),
    is_active: Object.prototype.hasOwnProperty.call(patch, 'is_active') ? !!patch.is_active : (row.is_active !== false),
    permissions
  };
  const res = await runtimeUpdate('core_system', 'roles', row.role_id, payload, row.row_version || null);
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en' ? 'Role save failed' : 'Lưu vai trò thất bại'), 'error');
    return null;
  }
  if(Object.prototype.hasOwnProperty.call(patch, 'canCreateDocs')){
    if(ROLES[roleCode]) ROLES[roleCode].canCreateDocs = !!payload.permissions.canCreateDocs;
    const rolePermRes = await saveRolePermsToServer();
    if(!(rolePermRes && rolePermRes.ok)){
      showToast('⚠ ' + runtimeErrorMessage(rolePermRes, lang==='en' ? 'Role permission sync failed' : 'Đồng bộ quyền tạo tài liệu thất bại'), 'error');
    }
  }
  await loadAuthoritativeRoleCatalog({force:true});
  return res.record;
}

function showLoginError(msg){
  const el = document.getElementById('login-error');
  var text = msg || T('login_error');
  if(typeof fixMojibakeText === 'function') text = fixMojibakeText(text);
  el.textContent = text;
  el.style.display = 'block';
}

function clearLoginError(){
  const el = document.getElementById('login-error');
  el.style.display = 'none';
}

function setLoginStage(stage, msg='', pendingExpiresIn=null){
  loginStage = stage;
  clearLoginError();
  schedulePendingAuthTimer(stage, pendingExpiresIn);

  const pass = document.getElementById('inp-pin');
  const user = document.getElementById('inp-user');
  const mfa = document.getElementById('mfa-section');
  const enroll = document.getElementById('enroll-section');
  const rec = document.getElementById('recovery-section');
  const btn = document.getElementById('btn-login');
  const stageMsg = document.getElementById('login-stage-msg');

  if(stageMsg){
    stageMsg.textContent = msg || '';
    stageMsg.style.display = msg ? 'block' : 'none';
  }

  if(stage === 'password'){
    user.disabled = false;
    pass.disabled = false;
    if(mfa) mfa.style.display = 'none';
    if(enroll) enroll.style.display = 'none';
    if(rec) rec.style.display = 'none';
    const toggle = document.getElementById('recovery-toggle');
    if(toggle) toggle.style.display = 'none';
    if(btn) btn.textContent = T('login_btn');
    pass.value = '';
    const otp = document.getElementById('inp-otp'); if(otp) otp.value='';
    const r = document.getElementById('inp-recovery'); if(r) r.value='';
    return;
  }

  // MFA / ENROLL stages
  user.disabled = true;
  pass.disabled = true;
  if(mfa) mfa.style.display = 'block';

  const toggle = document.getElementById('recovery-toggle');
  if(toggle) toggle.style.display = (stage === 'mfa') ? 'block' : 'none';
  if(rec) rec.style.display = 'none';

  if(stage === 'mfa'){
    if(enroll) enroll.style.display = 'none';
    if(btn) btn.textContent = (lang==='en' ? 'Verify' : 'Xác minh');
    document.getElementById('inp-otp')?.focus();
    return;
  }
  if(stage === 'enroll'){
    if(enroll) enroll.style.display = 'block';
    if(btn) btn.textContent = (lang==='en' ? 'Complete' : 'Hoàn tất');
    document.getElementById('inp-otp')?.focus();
    return;
  }
}

function setLoginStageMessage(msg){
  const stageMsg = document.getElementById('login-stage-msg');
  if(stageMsg){
    stageMsg.textContent = msg || '';
    stageMsg.style.display = msg ? 'block' : 'none';
  }
}

function toggleRecovery(show){
  const rec = document.getElementById('recovery-section');
  const toggle = document.getElementById('recovery-toggle');
  if(rec) rec.style.display = show ? 'block' : 'none';
  if(toggle) toggle.style.display = show ? 'none' : 'block';
  if(show) document.getElementById('inp-recovery')?.focus();
}

function initLogin(){
  getNextParam();

  // Hide demo section to avoid leaking account directory on the login screen
  const ds = document.querySelector('.demo-section');
  if(ds) ds.style.display = 'none';

  document.getElementById('inp-user').addEventListener('keydown',e=>{
    if(e.key==='Enter') document.getElementById('inp-pin').focus();
  });
  document.getElementById('inp-pin').addEventListener('keydown',e=>{
    if(e.key==='Enter') doLogin();
  });
  const otp = document.getElementById('inp-otp');
  if(otp) otp.addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });
  const rc = document.getElementById('inp-recovery');
  if(rc) rc.addEventListener('keydown',e=>{ if(e.key==='Enter') doLogin(); });

  setLoginStage('password');
  try{ if(typeof fixMojibakeDom==='function') fixMojibakeDom(document.getElementById('login-screen')); }catch(e){}
}

function fillLogin(username){
  document.getElementById('inp-user').value = username;
  document.getElementById('inp-pin').value = '';
  document.getElementById('inp-user').style.borderColor = '#1565c0';
  document.getElementById('inp-pin').focus();
}

async function onLoggedIn(res){
  _syncCsrf(res.csrf_token || csrfToken);
  syncCurrentUserRef(res.user || currentUser);
  if(currentUser && currentUser.portal_language) try{ setLang(currentUser.portal_language); }catch(e){}

  if(!currentUser){
    // fallback: check status
    try{
      const s = await apiCall('status', null, 'GET');
      if(s.logged_in){ syncCurrentUserRef(s.user); _syncCsrf(s.csrf_token || csrfToken); }
    }catch(e){}
  }
  // V10 Role migration: map old role keys to new JD-based keys
  if(currentUser && currentUser.role && !(currentUser.role in ROLES)){
    const _RM={general_director:'ceo',deputy_director:'production_director',prod_manager:'cnc_workshop_manager',prod_supervisor:'shift_leader',cnc_setup:'setup_technician',cnc_programmer:'cam_nc_programmer',qms_supervisor:'qms_engineer',doc_controller:'qms_engineer',purchasing_officer:'buyer',procurement_manager:'supply_chain_manager',sales_officer:'estimator',planning_officer:'production_planner',hse_officer:'ehs_specialist',maintenance_tech:'maintenance_technician',finance_officer:'gl_payroll_accountant',finance_manager:'finance_manager',warehouse_staff:'warehouse_clerk',warehouse_lead:'supply_chain_manager',deburr_tech:'deburr_technician',tooling_tech:'tool_storekeeper',clean_tech:'cleaning_packaging_technician',production_engineer:'process_engineer',dfm_engineer:'process_engineer',metrology_specialist:'qc_inspector',receiving_clerk:'warehouse_clerk',storekeeper:'warehouse_clerk',shipping_packing:'logistics_coordinator',trainee:'cnc_operator'};
    if(_RM[currentUser.role]) currentUser.role = _RM[currentUser.role];
  }
  if(!currentUser){
    showLoginError(lang==='en' ? 'Login failed' : 'Đăng nhập thất bại');
    return;
  }

  // If gate redirected user to login, send back to the requested file
  if(nextAfterLogin){
    const dest = '/' + nextAfterLogin.replace(/^\/+/, '');
    nextAfterLogin = null;
    window.location.href = dest;
    return;
  }

  // Load data collection settings
  await loadDataSettings();

  // Consent dialog (if enabled)
  if(DATA_SETTINGS.require_consent){
    const accepted = await showConsentDialog();
    if(!accepted){
      showToast(lang==='en'?'Access denied — consent required':'Truy cập bị từ chối — cần đồng ý điều khoản');
      syncCurrentUserRef(null); _syncCsrf(null);
      try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}
      setLoginStage('password');
      return;
    }
  }

  // Geolocation (if enabled)
  let geo = {ok:true, lat:null, lng:null, accuracy:null};
  if(DATA_SETTINGS.collect_gps){
    showToast(lang==='en'?'📍 Verifying location…':'📍 Đang xác minh vị trí…');
    geo = await requireGeolocation();
    if(!geo.ok){
      const reasons = {
        denied: lang==='en'?'Location access was denied.':'Quyền truy cập vị trí bị từ chối.',
        unavailable: lang==='en'?'Location unavailable. Enable GPS.':'Không xác định được vị trí. Bật GPS.',
        timeout: lang==='en'?'Location request timed out.':'Yêu cầu vị trí quá thời gian.',
        not_supported: lang==='en'?'Browser does not support geolocation.':'Trình duyệt không hỗ trợ định vị.'
      };
      alert('⚠ ' + (reasons[geo.reason] || reasons.denied) + '\n\n' + (lang==='en'?'Session will be terminated.':'Phiên sẽ kết thúc.'));
      syncCurrentUserRef(null); _syncCsrf(null);
      try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}
      setLoginStage('password');
      return;
    }
  }

  // Start activity tracking
  startActivityTracking(geo);

  showApp();
}

function setLoginChecking(isChecking, msg){
  if(loginSubmitInFlight) return;
  setLoginStageMessage(isChecking ? (msg || '') : '');
}

function setLoginSubmitting(isSubmitting, msg){
  const btn = document.getElementById('btn-login');
  if(btn) btn.disabled = !!isSubmitting;
  if(typeof msg === 'string'){
    setLoginStageMessage(msg);
  }
}

function showRecoveryCodes(codes){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'recovery-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">✅ Đã bật 2FA — Mã dự phòng</div>
        <button class="btn-admin secondary" onclick="document.getElementById('recovery-modal')?.remove()">✕ Đóng</button>
      </div>
      <div style="font-size:13px;color:var(--text-3);margin-bottom:10px">
        Lưu các mã này ở nơi an toàn. Mỗi mã chỉ dùng được 1 lần khi bạn mất Authenticator.
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${codes.map(c=>`<code style="padding:8px;border:1px solid var(--border);border-radius:8px;background:#fafafa;text-align:center">${c}</code>`).join('')}
      </div>
    </div>`;
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ACCESS CONTROL
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// JD DEPARTMENT HELPERS
// ═══════════════════════════════════════════════════
// ═══════════════════════════════════════════════════
// DYNAMIC SUBFOLDER HELPERS — derive from actual path
// (replaces old static DEPT_MAP/ORDER blocks)
// ═══════════════════════════════════════════════════

// Extract department/subfolder code from document path
// e.g., "05-Processes/01-PROC-CNC/proc-cnc-001.html" → "PROC-CNC"
// e.g., "mom/docs/training/02-Course-Modules/C01.html" → "Modules"
function getDocDeptFromPath(doc){
  const sub = getDocSubfolder(doc);
  if(!sub) return null;
  return getSubfolderLabel(sub);
}

// Backward-compatible wrappers
function getJDDeptCode(doc){ return getDocDeptFromPath(doc); }
function getFormDeptCode(doc){ return getDocDeptFromPath(doc); }
function getProcDeptCode(doc){ return getDocDeptFromPath(doc); }
function getAnnexDeptCode(doc){ return getDocDeptFromPath(doc); }

// JD access: map subfolder to user dept codes
const JD_SUBFOLDER_DEPT_MAP = {
  // After getSubfolderLabel strips "01-" prefix → "JD-Executive"
  'JD-Executive':['EXE','BOD'],
  'JD-Production':['PRO','CNC'],
  'JD-Engineering':['ENG'],
  'JD-Quality':['QA','QC'],
  'JD-Supply-Chain':['SCM','PUR','WHS'],
  'JD-Sales':['SAL'],
  'JD-Finance':['FIN'],
  'JD-HR':['HR'],
  'JD-EHS':['EHS','HSE'],
  'JD-IT':['IT'],
  // Legacy (in case old folder names exist)
  'JD-EXE':['EXE','BOD'],
  'JD-PRO':['PRO','CNC'],
  'JD-ENG':['ENG'],
  'JD-QA':['QA','QC'],
  'JD-PUR':['PUR','SCM'],
  'JD-SAL':['SAL'],
  'JD-WHS':['WHS','SCM'],
  'JD-MNT':['MNT','PRO'],
  'JD-PLA':['PLA','PRO'],
  'JD-FIN':['FIN'],
  'JD-HSE':['HSE','EHS'],
};

// Check if user can access JD based on department (dynamic from subfolder path)
function canAccessJD(doc){
  if(!currentUser) return false;
  const role=currentUser.role;
  if(ROLE_DOCS[role]==='ALL') return true;
  if(role==='hr_manager') return true;
  const sub = getSubfolderLabel(getDocSubfolder(doc)||'');
  if(!sub) return false;
  const uDept=(currentUser.dept||'').toUpperCase();
  if(uDept==='EXE'||uDept==='BOD') return true;
  // Check JD_SUBFOLDER_DEPT_MAP
  const allowed = JD_SUBFOLDER_DEPT_MAP[sub];
  if(allowed && allowed.includes(uDept)) return true;
  // Fallback: extract dept code from subfolder name (JD-ENG → ENG, JD-Quality → QA)
  const m = sub.match(/^JD-([A-Za-z-]+)$/);
  if(m){
    const subDept = m[1].toUpperCase();
    if(subDept===uDept) return true;
    // Map full names to dept codes
    const nameMap = {EXECUTIVE:'EXE',PRODUCTION:'PRO',ENGINEERING:'ENG',QUALITY:'QA','SUPPLY-CHAIN':'SCM',SALES:'SAL',FINANCE:'FIN'};
    if(nameMap[subDept]===uDept) return true;
  }
  return false;
}

function canAccessDoc(docCode){
  if(!currentUser) return false;
  // JD documents: department-based access (JD files live under ORG category)
  const doc=DOCS.find(d=>d.code===docCode);
  if(doc && (doc.path||'').includes('Job-Descriptions')) return canAccessJD(doc);
  // Check user-specific overrides first
  const userKey = userPermOverrideKey(currentUser);
  if(userKey && PERM_OVERRIDES[userKey]){
    if(PERM_OVERRIDES[userKey].grant && PERM_OVERRIDES[userKey].grant.includes(docCode)) return true;
    if(PERM_OVERRIDES[userKey].deny && PERM_OVERRIDES[userKey].deny.includes(docCode)) return false;
  }
  const perms = ROLE_DOCS[currentUser.role];
  if(!perms) return false;
  if(perms === "ALL") return true;
  return perms.some(p => (typeof docCodeMatchesPattern==='function' ? docCodeMatchesPattern(docCode,p) : (p.endsWith('*') ? docCode.startsWith(p.slice(0,-1)) : p===docCode)));
}
function canAccess(catDept){
  // Legacy compat: check if ANY doc in this category is accessible
  if(!currentUser) return false;
  const perms = ROLE_DOCS[currentUser.role];
  if(!perms) return false;
  if(perms === "ALL") return true;
  return getVisibleDocs().some(d => {
    const cat = getCatForDoc(d);
    return cat && cat.dept === catDept && canAccessDoc(d.code);
  });
}
function countAccessibleDocs(){
  return getVisibleDocs().filter(d=>canAccessDoc(d.code)).length;
}
function docMatchesRole(docCode, role){
  const perms = ROLE_DOCS[role];
  if(!perms) return false;
  if(perms === "ALL") return true;
  return perms.some(p => (typeof docCodeMatchesPattern==='function' ? docCodeMatchesPattern(docCode,p) : (p.endsWith('*') ? docCode.startsWith(p.slice(0,-1)) : p===docCode)));
}

function getCatForDoc(doc){
  return CATEGORIES.find(c => c.id === doc.cat);
}

// ═══════════════════════════════════════════════════
// RENDER APP
// ═══════════════════════════════════════════════════
// Auth flow hardening override:
// - keep MFA/enroll pending on the login screen only
// - expire pending OTP/enroll sessions cleanly
// - never render an "empty portal" when auth is incomplete
async function doLogin(){
  if(loginSubmitInFlight) return;
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pin').value;
  const otp = (document.getElementById('inp-otp')?.value || '').trim();
  const recovery = (document.getElementById('inp-recovery')?.value || '').trim();
  const startedStage = loginStage;

  if(loginStage === 'password' && (!u || !p)){
    showLoginError(lang==='en' ? 'Please enter username and password' : 'Vui lòng nhập tài khoản và mật khẩu');
    return;
  }
  if(loginStage === 'enroll' && !otp){
    showLoginError(lang==='en' ? 'Enter 6-digit code to confirm' : 'Nhập mã 6 số để xác nhận');
    return;
  }
  if(loginStage === 'mfa' && !otp && !recovery){
    showLoginError(lang==='en' ? 'Enter authenticator code or recovery code' : 'Nhập mã xác thực hoặc mã dự phòng');
    return;
  }

  let keepStageMessage = false;
  loginSubmitInFlight = true;
  clearLoginError();
  setLoginSubmitting(true, lang==='en' ? 'Signing in...' : 'Đang đăng nhập...');
  try{
    if(loginStage === 'password'){
      const res = await apiCall('auth_login', {username:u, password:p});
      if(!res.ok){
        showLoginError(res.error || T('login_error'));
        return;
      }
      if(res.enroll_required){
        enrollInfo = res;
        _syncCsrf(res.csrf_token || csrfToken);
        document.getElementById('enroll-issuer').textContent = res.issuer || '';
        document.getElementById('enroll-username').textContent = res.username || u;
        document.getElementById('enroll-secret').textContent = res.secret || '';
        document.getElementById('enroll-otpauth').textContent = res.otpauth_url || '';
        renderEnrollQR(res.otpauth_url || '');
        keepStageMessage = true;
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số', res.pending_expires_in);
        return;
      }
      if(res.mfa_required){
        _syncCsrf(res.csrf_token || csrfToken);
        keepStageMessage = true;
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator', res.pending_expires_in);
        return;
      }
      if(res.logged_in){
        keepStageMessage = true;
        setLoginStageMessage(lang==='en' ? 'Opening workspace...' : 'Đang mở hệ thống...');
        await onLoggedIn(res);
        return;
      }
      showLoginError(res.error || T('login_error'));
      return;
    }

    if(loginStage === 'enroll'){
      setLoginStageMessage(lang==='en' ? 'Verifying authenticator...' : 'Đang xác minh Authenticator...');
      const res = await apiCall('auth_enroll_verify', {code: otp});
      if(!res.ok){
        if(res.error === 'unauthorized' || res.error === 'enroll_expired'){
          resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Authenticator setup timed out. Please sign in again.' : 'Phiên thiết lập Authenticator đã hết hạn. Vui lòng đăng nhập lại.'});
        } else {
          showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mã'));
        }
        return;
      }
      if(res.recovery_codes && Array.isArray(res.recovery_codes)){
        showRecoveryCodes(res.recovery_codes);
      }
      keepStageMessage = true;
      setLoginStageMessage(lang==='en' ? 'Opening workspace...' : 'Đang mở hệ thống...');
      await onLoggedIn(res);
      return;
    }

    if(loginStage === 'mfa'){
      setLoginStageMessage(lang==='en' ? 'Verifying code...' : 'Đang xác minh mã...');
      const res = await apiCall('auth_mfa_verify', {username:u, password:p, code: otp, recovery: recovery});
      if(!res.ok){
        if(res.error === 'mfa_expired' || res.error === 'unauthorized'){
          resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Authenticator verification timed out. Please sign in again.' : 'Phiên xác thực OTP đã hết hạn. Vui lòng đăng nhập lại.'});
        } else {
          showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mã'));
        }
        return;
      }
      keepStageMessage = true;
      setLoginStageMessage(lang==='en' ? 'Opening workspace...' : 'Đang mở hệ thống...');
      await onLoggedIn(res);
      return;
    }
  }catch(err){
    console.error(err);
    showLoginError(lang==='en' ? 'Cannot connect to server. Please try again.' : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }finally{
    loginSubmitInFlight = false;
    setLoginSubmitting(false, keepStageMessage ? null : '');
    if(startedStage !== loginStage && (loginStage === 'mfa' || loginStage === 'enroll')){
      const pass = document.getElementById('inp-pin');
      if(pass) pass.disabled = true;
    }
  }
}

async function doLogout(){
  clearPendingAuthTimer();
  try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}

  _syncCsrf(null);
  syncCurrentUserRef(null);
  try{ if(typeof stopLiveDocsSync==='function') stopLiveDocsSync(); }catch(e){}

  document.getElementById('app').classList.remove('active');
  document.getElementById('login-screen').style.display = 'flex';
  document.getElementById('inp-user').disabled = false;
  document.getElementById('inp-pin').disabled = false;
  document.getElementById('inp-user').value = '';
  document.getElementById('inp-pin').value = '';
  const otp = document.getElementById('inp-otp'); if(otp) otp.value='';
  const r = document.getElementById('inp-recovery'); if(r) r.value='';
  setLoginStage('password');
}

async function checkSession(){
  setLoginChecking(true, lang==='en' ? 'Checking session…' : 'Đang kiểm tra phiên đăng nhập…');

  let lastStatus = null;
  const delays = [0, 500];
  for(let i=0;i<delays.length;i++){
    if(delays[i]) await new Promise(r=>setTimeout(r, delays[i]));
    try{
      const s = await apiCall('status', null, 'GET', 2500);
      lastStatus = s;
      if(s && s.logged_in){
        clearPendingAuthTimer();
        _syncCsrf(s.csrf_token || null);
        syncCurrentUserRef(s.user);
        if(s.user && s.user.portal_language) try{ setLang(s.user.portal_language); }catch(e){}
        setLoginChecking(false, '');
        await loadDataSettings().catch(()=>{});
        const geo = DATA_SETTINGS.collect_gps
          ? await requireGeolocation().catch(()=>({ok:false}))
          : {ok:true, lat:null, lng:null, accuracy:null};
        startActivityTracking(geo);
        showApp();
        return;
      }
      if(s && s.enroll_pending){
        _syncCsrf(s.csrf_token || null);
        enrollInfo = s;
        document.getElementById('enroll-issuer').textContent = s.issuer || '';
        document.getElementById('enroll-username').textContent = s.username || '';
        document.getElementById('enroll-secret').textContent = s.secret || '';
        document.getElementById('enroll-otpauth').textContent = s.otpauth_url || '';
        renderEnrollQR(s.otpauth_url || '');
        setLoginChecking(false, '');
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số', s.pending_expires_in);
        return;
      }
      if(s && s.mfa_pending){
        _syncCsrf(s.csrf_token || null);
        setLoginChecking(false, '');
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator', s.pending_expires_in);
        return;
      }
      break;
    }catch(e){
      // retry
    }
  }

  setLoginChecking(false, '');
  if(lastStatus && lastStatus.auth_expired){
    resetPortalToLogin({stage:'password', errorMsg:getPendingAuthExpiredMessage(lastStatus.auth_expired)});
    return;
  }
  if(document.getElementById('app')?.classList.contains('active')){
    resetPortalToLogin({stage:'password'});
  }
}

async function showApp(){
  if(!currentUser){
    resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Login session is no longer valid.' : 'Phiên đăng nhập không còn hợp lệ.'});
    return;
  }

  clearPendingAuthTimer();
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  const r = ROLES[currentUser.role] || {label: currentUser.title||currentUser.role, labelEn: currentUser.title||currentUser.role};
  document.getElementById('hdr-name').textContent = currentUser.name;
  document.getElementById('hdr-title').textContent = (lang==='en' ? (r.labelEn||r.label||currentUser.title||'') : (r.label||currentUser.title||''));
  document.getElementById('dd-name').textContent = currentUser.name;
  document.getElementById('dd-title').textContent = (lang==='en'?(r.labelEn||currentUser.title):currentUser.title) + ' · ' + currentUser.dept;
  document.getElementById('dd-access').textContent = lang==='en'?(r.labelEn||r.label):r.label;

  const docsLoaded = await loadDocsFromServer();
  if(!docsLoaded){
    let status = null;
    try{ status = await apiCall('status', null, 'GET', 8000); }catch(e){}
    if(!(status && status.logged_in)){
      if(status && status.enroll_pending){
        _syncCsrf(status.csrf_token || null);
        enrollInfo = status;
        document.getElementById('enroll-issuer').textContent = status.issuer || '';
        document.getElementById('enroll-username').textContent = status.username || '';
        document.getElementById('enroll-secret').textContent = status.secret || '';
        document.getElementById('enroll-otpauth').textContent = status.otpauth_url || '';
        renderEnrollQR(status.otpauth_url || '');
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số', status.pending_expires_in);
        return;
      }
      if(status && status.mfa_pending){
        _syncCsrf(status.csrf_token || null);
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator', status.pending_expires_in);
        return;
      }
      resetPortalToLogin({
        stage:'password',
        errorMsg: status && status.auth_expired
          ? getPendingAuthExpiredMessage(status.auth_expired)
          : (lang==='en' ? 'Login session is no longer valid. Please sign in again.' : 'Phiên đăng nhập không còn hợp lệ. Vui lòng đăng nhập lại.')
      });
      return;
    }
    showToast(lang==='en' ? 'Document index is temporarily unavailable.' : 'Danh mục tài liệu tạm thời chưa tải được.');
  }

  await loadFolderDescriptions();
  await loadRolePermsFromServer();
  await loadModuleAccessConfigFromServer({silent:true});
  await loadCustomDocsFromServer();
  await loadDocVisibilityFromServer();
  await loadUserDocOverridesFromServer({silent:true});
  await refreshAllDocStatesFromServer();

  renderSidebar();
  syncSidebarToggleState();
  await restorePortalViewAfterBoot();
  loadUsersFromServerIfAdmin();
  try{ if(typeof startLiveDocsSync==='function') startLiveDocsSync(); }catch(e){}
}

function portalNavButtonHtml(page, icon, label, options={}){
  const active = !!options.active;
  const badge = options.badge ? `<span class="badge">${options.badge}</span>` : '';
  const extraAttrs = options.extraAttrs ? ` ${options.extraAttrs}` : '';
  return `<button class="nav-item ${active?'active':''}" onclick="navigateTo('${page}')"${extraAttrs}><span class="icon">${icon}</span><span>${label}</span>${badge}</button>`;
}

function portalNavSectionHtml(title, buttons){
  return Array.isArray(buttons) && buttons.length
    ? `<div class="nav-section"><div class="nav-section-title">${title}</div>${buttons.join('')}</div>`
    : '';
}

function renderSidebar(){
  const nav = document.getElementById('sidebar-nav');
  const VDOCS = getVisibleDocs();

  const SIDEBAR_SECTIONS = portalSidebarSections();
  const coreButtons = [];

  if(isPortalSidebarCoreVisible('dashboard') && canUserAccessModule('dashboard')){
    coreButtons.push(portalNavButtonHtml('dashboard', '🏠', T('dashboard'), {active: currentPage==='dashboard'}));
  }
  if(isPortalSidebarCoreVisible('documents') && canUserAccessModule('documents')){
    coreButtons.push(portalNavButtonHtml('documents', '📁', T('all_docs'), {active: currentPage==='documents', badge: VDOCS.length}));
  }
  if(isPortalSidebarCoreVisible('search') && canUserAccessModule('search')){
    coreButtons.push(portalNavButtonHtml('search', '🔍', T('search'), {active: currentPage==='search'}));
  }
  if(isPortalSidebarCoreVisible('dictionary') && canUserAccessModule('dictionary')){
    coreButtons.push(portalNavButtonHtml('dictionary', '📖', T('dictionary'), {active: currentPage==='dictionary', badge: dictData ? dictData.length.toLocaleString() : '...'}));
  }

  let html = coreButtons.length ? `<div class="nav-section">${coreButtons.join('')}</div>` : '';

  if(isPortalSidebarCoreVisible('deploy')){
    const productionButtons = [];
    if(canUserAccessModule('orders')) productionButtons.push(portalNavButtonHtml('orders', '📦', lang==='en'?'Orders':'Đơn hàng', {active: currentPage==='orders'}));
    if(canUserAccessModule('dispatch')) productionButtons.push(portalNavButtonHtml('dispatch', '📋', lang==='en'?'Production Dispatch':'Phân công sản xuất', {active: currentPage==='dispatch'}));
    if(canUserAccessModule('mes')) productionButtons.push(portalNavButtonHtml('mes', '🏭', lang==='en'?'Shop Floor':'Xưởng sản xuất', {active: currentPage==='mes'}));
    if(canUserAccessModule('mobile-shopfloor')) productionButtons.push(portalNavButtonHtml('mobile-shopfloor', '📱', lang==='en'?'Operator Mobile':'Công nhân di động', {active: currentPage==='mobile-shopfloor'}));
    if(canUserAccessModule('quoting')) productionButtons.push(portalNavButtonHtml('quoting', '💰', lang==='en'?'Quoting':'Báo giá', {active: currentPage==='quoting'}));
    html += portalNavSectionHtml(lang==='en'?'PRODUCTION':'SẢN XUẤT', productionButtons);

    const supplyButtons = [];
    if(canAccessPurchasingWorkspace()){
      supplyButtons.push(portalNavButtonHtml('purchasing', '🧾', lang==='en'?'Purchasing & IQC':'Mua hàng & IQC', {active: currentPage==='purchasing'}));
    }
    html += portalNavSectionHtml(lang==='en'?'SUPPLY CHAIN':'CHUỖI CUNG ỨNG', supplyButtons);

    /* CHẤT LƯỢNG: chỉ còn EQMS Suite — APQP/PPAP đã tích hợp thành module
     * nội bộ bên trong EQMS Shell (group: pre-launch). */
    const qualityButtons = [];
    if(canUserAccessModule('eqms')) qualityButtons.push(portalNavButtonHtml('eqms', '\u{1F3EF}', lang==='en'?'EQMS Suite':'EQMS Suite', {active: currentPage==='eqms'||currentPage==='apqp-ppap'}));
    html += portalNavSectionHtml(lang==='en'?'QUALITY':'CHẤT LƯỢNG', qualityButtons);

    const recordButtons = [];
    if(canUserAccessModule('forms')) recordButtons.push(portalNavButtonHtml('forms', '📋', lang==='en'?'Evidence Control':'Kiểm soát chứng cứ', {active: currentPage==='forms'}));
    /* 'evidence' nav removed — merged into forms module Evidence tab */
    if(canUserAccessModule('compliance-reports')) recordButtons.push(portalNavButtonHtml('compliance-reports', '📊', lang==='en'?'Reports':'Báo cáo', {active: currentPage==='compliance-reports'}));
    if(canUserAccessModule('continuous-improvement')) recordButtons.push(portalNavButtonHtml('continuous-improvement', '🔄', lang==='en'?'Improvement':'Cải tiến liên tục', {active: currentPage==='continuous-improvement'}));
    if(canUserAccessModule('knowledge-base')) recordButtons.push(portalNavButtonHtml('knowledge-base', '💡', lang==='en'?'Knowledge Base':'Kho kiến thức', {active: currentPage==='knowledge-base'}));
    html += portalNavSectionHtml(lang==='en'?'RECORDS & REPORTS':'HỒ SƠ & BÁO CÁO', recordButtons);

    const toolButtons = [];
    if(canUserAccessModule('cnc-programs')) toolButtons.push(portalNavButtonHtml('cnc-programs', '⚙', lang==='en'?'CNC Programs':'Chương trình CNC', {active: currentPage==='cnc-programs'}));
    if(canUserAccessModule('product-passport')) toolButtons.push(portalNavButtonHtml('product-passport', '🔗', lang==='en'?'Product Passport':'Hộ chiếu sản phẩm', {active: currentPage==='product-passport'}));
    if(canUserAccessModule('schema-studio')) toolButtons.push(portalNavButtonHtml('schema-studio', '🗄', lang==='en'?'Schema Studio':'Schema Studio', {active: currentPage==='schema-studio'}));
    if(canUserAccessModule('energy-dashboard')) toolButtons.push(portalNavButtonHtml('energy-dashboard', '⚡', lang==='en'?'Energy':'Năng lượng', {active: currentPage==='energy-dashboard'}));
    if(canUserAccessModule('deploy')) toolButtons.push(portalNavButtonHtml('deploy', '🚀', lang==='en'?'Deploy':'Triển khai', {active: currentPage==='deploy'}));
    if(canUserAccessModule('customer-portal')) toolButtons.push(portalNavButtonHtml('customer-portal', '🌐', lang==='en'?'Customer Portal':'Cổng khách hàng', {active: currentPage==='customer-portal'}));
    html += portalNavSectionHtml(lang==='en'?'TOOLS':'CÔNG CỤ', toolButtons);

    if(canUserAccessModule('module-builder')){
      html += `<div class="nav-section" style="padding:0 8px"><button class="nav-item" onclick="navigateTo('module-builder')" style="border:1px dashed rgba(255,255,255,0.3);justify-content:center;opacity:0.7"><span class="icon">➕</span><span>${lang==='en'?'Create Module':'Tạo Module mới'}</span></button></div>`;
    }
  }
  if(isPortalSidebarCoreVisible('admin') && canUserAccessModule('admin')){
    html += `<div class="nav-section"><div class="nav-section-title">ADMIN</div><button class="nav-item ${currentPage==='admin'?'active':''}" onclick="navigateTo('admin')"><span class="icon">⚙</span><span>${T('admin_panel')}</span></button></div>`;
  }

  if(canUserAccessModule('template-demo')){
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'TEMPLATE LAB':'TEMPLATE LAB'}</div>
      <button class="nav-item ${currentPage==='template-demo'?'active':''}" onclick="navigateTo('template-demo')"><span class="icon">🧩</span><span>${lang==='en'?'Master Module Template':'Master Module Template'}</span></button>
    </div>`;
  }

  SIDEBAR_SECTIONS.forEach(sec => {
    if(!isPortalSidebarSectionVisible(sec.id)) return;
    const catsInSec = CATEGORIES.filter(c => !c.hidden && isPortalSidebarCategoryVisible(c.id) && c.section === sec.id && (VDOCS.some(d => d.cat === c.id) || portalCategoryHasPhysicalTree(c.id)));
    if(catsInSec.length === 0) return;
    html += `<div class="nav-section"><div class="nav-section-title">${sec.label}</div>`;
    catsInSec.forEach(cat => {
      let cnt = VDOCS.filter(d=>d.cat===cat.id).length;
      const physicalCount = getPortalCategoryPhysicalNodeCount(cat.id);
      if(cnt === 0 && physicalCount > 0) cnt = physicalCount;
      const visibleDocsInCat = VDOCS.filter(d=>d.cat===cat.id);
      const locked = visibleDocsInCat.length > 0 && !visibleDocsInCat.some(d=>canAccessDoc(d.code));
      html += `<button class="nav-item ${currentFilter===cat.id&&currentPage==='documents'?'active':''}" onclick="navigateTo('documents','${cat.id}')">
        <span class="icon">${cat.icon}</span><span>${catLabel(cat)}</span><span class="badge">${locked?'🔒':cnt}</span>
      </button>`;
    });
    html += '</div>';
  });

  nav.innerHTML = html;
}

// ═══════════════════════════════════════════════════
// NAVIGATION
// ═══════════════════════════════════════════════════
function teardownCurrentPageModule(){
  try{
    if(currentPage === 'schema-studio' && window.SchemaStudio && typeof window.SchemaStudio.destroy === 'function'){
      window.SchemaStudio.destroy();
    }
  }catch(_teardownErr){}
}

function resolvePortalScriptUrl(fragment){
  var src = './scripts/portal/' + fragment;
  return src + (src.indexOf('?') >= 0 ? '&' : '?') + 'v=20260405w';
}

function renderModuleBuilderStatus(container, mode, detail){
  var title = mode === 'loading'
    ? (lang==='en' ? 'Loading Module Builder...' : 'Đang nạp Module Builder...')
    : 'Module Builder';
  var body = mode === 'loading'
    ? (lang==='en'
        ? 'Please wait while the builder runtime is reloaded.'
        : 'Vui lòng chờ trong khi hệ thống nạp lại runtime của builder.')
    : (lang==='en'
        ? 'The builder could not be loaded automatically. Please reload once.'
        : 'Không thể nạp Module Builder tự động. Vui lòng tải lại một lần.');
  var extra = '';
  if(detail){
    extra = '<div style="margin-top:12px;padding:10px 12px;border-radius:12px;border:1px solid rgba(220,38,38,0.18);background:rgba(220,38,38,0.06);color:#991b1b;font-size:12px;word-break:break-word">' + String(detail).replace(/[&<>]/g, function(ch){
      return ch === '&' ? '&amp;' : (ch === '<' ? '&lt;' : '&gt;');
    }) + '</div>';
  }
  container.innerHTML =
    '<div style="max-width:760px;margin:32px auto;padding:24px;border-radius:20px;border:1px solid var(--border);background:#fff;box-shadow:var(--shadow-sm)">' +
      '<div style="font-size:22px;font-weight:700;margin-bottom:8px">' + title + '</div>' +
      '<div style="color:var(--text-secondary);line-height:1.6">' + body + '</div>' +
      extra +
      '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px">' +
        '<button class="hm-btn hm-btn-primary" onclick="navigateTo(\'module-builder\', undefined, true)">' + (lang==='en' ? 'Retry builder' : 'Thử nạp lại builder') + '</button>' +
        '<button class="hm-btn hm-btn-secondary" onclick="window.location.reload()">' + (lang==='en' ? 'Reload page' : 'Tải lại trang') + '</button>' +
      '</div>' +
    '</div>';
}

function ensurePortalRenderer(fragment, globalName, forceReload){
  return new Promise(function(resolve, reject){
    var script;
    var scriptUrl;
    var timeoutId;
    var settled = false;
    var expectedName = String(fragment || '').split('?')[0];
    function cleanup(){
      if(timeoutId){
        clearTimeout(timeoutId);
        timeoutId = null;
      }
      window.removeEventListener('error', onWindowError);
    }
    function settleResolve(renderer){
      if(settled) return;
      settled = true;
      cleanup();
      resolve(renderer);
    }
    function settleReject(message){
      if(settled) return;
      settled = true;
      cleanup();
      reject(new Error(message));
    }
    function finishResolve(){
      if(typeof window[globalName] === 'function'){
        settleResolve(window[globalName]);
        return true;
      }
      return false;
    }
    function onWindowError(evt){
      var fileName = String((evt && evt.filename) || '');
      var message = String((evt && evt.message) || '');
      if(fileName && fileName.indexOf(expectedName) < 0 && fileName.indexOf(fragment) < 0){
        return;
      }
      settleReject(message || 'script_runtime_failed');
    }
    function loadViaScriptTag(){
      try{ delete window[globalName]; }catch(_deleteRendererErr){}
      document.querySelectorAll('script[data-portal-runtime="' + fragment + '"]').forEach(function(oldNode){
        if(oldNode && oldNode.parentNode) oldNode.parentNode.removeChild(oldNode);
      });
      window.addEventListener('error', onWindowError);
      timeoutId = setTimeout(function(){
        if(!finishResolve()){
          settleReject('script_timeout');
        }
      }, 15000);
      script = document.createElement('script');
      script.charset = 'UTF-8';
      script.src = scriptUrl;
      script.setAttribute('data-portal-runtime', fragment);
      script.onload = function(){
        if(!finishResolve()){
          settleReject(globalName + '_missing');
        }
      };
      script.onerror = function(){
        settleReject('script_load_failed');
      };
      document.body.appendChild(script);
    }
    if(!forceReload && typeof window[globalName] === 'function'){
      resolve(window[globalName]);
      return;
    }
    scriptUrl = resolvePortalScriptUrl(fragment) + '&portal_reload=' + Date.now();
    loadViaScriptTag();
  });
}

function renderModuleBuilderPage(){
  var mbp = document.getElementById('page-module-builder');
  if(!mbp) return;
  try{
    if(typeof window._renderModuleBuilder !== 'function'){
      throw new Error('renderer_missing');
    }
    window._renderModuleBuilder(mbp);
    return;
  }catch(_builderErr){
    renderModuleBuilderStatus(mbp, 'loading', _builderErr && _builderErr.message ? _builderErr.message : '');
  }
  ensurePortalRenderer('31-module-builder.js', '_renderModuleBuilder', true).then(function(renderer){
    try{
      renderer(mbp);
    }catch(retryErr){
      renderModuleBuilderStatus(mbp, 'error', retryErr && retryErr.message ? retryErr.message : '');
    }
  }).catch(function(loadErr){
    renderModuleBuilderStatus(mbp, 'error', loadErr && loadErr.message ? loadErr.message : '');
  });
}

function adminTabUsesScopedScroll(tabId){
  return ['users','dept_title','orgchart','perms','roles','activity'].includes(String(tabId || ''));
}

function syncPortalScrollMode(page, tabId){
  const content = document.getElementById('content');
  const adminPage = document.getElementById('page-admin');
  const useScopedScroll = page === 'admin' && adminTabUsesScopedScroll(tabId);
  if(content) content.classList.toggle('admin-scroll-lock', useScopedScroll);
  if(adminPage) adminPage.classList.toggle('admin-scroll-host', useScopedScroll);
}

function navigateTo(page, filter, bypassGuard){
  if(page === 'vps-control'){
    if(canUserAccessModule('admin') && canUserAccessAdminTab('infrastructure')){
      adminTab = 'infrastructure';
      page = 'admin';
      filter = undefined;
    }else{
      page = firstAccessiblePortalModule();
      filter = undefined;
    }
  }
  if(page === 'admin'){
    if(!canUserAccessModule('admin')){
      page = firstAccessiblePortalModule();
      filter = undefined;
    }else if(!canUserAccessAdminTab(adminTab)){
      adminTab = firstAccessibleAdminTab();
    }
  }
  if(page !== 'admin' && !canUserAccessModule(page)){
    const fallbackPage = firstAccessiblePortalModule();
    if(!bypassGuard && page !== fallbackPage){
      showToast(lang==='en' ? 'You do not have access to that module.' : 'Bạn không có quyền truy cập module đó.');
    }
    page = fallbackPage;
    filter = undefined;
  }
  if(!bypassGuard && typeof window._ecBeforePortalNavigate === 'function'){
    try{
      if(window._ecBeforePortalNavigate({ page:page, filter:filter })) return;
    }catch(_guardErr){}
  }
  // Auto-close sidebar on mobile
  if(window.innerWidth <= 900) closeMobileSidebar();
  teardownCurrentPageModule();
  currentPage = page;
  if(page==='admin') loadUsersFromServerIfAdmin();
  if(filter !== undefined) currentFilter = filter;
  if(page==='documents' && filter !== undefined) currentFolderPath = []; // Reset folder path on category change
  syncPortalScrollMode(page, page === 'admin' ? adminTab : '');
  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  document.getElementById('doc-viewer').classList.remove('active');
  document.getElementById('user-dropdown').classList.remove('show');
  
  // Track page view for activity log
  const pageTitles = {dashboard:'Tổng quan',documents:'Danh sách tài liệu',search:'Tìm kiếm',dictionary:'Từ điển thuật ngữ',access:'Ma trận truy cập',admin:'Quản trị hệ thống',deploy:'Triển khai vận hành','vps-control':'VPS Control Tower',mes:'Trung tâm điều hành MES',exceptions:'Bảng ngoại lệ',orders:'Quản lý đơn hàng',purchasing:'Mua hàng & IQC',forms:'Kiểm soát chứng cứ','quality-exceptions':'Quản lý ngoại lệ chất lượng','supplier-quality':'Quản lý chất lượng NCC','quoting':'Báo giá & Ước tính',evidence:'Kho chứng cứ','customer-portal':'Cổng khách hàng','cnc-programs':'Chương trình CNC','product-passport':'Hộ chiếu sản phẩm số','ai-scheduling':'AI Chất lượng & Lịch trình','compliance-reports':'Báo cáo tuân thủ',fmea:'FMEA & Control Plan','apqp-ppap':'APQP / PPAP','mobile-shopfloor':'Xưởng di động','knowledge-base':'Kho kiến thức','continuous-improvement':'Cải tiến liên tục','energy-dashboard':'Giám sát năng lượng','schema-studio':'Schema Studio'};
  pageTitles['module-builder'] = 'Module Builder';
  trackPageView(page + (filter ? '/'+filter : ''), (pageTitles[page]||page) + (filter ? ' — '+filter : ''));
  
  const titles = {dashboard:T('bc_dashboard'),documents:T('bc_documents'),search:T('bc_search'),dictionary:T('bc_dictionary'),access:T('bc_access'),deploy:lang==='en'?'Operations Deployment':'Triển khai vận hành','vps-control':'VPS Control Tower',mes:lang==='en'?'MES Control Center':'Trung tâm điều hành MES',exceptions:lang==='en'?'Exception Dashboard':'Bảng ngoại lệ',orders:lang==='en'?'Order Management':'Quản lý đơn hàng',purchasing:lang==='en'?'Purchasing & IQC':'Mua hàng & IQC',forms:lang==='en'?'Evidence Control':'Kiểm soát chứng cứ','quality-exceptions':lang==='en'?'Quality Exception Hub':'Quản lý ngoại lệ chất lượng','supplier-quality':lang==='en'?'Supplier Quality':'Quản lý chất lượng NCC',quoting:lang==='en'?'Quoting & Estimation':'Báo giá & Ước tính',evidence:lang==='en'?'Evidence Vault':'Kho chứng cứ','customer-portal':lang==='en'?'Customer Portal Admin':'Quản trị cổng khách hàng','cnc-programs':lang==='en'?'CNC Programs':'Chương trình CNC','product-passport':lang==='en'?'Digital Product Passport':'Hộ chiếu sản phẩm số','ai-scheduling':lang==='en'?'AI Quality & Scheduling':'AI Chất lượng & Lịch trình','compliance-reports':lang==='en'?'Compliance Reports':'Báo cáo tuân thủ',fmea:lang==='en'?'FMEA & Control Plan':'FMEA & Control Plan','apqp-ppap':lang==='en'?'APQP / PPAP':'APQP / PPAP','mobile-shopfloor':lang==='en'?'Shop Floor Mobile':'Xưởng di động','knowledge-base':lang==='en'?'Knowledge Base':'Kho kiến thức','continuous-improvement':lang==='en'?'Continuous Improvement':'Cải tiến liên tục','energy-dashboard':lang==='en'?'Energy Monitor':'Giám sát năng lượng','schema-studio':'Schema Studio'};
  titles['template-demo'] = 'Master Module Template';
  titles['module-builder'] = 'Module Builder';
  // Reset header breadcrumb for non-documents pages
  if(page !== 'documents'){
    const bcEl = document.getElementById('header-breadcrumb');
    if(bcEl) bcEl.innerHTML = `<span>HESEM MOM</span><span style="margin:0 4px">›</span><span class="current">${titles[page]||page}</span>`;
  }

  setDocHeaderToolbar('');
  if(page==='dashboard') renderDashboard();
  if(page==='documents'){ _lastDocRenderTarget = 'page-documents'; renderDocuments(); }
  if(page==='search') renderSearch();
  if(page==='dictionary') renderDictionary();
  if(page==='access') renderAccessMatrix();
  if(page==='deploy') renderDeployDashboard();
  if(page==='mes' && typeof window._renderMesControlCenter==='function'){ var mp=document.getElementById('page-mes'); if(mp) window._renderMesControlCenter(mp); }
  if(page==='exceptions' && typeof window._renderExceptionDashboard==='function'){ var xp=document.getElementById('page-exceptions'); if(xp) window._renderExceptionDashboard(xp); }
  if(page==='orders' && typeof window._renderSoJoWoDashboard==='function'){ var op=document.getElementById('page-orders'); if(op) window._renderSoJoWoDashboard(null,null,op); }
  if(page==='purchasing' && typeof window._renderPurchasingWorkspace==='function'){ var pp=document.getElementById('page-purchasing'); if(pp) window._renderPurchasingWorkspace(pp); }
  if(page==='forms' && typeof renderOnlineForms==='function') renderOnlineForms();
  if(page==='quality-exceptions' && typeof window._renderQualityExceptionHub==='function'){ var qep=document.getElementById('page-quality-exceptions'); if(qep) window._renderQualityExceptionHub(qep); }
  if(page==='supplier-quality' && typeof window._renderSupplierQuality==='function'){ var sqp=document.getElementById('page-supplier-quality'); if(sqp) window._renderSupplierQuality(sqp); }
  if(page==='quoting' && typeof window._renderQuotingEngine==='function'){ var qtp=document.getElementById('page-quoting'); if(qtp) window._renderQuotingEngine(qtp); }
  if(page==='evidence'){
    /* Legacy: redirect to Evidence Control (forms page, Chứng cứ tab) */
    if(typeof window._fhState !== 'undefined') window._fhState.workspaceMode = 'evidence';
    if(typeof renderOnlineForms === 'function') renderOnlineForms();
    else navigateTo('forms');
  }
  if(page==='customer-portal' && typeof window._renderCustomerPortalAdmin==='function'){ var cpp=document.getElementById('page-customer-portal'); if(cpp) window._renderCustomerPortalAdmin(cpp); }
  if(page==='cnc-programs' && typeof window._renderCncPrograms==='function'){ var cnp=document.getElementById('page-cnc-programs'); if(cnp) window._renderCncPrograms(cnp); }
  if(page==='product-passport' && typeof window._renderProductPassport==='function'){ var ppp=document.getElementById('page-product-passport'); if(ppp) window._renderProductPassport(ppp); }
  if(page==='ai-scheduling' && typeof window._renderAiQualityScheduling==='function'){ var asp=document.getElementById('page-ai-scheduling'); if(asp) window._renderAiQualityScheduling(asp); }
  if(page==='compliance-reports' && typeof window._renderComplianceReports==='function'){ var crp=document.getElementById('page-compliance-reports'); if(crp) window._renderComplianceReports(crp); }
  if(page==='template-demo'){
    var tdp=document.getElementById('page-template-demo');
    if(tdp && window.HmModuleRouter){ window.HmModuleRouter.renderModuleById(tdp, 'M2-orders'); }
    else if(tdp && typeof window._renderTemplateModule==='function'){ window._renderTemplateModule(tdp); }
  }
  if(page==='fmea' && typeof window._renderFmeaControlPlan==='function'){ var fmp=document.getElementById('page-fmea'); if(fmp) window._renderFmeaControlPlan(fmp); }
  if(page==='apqp-ppap'){ navigateTo('eqms'); if(window.EqmsShell) requestAnimationFrame(function(){ EqmsShell.navigate('apqp-ppap'); }); return; }
  if(page==='mobile-shopfloor' && typeof window._renderMobileShopFloor==='function'){ var msp=document.getElementById('page-mobile-shopfloor'); if(msp) window._renderMobileShopFloor(msp); }
  if(page==='knowledge-base' && typeof window._renderKnowledgeBase==='function'){ var kbp=document.getElementById('page-knowledge-base'); if(kbp) window._renderKnowledgeBase(kbp); }
  if(page==='continuous-improvement' && typeof window._renderContinuousImprovement==='function'){ var cip=document.getElementById('page-continuous-improvement'); if(cip) window._renderContinuousImprovement(cip); }
  if(page==='energy-dashboard' && typeof window._renderEnergyDashboard==='function'){ var edp=document.getElementById('page-energy-dashboard'); if(edp) window._renderEnergyDashboard(edp); }
  if(page==='dispatch' && typeof window._renderProductionDispatch==='function'){ var dsp=document.getElementById('page-dispatch'); if(dsp) window._renderProductionDispatch(dsp); }
  if(page==='module-builder'){ renderModuleBuilderPage(); }
  if(page==='schema-studio' && typeof window._renderSchemaStudio==='function'){ var ssp=document.getElementById('page-schema-studio'); if(ssp) window._renderSchemaStudio(ssp); }
  if(page==='eqms' && typeof window._renderEqmsSuite==='function'){ var eqp=document.getElementById('page-eqms'); if(eqp) window._renderEqmsSuite(eqp); }
  if(page==='admin'){ if(!canUserAccessModule('admin')){navigateTo(firstAccessiblePortalModule());return;} renderAdmin(); }
  
  document.getElementById('page-'+page).classList.add('active');
  renderSidebar();
  persistPortalViewState('navigate');
}

function isDownloadOnlyDoc(doc){
  try{
    if(!doc) return false;
    if(doc.delivery_mode === 'download' || doc.portal_behavior === 'download_on_open') return true;
    const ext = String(doc.ext||'').trim().toLowerCase();
    if(ext) return ext !== 'html';
    const match = String(doc.path||'').match(/\.([a-z0-9]+)$/i);
    return !!(match && String(match[1]||'').toLowerCase() !== 'html');
  }catch(e){ return false; }
}

function buildDocStreamUrl(doc, download=true, overridePath=''){
  try{
    if(!doc) return '';
    const relPath = String(overridePath || doc.path || '').replace(/^\/+/, '');
    if(!relPath) return '';
    const qs = new URLSearchParams();
    qs.set('action', 'doc_stream');
    qs.set('path', relPath);
    if(doc.code) qs.set('code', String(doc.code));
    if(download) qs.set('download', '1');
    return 'api.php?' + qs.toString();
  }catch(e){
    return '';
  }
}

function normalizeDocRelativePath(relPath){
  try{
    return String(relPath || '')
      .trim()
      .replace(/\\/g,'/')
      .replace(/^\/+/,'')
      .replace(/^\.\//,'');
  }catch(e){
    return '';
  }
}

function findDocByRelativePath(relPath){
  try{
    const normalized = normalizeDocRelativePath(relPath);
    if(!normalized) return null;
    return DOCS.find(d => normalizeDocRelativePath(d && d.path) === normalized) || null;
  }catch(e){
    return null;
  }
}

function resolveDocRecord(docOrCode){
  try{
    if(!docOrCode) return null;
    if(typeof docOrCode === 'object'){
      if(docOrCode.path){
        const byObjectPath = findDocByRelativePath(docOrCode.path);
        if(byObjectPath) return byObjectPath;
      }
      if(docOrCode.code){
        const rawObjectCode = String(docOrCode.code || '').trim();
        if(rawObjectCode){
          const currentPath = normalizeDocRelativePath(window.currentDocPath || '');
          if(currentPath){
            const currentMatch = DOCS.find(d => String(d && d.code || '').trim() === rawObjectCode && normalizeDocRelativePath(d && d.path) === currentPath);
            if(currentMatch) return currentMatch;
          }
          const byObjectCode = DOCS.find(d => String(d && d.code || '').trim() === rawObjectCode);
          if(byObjectCode) return byObjectCode;
        }
      }
      return docOrCode.code || docOrCode.path ? docOrCode : null;
    }
    const raw = String(docOrCode || '').trim();
    if(!raw) return null;
    const byPath = findDocByRelativePath(raw);
    if(byPath) return byPath;
    const matches = DOCS.filter(d => String(d && d.code || '').trim() === raw);
    if(!matches.length) return null;
    const currentPath = normalizeDocRelativePath(window.currentDocPath || '');
    if(currentPath){
      const currentMatch = matches.find(d => normalizeDocRelativePath(d && d.path) === currentPath);
      if(currentMatch) return currentMatch;
    }
    return matches[0] || null;
  }catch(e){
    return null;
  }
}
window._resolveDocRecord = resolveDocRecord;

function buildPathStreamUrl(relPath, download=true, code=''){
  try{
    const normalized = normalizeDocRelativePath(relPath);
    if(!normalized) return '';
    const linkedDoc = findDocByRelativePath(normalized);
    const qs = new URLSearchParams();
    qs.set('action', 'doc_stream');
    qs.set('path', normalized);
    const resolvedCode = String(code || (linkedDoc && linkedDoc.code) || '').trim();
    if(resolvedCode) qs.set('code', resolvedCode);
    if(download) qs.set('download', '1');
    return 'api.php?' + qs.toString();
  }catch(e){
    return '';
  }
}

function resolveLinkedDocPath(href, baseDocPath=''){
  try{
    const rawHref = String(href || '').trim();
    if(!rawHref || rawHref.startsWith('#')) return '';
    if(/^(javascript|mailto|tel|data):/i.test(rawHref)) return '';
    const baseUrl = new URL('../' + normalizeDocRelativePath(baseDocPath), window.location.href);
    const targetUrl = new URL(rawHref, baseUrl);
    if(targetUrl.origin !== window.location.origin) return '';
    return normalizeDocRelativePath(decodeURIComponent(targetUrl.pathname.replace(/^\/+/, '')));
  }catch(e){
    return '';
  }
}

function attachIframeLinkBridge(iframe, doc, baseDocPath=''){
  try{
    const idoc = iframe && (iframe.contentDocument || (iframe.contentWindow && iframe.contentWindow.document));
    if(!idoc || !idoc.addEventListener || idoc.__hesemPortalLinkBridgeAttached) return;
    const effectiveBasePath = normalizeDocRelativePath(baseDocPath || (doc && doc.path) || '');
    idoc.addEventListener('click', function(e){
      const anchor = e && e.target && typeof e.target.closest === 'function' ? e.target.closest('a[href]') : null;
      if(!anchor || e.defaultPrevented) return;
      if(e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const relPath = resolveLinkedDocPath(anchor.getAttribute('href'), effectiveBasePath);
      if(!relPath) return;
      const linkedDoc = findDocByRelativePath(relPath);
      if(/\.(xlsx|xlsm|xls|csv)$/i.test(relPath) || anchor.hasAttribute('download')){
        e.preventDefault();
        e.stopPropagation();
        triggerDownloadUrl(buildPathStreamUrl(relPath, true, linkedDoc && linkedDoc.code));
        return;
      }
      if(linkedDoc && /\.(html?)$/i.test(relPath) && typeof openDoc === 'function'){
        e.preventDefault();
        e.stopPropagation();
        openDoc(linkedDoc);
      }
    }, true);
    idoc.__hesemPortalLinkBridgeAttached = true;
  }catch(e){}
}

function triggerDownloadUrl(url){
  const href = String(url || '').trim();
  if(!href) return;
  const a = document.createElement('a');
  a.href = href;
  a.download = '';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>a.remove(), 0);
}

function triggerDocDownload(doc){
  if(!doc || !doc.path) return;
  const localeView = (typeof getDocLocaleView === 'function') ? getDocLocaleView(doc) : null;
  if(localeView && localeView.available && localeView.file){
    triggerDownloadUrl(buildDocStreamUrl(doc, true, localeView.file));
    return;
  }
  if(lang==='en'){
    showToast(lang==='en'
      ? 'English artifact is not published for this document yet'
      : 'Bản tiếng Anh của tài liệu này chưa được phát hành');
    return;
  }
  triggerDownloadUrl(buildDocStreamUrl(doc, true));
}

function downloadCurrentDoc(code){
  const doc = resolveDocRecord(code);
  if(!doc) return;
  triggerDocDownload(doc);
}

function getVersionAccessUrl(doc, version){
  try{
    if(version && version.download_url) return String(version.download_url);
    if(version && version.file){
      if(isDownloadOnlyDoc(doc)) return buildDocStreamUrl(doc, true, version.file);
      return '../' + String(version.file).replace(/^\/+/, '');
    }
  }catch(e){}
  return '';
}

function getVersionLocaleAccessUrl(doc, version){
  const rawUrl = getVersionAccessUrl(doc, version);
  if(!rawUrl) return '';
  if(lang!=='en') return rawUrl;
  const localeView = (typeof getDocLocaleView === 'function') ? getDocLocaleView(doc) : null;
  if(!localeView || !localeView.available || !localeView.file) return '';
  if(typeof isCurrentVersionEntry === 'function' && !isCurrentVersionEntry(doc, version)) return '';
  if(typeof isDownloadOnlyDoc === 'function' && isDownloadOnlyDoc(doc)){
    return buildDocStreamUrl(doc, true, localeView.file);
  }
  return '../' + String(localeView.file).replace(/^\/+/, '');
}

function versionHasAccess(doc, version){
  return !!getVersionLocaleAccessUrl(doc, version);
}

function isCurrentVersionEntry(doc, version){
  try{
    if(version && version.is_current) return true;
    return !!(version && version.status==='approved' && version.file===doc.path);
  }catch(e){
    return false;
  }
}

async function openDoc(code){
  // Ensure no stray overlay blocks the UI
  try{ document.querySelectorAll('.vp-overlay').forEach(el=>el.remove()); }catch(e){}

  let doc = resolveDocRecord(code);
  if(!doc) return;
  const resolvedCode = String(doc.code || '').trim();

  // Block access to hidden documents for non-admins
  if(isDocHidden(doc.code) && !isAdmin()){
    showToast(lang==='en' ? 'This document is currently hidden by Admin.' : 'Tài liệu này hiện đang bị ẩn bởi Admin.');
    return;
  }
  if(!canAccessDoc(doc.code)) return;

  // ── Unsaved Changes Guard ──
  if(editMode && editingDoc && editingDoc !== resolvedCode){
    let hasUnsaved=true;
    try{
      hasUnsaved=(typeof edHasUnsavedChanges==='function')
        ? edHasUnsavedChanges(editingDoc)
        : (!!getEditedHtml(editingDoc) || !!edModified);
    }catch(e){ hasUnsaved=true; }
    if(hasUnsaved){
      showUnsavedDialog(editingDoc, resolvedCode);
      return;
    }
    try{ cancelEdit(); }catch(e){
      editMode=false;
      editingDoc=null;
    }
  }

  // Track document view
  const displayTitle = getDocDisplayTitle(doc);
  const displayCode = (typeof getDocDisplayCode === 'function') ? getDocDisplayCode(doc) : String(doc.code || '').trim();
  trackPageView('doc/'+resolvedCode, (isDownloadOnlyDoc(doc)?'📊 ':'📄 ')+displayCode+' — '+displayTitle.substring(0,60));
  editMode=false;
  editingDoc=null;
  currentDoc=resolvedCode;
  window.currentDocPath = String(doc.path || '');
  const openViewTxn = (typeof beginPortalDocViewTransaction === 'function')
    ? beginPortalDocViewTransaction('open-doc', doc, lang)
    : null;
  setDocHeaderMetaCollapsed(true);
  try{ if(typeof resetDocViewerZoom==='function') resetDocViewerZoom(); }catch(e){}
  edFullscreen=false;
  const _ec=document.getElementById('editor-container');
  if(_ec){ _ec.style.display='none'; _ec.classList.remove('ed-fullscreen'); }

  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  const viewer = document.getElementById('doc-viewer');
  if(viewer) viewer.classList.add('active');
  persistPortalViewState('open-doc');

  renderDocViewerBreadcrumb(doc);

  // Render UI immediately (do NOT block on server-side version scan)
  updateDocViewerHeader(doc);
  renderWorkflowPanel(doc);
  renderVersionHistory(doc);
  const openRenderToken = openViewTxn
    ? openViewTxn.token
    : `${resolvedCode}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
  window.__DOC_VIEW_RENDER_TOKEN = openRenderToken;

  // Load current document HTML immediately
  const initialLocaleSignature = (function(){
    try{
      const lv = getDocLocaleView(doc);
      return [lv.locale, lv.mode, lv.file || '', lv.translationState || ''].join('|');
    }catch(e){
      return '';
    }
  })();
  loadDocContent(doc);

  if(lang === 'en' && typeof refreshDccOverlayForDocFromServer === 'function'){
    try{
      refreshDccOverlayForDocFromServer(resolvedCode, {refreshUi:false}).then(()=>{
        try{
          if(currentDoc !== resolvedCode) return;
          if(window.__DOC_VIEW_RENDER_TOKEN !== openRenderToken) return;
          if(openViewTxn && !isPortalDocViewTransactionCurrent(openViewTxn, resolvedCode)) return;
          const latestDoc = resolveDocRecord(resolvedCode) || doc;
          if(isDocHidden(latestDoc.code) && !isAdmin()) return;
          if(!canAccessDoc(latestDoc.code)) return;
          const latestLocaleSignature = (function(){
            try{
              const lv = getDocLocaleView(latestDoc);
              return [lv.locale, lv.mode, lv.file || '', lv.translationState || ''].join('|');
            }catch(e){
              return '';
            }
          })();
          if(latestLocaleSignature && latestLocaleSignature !== initialLocaleSignature){
            renderDocViewerBreadcrumb(latestDoc);
            updateDocViewerHeader(latestDoc);
            renderWorkflowPanel(latestDoc);
            renderVersionHistory(latestDoc);
            loadDocContent(latestDoc);
          }
        }catch(e){}
      }).catch(()=>{});
    }catch(e){}
  }

  // Background: refresh server-backed state + versions, then re-render once
  try{
    refreshDocFromServer(resolvedCode).then(()=>{
      try{
        if(currentDoc !== resolvedCode) return;
        if(window.__DOC_VIEW_RENDER_TOKEN !== openRenderToken) return;
        if(openViewTxn && !isPortalDocViewTransactionCurrent(openViewTxn, resolvedCode)) return;
        const latestDoc = resolveDocRecord(resolvedCode) || doc;
        if(isDocHidden(latestDoc.code) && !isAdmin()) return;
        if(!canAccessDoc(latestDoc.code)) return;
        renderDocViewerBreadcrumb(latestDoc);
        updateDocViewerHeader(latestDoc);
        renderWorkflowPanel(latestDoc);
        renderVersionHistory(latestDoc);
        // Re-load iframe only if the locale-selected file/state actually
        // changed. Repainting the same iframe is the visible "EN/VI jitter".
        const latestLocaleSignature = (function(){
          try{
            const lv = getDocLocaleView(latestDoc);
            return [lv.locale, lv.mode, lv.file || '', lv.translationState || ''].join('|');
          }catch(e){
            return '';
          }
        })();
        if(latestLocaleSignature && latestLocaleSignature !== initialLocaleSignature){
          loadDocContent(latestDoc);
        }
      }catch(e){}
    }).catch(()=>{});
  }catch(e){}
}

// Refresh the currently-open document preview (header, workflow, DCR record, iframe)
// without navigating away. This is used after server-side state changes (approve/new revision).
async function openDocPreview(code, options){
  try{
    const opts = (options && typeof options === 'object') ? options : {};
    const doc = resolveDocRecord(code);
    if(!doc) return;
    const resolvedCode = String(doc.code || '').trim();
    const currentBeforePreview = String(currentDoc || '').trim();
    if(currentBeforePreview !== resolvedCode){
      const allowedFrom = String(opts.allowFromCode || '').trim();
      if(!allowedFrom || allowedFrom !== currentBeforePreview) return;
      currentDoc = resolvedCode;
      window.currentDocPath = String(doc.path || '');
    }
    if(isDocHidden(doc.code) && !isAdmin()) return;
    if(!canAccessDoc(doc.code)) return;
    const previewLang = lang === 'en' ? 'en' : 'vi';
    const previewViewTxn = (typeof beginPortalDocViewTransaction === 'function')
      ? beginPortalDocViewTransaction('open-doc-preview', doc, previewLang)
      : null;
    const previewRenderToken = previewViewTxn
      ? previewViewTxn.token
      : `${resolvedCode}:${Date.now()}:${Math.random().toString(36).slice(2)}`;
    window.__DOC_VIEW_RENDER_TOKEN = previewRenderToken;
    // Pull the latest server state/versions to keep folder-sync accurate
    try{ await refreshDocFromServer(resolvedCode); }catch(e){}
    if(currentDoc !== resolvedCode) return;
    if(window.__DOC_VIEW_RENDER_TOKEN !== previewRenderToken) return;
    if(previewViewTxn && !isPortalDocViewTransactionCurrent(previewViewTxn, doc, previewLang)) return;
    const latestDoc = resolveDocRecord(resolvedCode) || doc;
    if(isDocHidden(latestDoc.code) && !isAdmin()) return;
    if(!canAccessDoc(latestDoc.code)) return;

    // Ensure doc viewer is active
    currentDoc = resolvedCode;
    window.currentDocPath = String(latestDoc.path || '');
    setDocHeaderMetaCollapsed(true);
    const viewer = document.getElementById('doc-viewer');
    if(viewer) viewer.classList.add('active');
    persistPortalViewState('open-doc-preview');

    // Re-render UI blocks
    renderDocViewerBreadcrumb(latestDoc);
    updateDocViewerHeader(latestDoc);
    renderWorkflowPanel(latestDoc);
    renderVersionHistory(latestDoc);
    loadDocContent(latestDoc);
  }catch(err){
    console.error('openDocPreview error:', err);
  }
}

function closeDocViewer(){
  // Unsaved changes guard
  if(editMode && editingDoc){
    let hasUnsaved=true;
    try{
      hasUnsaved=(typeof edHasUnsavedChanges==='function')
        ? edHasUnsavedChanges(editingDoc)
        : (!!getEditedHtml(editingDoc) || !!edModified);
    }catch(e){ hasUnsaved=true; }
    if(hasUnsaved){
      showUnsavedDialog(editingDoc, null);
      return;
    }
    try{ cancelEdit(); }catch(e){
      editMode=false;
      editingDoc=null;
    }
  }
  editMode=false;
  editingDoc=null;
  currentDoc=null;
  try{ if(typeof clearPortalDocViewTransaction === 'function') clearPortalDocViewTransaction('close-doc-viewer'); }catch(e){}
  setDocHeaderMetaCollapsed(true);
  try{ if(typeof resetDocViewerZoom==='function') resetDocViewerZoom(); }catch(e){}
  // Clean up iframe state to prevent stale content
  var iframe=document.getElementById('doc-iframe');
  iframe.onload=null;
  iframe.__qmsDocLoadToken='';
  iframe.__qmsLangSyncToken='';
  try{
    window.__QMS_DOC_IFRAME_LOAD_TOKEN='';
    window.__QMS_ACTIVE_DOC_CONTENT_SIGNATURE='';
  }catch(e){}
  iframe.removeAttribute('srcdoc');
  iframe.removeAttribute('src');
  iframe.style.opacity='1';
  document.getElementById('iframe-loading').style.display='none';
  document.getElementById('wf-panel').style.display='none';
  document.getElementById('vh-container').innerHTML='';
  document.getElementById('wf-watermark').style.display='none';
  document.getElementById('editor-container').style.display='none';
  navigateTo('documents');
}

// Build top-right actions in Doc Viewer header (Edit/Save/Submit/Cancel/Approve/Reject)
function buildDocHeaderActions(doc){
  try{
    if(!doc) return '';
    const status=getDocStatus(doc);
    const isWorkbook=isDownloadOnlyDoc(doc);
    const versions=getDocVersions(doc.code)||[];
    const workflowRev = (typeof getDocWorkingRevision==='function') ? getDocWorkingRevision(doc) : String(getDocRevision(doc)||'0');
    const activeDraft=versions.find(v=>v && v.status==='draft' && (v.download_url || v.file) && String(v.version||'').replace(/^v/i,'')===String(workflowRev||''));
    const hasDiscardableWorkbookDraft=!!activeDraft || ((typeof docHasWorkingVersion==='function') ? docHasWorkingVersion(doc.code) : false);

    // While editing: show edit workflow buttons
    if(editMode && editingDoc===doc.code){
      return `
        ${renderDocHeaderButton(T('wf_save_draft'), 'save', 'primary', `saveDraft('${doc.code}')`)}
        ${renderDocHeaderButton(T('wf_submit_review'), 'submit', 'accent', `submitForReview('${doc.code}')`)}
        ${renderDocHeaderButton(T('wf_cancel_edit'), 'cancel', 'neutral', 'cancelEdit()')}
      `;
    }

    // Draft: show Edit
    if(status==='draft' && canEdit(doc) && !isWorkbook){
      return renderDocHeaderButton(T('wf_edit'), 'edit', 'primary', `startEdit('${doc.code}')`);
    }

    if(isWorkbook && status==='draft' && canEdit(doc)){
      return `
        ${renderDocHeaderButton(lang==='en'?'Upload draft':'Upload bản nháp', 'upload', 'primary', `uploadFormDraft('${doc.code}')`)}
        ${activeDraft?renderDocHeaderButton(T('wf_submit_review'), 'submit', 'accent', `submitWorkbookForReview('${doc.code}')`):''}
        ${hasDiscardableWorkbookDraft?renderDocHeaderButton(lang==='en'?'Discard draft':'Hủy nháp', 'cancel', 'danger', `deleteDraft('${doc.code}')`):''}
      `;
    }

    // In review: show Approve/Reject (for approvers)
    if(status==='in_review' && canApprove(doc)){
      return `
        ${renderDocHeaderButton(T('wf_approve_doc'), 'approve', 'success', `approveDoc('${doc.code}')`)}
        ${renderDocHeaderButton(T('wf_reject_doc'), 'reject', 'danger', `rejectDoc('${doc.code}')`)}
      `;
    }

    // Approved: allow creating a new revision
    if(status==='approved'){
      const canCreateRevision = ROLES[currentUser.role] && ROLES[currentUser.role].canEditDocs;
      if(canCreateRevision){
        return renderDocHeaderButton(T('new_revision'), 'revision', 'neutral', `startNewRevision('${doc.code}')`);
      }
    }
  }catch(e){}
  return '';
}

function applyRuntimeDocDisplayMetadata(doc, meta){
  if(!doc || !meta) return;
  const code = String(meta.code || '').trim().toUpperCase();
  const title = String(meta.title || '').trim();
  const desc = String(meta.desc || '').trim();
  if(code) doc.__displayCode = code;
  if(title) doc.__displayTitle = title;
  if(desc) {
    doc.__displayDesc = desc;
    doc.__displayDescLocale = lang === 'en' ? 'en' : 'vi';
  }

  if(String(currentDoc || '') !== String(doc.code || '')) return;
  const viewTxn = (typeof getPortalDocViewTransaction === 'function') ? getPortalDocViewTransaction() : null;
  if(viewTxn && typeof isPortalDocViewTransactionCurrent === 'function' && !isPortalDocViewTransactionCurrent(viewTxn, doc)) return;

  try{ renderDocViewerBreadcrumb(doc); }catch(e){}

  try{ updateDocViewerHeader(doc); }catch(e){}
}

function updateDocViewerHeader(doc){
  if(!doc) return;
  const cat = getCatForDoc(doc);
  const status = getDocStatus(doc);
  const rev = getDocRevision(doc);
  const state = getDocState(doc.code);
  const localeView = (typeof getDocLocaleView === 'function')
    ? getDocLocaleView(doc)
    : { locale:(lang==='en'?'en':'vi'), available:true, file:(doc.path||''), translationState:'source' };
  const viewFile = localeView.available ? localeView.file : '';
  const hasWorkingDraft = (((typeof docHasWorkingVersion==='function') ? docHasWorkingVersion(doc.code) : false)
    || ((typeof getEditedHtml==='function') && !!getEditedHtml(doc.code)));

  // Build submitted-by meta
  let submittedMeta='';
  if(state && state.submittedBy && state.submittedBy.name){
    const sb=state.submittedBy;
    const utBadge=sb.updateType?(' <span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;'+(sb.updateType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(sb.updateType==='major'?'MAJOR':'MINOR')+'</span>'):'';    
    submittedMeta=`<div class="dv-meta-note submit"><span class="dv-meta-note-label">${T('sm_submitter_label')}</span><b>${sb.name}</b><span>${sb.date||''}</span>${utBadge}</div>`;
  }

  // Build last-editor meta (who last edited/saved draft)
  let lastEditMeta='';
  if(state && state.lastEdit && state.lastEdit.by && hasWorkingDraft){
    const le=state.lastEdit;
    lastEditMeta=`<div class="dv-meta-note edit"><span class="dv-meta-note-label">${lang==='en'?'Last edited by':'Người chỉnh sửa cuối'}</span><b>${le.by}</b><span>${le.role?le.role+' · ':''}${le.date||''}</span></div>`;
  }

  // Build approved-by meta
  let approvedMeta='';
  if(state && state.approvedBy && state.approvedBy.name && status==='approved'){
    approvedMeta=`<div class="dv-meta-note approve"><span class="dv-meta-note-label">${T('wf_approved_by')}</span><b>${state.approvedBy.name}</b><span>${state.approvedBy.date||state.approvedDate||''}</span></div>`;
  }

  const headerActions = buildDocHeaderActions(doc);
  const headerActionsHtml = headerActions
    ? `<div class="dv-action-group dv-edit-actions">${headerActions}</div>`
    : '';
  const displayCode = (typeof getDocDisplayCode === 'function') ? getDocDisplayCode(doc) : String(doc.code || '').trim();
  const displayTitle = getDocDisplayTitle(doc);
  const displayDesc = getDocDisplayDescription(doc);
  const localeStatusNote = (function(){
    if(localeView.locale !== 'en') return '';
    if(!localeView.available){
      return '<div class="dv-meta-note locale warn"><span class="dv-meta-note-label">' + (lang==='en'?'Language':'Ngôn ngữ') + '</span><b>' + (lang==='en'?'English pending':'Tiếng Anh chờ phát hành') + '</b><span>' + (lang==='en'?'Portal is blocked from showing mixed-language content.':'Portal đang chặn hiển thị nội dung trộn ngôn ngữ.') + '</span></div>';
    }
    const label = localeView.translationState === 'released'
      ? (lang==='en'?'English released':'Bản tiếng Anh phát hành')
      : (lang==='en'?'English preview artifact':'Artifact tiếng Anh preview');
    return '<div class="dv-meta-note locale info"><span class="dv-meta-note-label">' + (lang==='en'?'Language':'Ngôn ngữ') + '</span><b>' + label + '</b><span>' + String(localeView.translationState || '').replace(/_/g,' ') + '</span></div>';
  })();
  const isWorkbook = isDownloadOnlyDoc(doc);
  const detailToggleLabel = docHeaderMetaCollapsed
    ? (lang==='en' ? 'Show details' : 'Hiện chi tiết')
    : (lang==='en' ? 'Hide details' : 'Ẩn chi tiết');
  const detailToggleHtml = renderDocHeaderButton(
    detailToggleLabel,
    docHeaderMetaCollapsed ? 'expand' : 'collapse',
    'neutral',
    'toggleDocHeaderMeta()',
    'dv-detail-toggle',
    `aria-expanded="${docHeaderMetaCollapsed?'false':'true'}"`
  );
  const canEditMeta = canEdit(doc);
  const activityNotes = [submittedMeta, lastEditMeta, approvedMeta].filter(Boolean).join('');
  const navActionsHtml = isWorkbook
    ? `<div class="dv-action-group dv-nav-actions">
          ${detailToggleHtml}
          ${renderDocHeaderButton(T('back'), 'back', 'neutral', 'closeDocViewer()')}
          ${localeView.available ? renderDocHeaderButton(lang==='en'?'Download':'Tải về', 'download', 'neutral', `downloadCurrentDoc('${doc.code}')`) : renderDocHeaderButton(lang==='en'?'View Vietnamese':'Xem tiếng Việt', 'locale', 'neutral', `setLang('vi')`)}
       </div>`
    : `<div class="dv-action-group dv-nav-actions">
          ${detailToggleHtml}
          ${renderDocHeaderButton(T('back'), 'back', 'neutral', 'closeDocViewer()')}
          ${localeView.available ? renderDocHeaderButton(T('open_tab'), 'external', 'neutral', `window.open('../${viewFile}','_blank')`) : renderDocHeaderButton(lang==='en'?'View Vietnamese':'Xem tiếng Việt', 'locale', 'neutral', `setLang('vi')`)}
       </div>`;

  const headerEl = document.getElementById('doc-viewer-header');
  setDocHeaderToolbar(`
    <div class="doc-toolbar-shell">
      ${headerActionsHtml}
      ${navActionsHtml}
    </div>
  `);
  const safeDocCode = escapeHtml(doc.code);
  const safeLocale = escapeHtml(lang==='en' ? 'en' : 'vi');
  headerEl.innerHTML = `
    <div class="dv-top">
      <div class="dv-title-area">
        <div class="dv-code" style="color:${cat.color}">${displayCode} <span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;background:${statusColor(status)}18;color:${statusColor(status)}">${statusLabel(status)}</span></div>
	        <div class="dv-name">${displayTitle}</div>
	        ${displayDesc ? `<div class="dv-desc">${displayDesc}</div>` : ''}
	      </div>
	    </div>
    <div class="dv-meta${docHeaderMetaCollapsed ? ' is-collapsed' : ''}">
      <div class="dcc-header"
           data-dcc-doc-code="${safeDocCode}"
           data-dcc-locale="${safeLocale}"
           data-dcc-variant="viewer-inline"></div>
	      ${(activityNotes || localeStatusNote) ? `<div class="dv-meta-notes">${activityNotes}${localeStatusNote ? localeStatusNote : ''}</div>` : ''}
	    </div>`;
  const dccEl = headerEl.querySelector('.dcc-header');
  if (dccEl && window.DccHeader && typeof window.DccHeader.render === 'function') {
    const headerViewTxn = (typeof getPortalDocViewTransaction === 'function') ? getPortalDocViewTransaction() : null;
    Promise.resolve(window.DccHeader.render(dccEl))
      .then(function(){
        if(headerViewTxn && typeof isPortalDocViewTransactionCurrent === 'function' && !isPortalDocViewTransactionCurrent(headerViewTxn, doc)) return;
        if(!dccEl.isConnected) return;
        if (canEditMeta) _injectDccMetaEditButtons(dccEl, doc.code);
      })
      .catch(function(){ /* renderer already paints its own error box */ });
  }
  syncDocViewerDetailVisibility();
}

/* Inject owner/approver pencil buttons next to the DCC ribbon cells. Kept as
 * a DOM hook (rather than baked into the renderer) so the renderer stays
 * read-only and the edit affordance is viewer-scoped. Idempotent — guards
 * against duplicate buttons if render() is called twice for the same node. */
function _injectDccMetaEditButtons(dccEl, docCode){
  if (!dccEl || !docCode) return;
  var ribbon = dccEl.querySelector('.dcc-header__ribbon');
  if (!ribbon) return;
  var specs = [
    { cell:'owner',    title: lang==='en' ? 'Edit owner'    : 'Chỉnh chủ sở hữu' },
    { cell:'approver', title: lang==='en' ? 'Edit approver' : 'Chỉnh người duyệt' }
  ];
  for (var i = 0; i < specs.length; i++) {
    var spec = specs[i];
    var target = ribbon.querySelector('[data-dcc-cell="' + spec.cell + '"]');
    if (!target) continue;
    if (target.querySelector('.dv-meta-edit[data-dcc-edit]')) continue;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dv-meta-edit';
    btn.setAttribute('data-dcc-edit', spec.cell);
    btn.setAttribute('title', spec.title);
    btn.textContent = lang==='en' ? 'Edit' : 'Sửa';
    (function(codeVal, field){
      btn.addEventListener('click', function(ev){
        ev.stopPropagation();
        editDocMeta(codeVal, field);
      });
    })(docCode, spec.cell);
    target.appendChild(btn);
  }
}

// ═══════════════════════════════════════════════════
// RENDER PAGES
// ═══════════════════════════════════════════════════

/* ── DCC role catalog cache (owner/approver pickers) ────────────────────
 * In-memory only; keyed by class ('owner'|'approver'). Not cleared on logout —
 * role codes are non-sensitive catalog data. Reload of the page re-fetches. */
const _dccRoleCache = Object.create(null);

function _dccRolesFetch(cls){
  const key = String(cls || 'all');
  if (_dccRoleCache[key]) return Promise.resolve(_dccRoleCache[key]);
  const url = '/api/v1/dcc/roles?class=' + encodeURIComponent(key);
  return fetch(url, { credentials:'same-origin', headers:{ 'Accept':'application/json' } })
    .then(function(res){
      if (!res.ok) throw new Error('dcc_roles_http_' + res.status);
      return res.json();
    })
    .then(function(body){
      const roles = (body && Array.isArray(body.roles)) ? body.roles : [];
      _dccRoleCache[key] = roles;
      return roles;
    });
}

// Edit doc metadata (owner, approver) — routed through DCC role catalog.
async function editDocMeta(code, field){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    if(field !== 'owner' && field !== 'approver') return;
    const editCode = String(doc.code || code || '').trim();
    const editLang = lang === 'en' ? 'en' : 'vi';
    const editViewTxn = (typeof getPortalDocViewTransaction === 'function') ? getPortalDocViewTransaction() : null;
    const isStillActiveDocMetaView = function(){
      try{
        if(String(currentDoc || '').trim() !== editCode) return false;
        if((lang === 'en' ? 'en' : 'vi') !== editLang) return false;
        if(editViewTxn && typeof isPortalDocViewTransactionCurrent === 'function'){
          return isPortalDocViewTransactionCurrent(editViewTxn, doc, editLang);
        }
        return true;
      }catch(e){
        return false;
      }
    };

    const roles = await _dccRolesFetch(field);
    if(!isStillActiveDocMetaView()) return;
    if(!roles.length){
      showToast(lang==='en' ? '⚠ No roles available' : '⚠ Chưa có vai trò khả dụng');
      return;
    }

    const title = field === 'owner'
      ? (lang==='en' ? 'Edit Document Owner' : 'Chỉnh sửa Chủ sở hữu')
      : (lang==='en' ? 'Edit Approver'       : 'Chỉnh sửa Người phê duyệt');
    const payloadKey = field === 'owner' ? 'owner_role_code' : 'approver_role_code';

    let currentCode = '';
    try {
      const hdrUrl = '/api/v1/dcc/documents/' + encodeURIComponent(code) + '/header?locale=' + encodeURIComponent(lang==='en'?'en':'vi');
      const hdrRes = await fetch(hdrUrl, { credentials:'same-origin', headers:{ 'Accept':'application/json' } });
      if (hdrRes.ok) {
        const hdrBody = await hdrRes.json();
        const hdr = hdrBody && hdrBody.header ? hdrBody.header : {};
        currentCode = String((field === 'owner' ? hdr.owner_role_code : hdr.approver_role_code) || '');
      }
    } catch(e){ /* non-fatal: picker still works without prefill */ }
    if(!isStillActiveDocMetaView()) return;

    _openDccRolePicker({
      title: title,
      roles: roles,
      currentCode: currentCode,
      onSubmit: async function(selected){
        if(!selected || selected === currentCode) return;
        if(!isStillActiveDocMetaView()){
          try{ document.getElementById('dcc-role-picker-modal')?.remove(); }catch(e){}
          return;
        }
        const headers = { 'Content-Type':'application/json', 'Accept':'application/json' };
        if (window.csrfToken) headers['X-CSRF-Token'] = window.csrfToken;
        const body = {}; body[payloadKey] = selected;
        const patchUrl = '/api/v1/dcc/documents/' + encodeURIComponent(code) + '/header';
        const res = await fetch(patchUrl, {
          method:'PATCH',
          credentials:'same-origin',
          headers: headers,
          body: JSON.stringify(body)
        });
        if(!res.ok){
          const errText = await res.text().catch(function(){ return ''; });
          console.warn('[DCC] PATCH header failed', res.status, errText);
          showToast(lang==='en' ? '⚠ Save failed' : '⚠ Lưu thất bại');
          return;
        }
	        if(!isStillActiveDocMetaView()) return;
	        showToast(lang==='en' ? 'Saved' : 'Đã lưu');
	        try{
	          if(window.DccHeader && typeof window.DccHeader.clearCache === 'function'){
	            window.DccHeader.clearCache(editCode);
	          }else if(window.DccHeader && typeof window.DccHeader._clearCache === 'function'){
	            window.DccHeader._clearCache();
	          }
	        }catch(e){}
	        try{
	          if(typeof refreshDccOverlayForDocFromServer === 'function'){
	            await refreshDccOverlayForDocFromServer(editCode, {refreshUi:false});
	          }
	        }catch(e){}
	        if(!isStillActiveDocMetaView()) return;
	        const headerEl = document.getElementById('doc-viewer-header');
	        const dccEl = headerEl ? headerEl.querySelector('.dcc-header') : null;
	        const dccCode = dccEl ? String(dccEl.getAttribute('data-dcc-doc-code') || '').trim() : '';
        const dccLocale = dccEl ? String(dccEl.getAttribute('data-dcc-locale') || '').trim() : '';
        if (dccEl && dccCode === editCode && dccLocale === editLang && window.DccHeader && typeof window.DccHeader.render === 'function') {
          try { await window.DccHeader.render(dccEl); } catch(e){}
        }
        if(!isStillActiveDocMetaView()) return;
        try { updateDocViewerHeader(doc); } catch(e){}
      }
    });
  }catch(err){
    console.error('editDocMeta error:', err);
    showToast(lang==='en' ? '⚠ Could not load roles' : '⚠ Không tải được vai trò');
  }
}

function _openDccRolePicker(cfg){
  document.getElementById('dcc-role-picker-modal')?.remove();
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'dcc-role-picker-modal';
  const opts = cfg.roles.map(function(r){
    const label = (lang==='en' ? (r.label_en || r.label_vi) : (r.label_vi || r.label_en)) || r.role_code;
    const selAttr = (r.role_code === cfg.currentCode) ? ' selected' : '';
    return '<option value="' + escapeHtml(r.role_code) + '"' + selAttr + '>' + escapeHtml(r.role_code) + ' — ' + escapeHtml(label) + '</option>';
  }).join('');
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <div class="modal-title">${escapeHtml(cfg.title)}</div>
        <button class="icon-btn" onclick="document.getElementById('dcc-role-picker-modal')?.remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-field">
          <label>${lang==='en' ? 'Role' : 'Vai trò'}</label>
          <select id="dcc-role-picker-select" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;background:#fff">
            ${opts}
          </select>
        </div>
        <div style="margin-top:8px;font-size:11px;color:var(--text-3)">${lang==='en' ? 'Values flow from the DCC role catalog.' : 'Giá trị lấy từ danh mục vai trò DCC.'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" id="dcc-role-picker-cancel">${lang==='en' ? 'Cancel' : 'Hủy'}</button>
        <button class="btn-admin primary" id="dcc-role-picker-save">${lang==='en' ? 'Save' : 'Lưu'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', function(ev){ if(ev.target === modal) modal.remove(); });
  modal.querySelector('#dcc-role-picker-cancel').addEventListener('click', function(){ modal.remove(); });
  modal.querySelector('#dcc-role-picker-save').addEventListener('click', async function(){
    const sel = modal.querySelector('#dcc-role-picker-select');
    const chosen = sel ? sel.value : '';
    modal.remove();
    try { await cfg.onSubmit(chosen); } catch(e){ console.error('role picker submit', e); }
  });
}

function renderDashboard(){
  const r = ROLES[currentUser.role] || {label: currentUser.title||currentUser.role, labelEn: currentUser.title||currentUser.role};
  const VDOCS = getVisibleDocs();
  const accessibleDocs = VDOCS.filter(d => canAccessDoc(d.code));
  const el = document.getElementById('page-dashboard');
  
  // Find docs pending review/approval
  const pendingDocs = VDOCS.filter(d=>{
    const state=getDocState(d.code);
    return state && state.status==='in_review';
  });
  const myEditing = VDOCS.filter(d=>{
    const state=getDocState(d.code);
    return state
      && state.status==='draft'
      && state.lastEdit
      && state.lastEdit.by===currentUser.name
      && docHasWorkingVersion(d.code);
  });
  const approvedCount = VDOCS.filter(d=>getDocStatus(d)==='approved').length;
  const draftCount = VDOCS.filter(d=>getDocStatus(d)==='draft').length;
  const reviewCount = pendingDocs.length;

  // Find recently updated documents (approved within last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate()-30);
  const recentlyUpdated = [];
  DOCS.forEach(d=>{
    const versions=getDocVersions(d.code);
    if(!versions||versions.length===0) return;
    // Check all approved entries in DCR record
    versions.forEach(v=>{
      if(v.status==='approved' && v.date){
        const vDate=new Date(v.date.replace(' ','T'));
        if(vDate>=thirtyDaysAgo){
          recentlyUpdated.push({
            doc:d,
            version:v.version,
            date:v.date,
            user:v.user,
            role:v.role,
            updateType:v.updateType||'',
            submittedBy:v.submittedBy||'',
            submittedDate:v.submittedDate||'',
            note:v.note||'',
            dateObj:vDate
          });
        }
      }
    });
  });
  recentlyUpdated.sort((a,b)=>b.dateObj-a.dateObj);
  const ruCount=recentlyUpdated.length;
  
  // Build pending approval panel (only for approvers)
  let pendingHtml = '';
  if(r.approve && pendingDocs.length > 0){
    pendingHtml = `
      <div class="card" style="border-left:3px solid #f59e0b;grid-column:1/-1">
        <h3 style="color:#d97706">📬 ${T('pending_approval')} <span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:6px">${pendingDocs.length}</span></h3>
        <div style="max-height:300px;overflow-y:auto">
          ${pendingDocs.map(d=>{
            const cat=getCatForDoc(d);
            const state=getDocState(d.code);
            const submitter=state&&state.submittedBy?state.submittedBy.name:'—';
            const subDate=state&&state.submittedBy?state.submittedBy.date:'';
            const subType=state&&state.submittedBy&&state.submittedBy.updateType?state.submittedBy.updateType:'';
            const subTypeBadge=subType?('<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;'+(subType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(subType==='major'?'MAJOR':'MINOR')+'</span>'):'';
            return `<div class="pa-card" onclick="openDoc('${d.code}')">
              <div class="pa-badge" style="background:#3b82f615;color:#3b82f6">📤 IN REVIEW</div>
              <div class="pa-info">
                <div class="pa-code">${d.code}${subTypeBadge}</div>
                <div class="pa-title">${d.title}</div>
                <div class="pa-sub">${T('submitted_by')}: ${submitter} · ${subDate} · v${getDocRevision(d)}</div>
              </div>
              <span style="color:#1565c0;font-size:18px">→</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }
  
  // Build my drafts panel (for editors who have active drafts)
  let draftsHtml = '';
  if(r.canEditDocs && myEditing.length > 0){
    draftsHtml = `
      <div class="card" style="border-left:3px solid #6366f1;grid-column:1/-1">
        <h3 style="color:#6366f1">📝 ${T('my_drafts')} <span style="background:#eef2ff;color:#6366f1;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:6px">${myEditing.length}</span></h3>
        <div style="max-height:200px;overflow-y:auto">
          ${myEditing.map(d=>{
            const state=getDocState(d.code);
            return `<div class="pa-card" onclick="openDoc('${d.code}')">
              <div class="pa-badge" style="background:#f59e0b15;color:#f59e0b">📋 DRAFT</div>
              <div class="pa-info">
                <div class="pa-code">${d.code}</div>
                <div class="pa-title">${d.title}</div>
                <div class="pa-sub">v${getDocRevision(d)} · ${state&&state.lastEdit?state.lastEdit.date:''}</div>
              </div>
              <span style="color:#1565c0;font-size:18px">→</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // High-impact execution shortcuts (RFQ → Cash, G0–G7)
  const execShortcutCodes = [
    "PROC-OPS-001",
    "WI-OPS-001",
    "ANNEX-502",
    "WI-OPS-008",
    "ANNEX-107",
    "FRM-OPS-008",
    "FRM-PLA-001",
    "FRM-QA-007",
    "FRM-QA-002",
    "FRM-WHS-002",
    "SOP-QMS-006"
  ];
  const execShortcuts = execShortcutCodes.map(code=>VDOCS.find(d=>d.code===code)).filter(Boolean);

  el.innerHTML = `
    <div class="stats-row">
      <div class="stat-card" style="cursor:pointer;border-left:3px solid #059669" onclick="showFilteredDocs('recent')"><div class="value" style="color:#059669">${ruCount}</div><div class="label">${lang==='en'?'Updated (30d)':'Cập nhật (30d)'}</div><div class="sub">${lang==='en'?'Last 30 days':'30 ngày qua'}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('approved')"><div class="value" style="color:#2e7d32">${approvedCount}</div><div class="label">${T('approved')}</div><div class="sub">${T('effective')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('draft')"><div class="value" style="color:#f57f17">${draftCount}</div><div class="label">${T('draft')}</div><div class="sub">${T('editing')}</div></div>
      <div class="stat-card" style="cursor:pointer;${r.approve&&reviewCount>0?'border:2px solid #f59e0b':''}" onclick="showFilteredDocs('review')"><div class="value" style="color:#d97706">${reviewCount}</div><div class="label">${T('in_review_label')}</div><div class="sub">${r.approve&&reviewCount>0?T('click_review'):T('pending_waiting')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('accessible')"><div class="value" style="color:#6366f1">${accessibleDocs.length}</div><div class="label">${T('accessible')}</div><div class="sub">${T('by_role')} ${lang==='en'?(r.labelEn||r.label):r.label}</div></div>
    </div>
    <div id="dash-pending">${pendingHtml}${draftsHtml}</div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin-bottom:8px">🏭 ${lang==='en'?'Job Order Lifecycle — G0 → G7 (8 Gates)':'Vòng đời đơn hàng — G0 → G7 (8 cổng)'}</h3>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;overflow-x:auto;padding:4px 0 8px">
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #4CAF50;background:#f8fdf8;min-width:0"><div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px">G0</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Contract</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'RFQ, order entry':'Xem xét RFQ, nhập đơn'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-201');return false" style="color:#0369a1">SOP-201</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #1565C0;background:#f0f4ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#0d47a1;margin-bottom:3px">G1</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Engineering</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'DFM, CAM/NC, baseline':'DFM, CAM/NC, baseline'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-303');return false" style="color:#0369a1">SOP-303</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #795548;background:#faf6f3;min-width:0"><div style="font-weight:700;font-size:11px;color:#4e342e;margin-bottom:3px">G2</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">IQC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Receiving, incoming QC':'Nhận hàng, KT đầu vào'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('WI-701');return false" style="color:#0369a1">WI-701</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #2196F3;background:#f5f9ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#1565c0;margin-bottom:3px">G3</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Setup</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Program, machine setup':'CT, setup máy'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-504');return false" style="color:#0369a1">SOP-504</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #FF9800;background:#fffbf0;min-width:0"><div style="font-weight:700;font-size:11px;color:#e65100;margin-bottom:3px">G4</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">FAI</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'First article inspection':'Kiểm tra bài đầu tiên'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-302');return false" style="color:#0369a1">SOP-302</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #9C27B0;background:#fdf5ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#7b1fa2;margin-bottom:3px">G5</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">IPQC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'In-process QC, SPC':'KS trong quá trình'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-502');return false" style="color:#0369a1">SOP-502</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #00BCD4;background:#f0fdff;min-width:0"><div style="font-weight:700;font-size:11px;color:#00838f;margin-bottom:3px">G6</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Final QC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Final inspection, pack':'KT cuối, đóng gói'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #F44336;background:#fff5f5;min-width:0"><div style="font-weight:700;font-size:11px;color:#c62828;margin-bottom:3px">G7</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Ship</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Shipment, CoC':'Giao hàng, CoC'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a></div></div>
      </div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="card">
        <h3>👤 ${lang==='en'?'Quick Access by Role':'Truy cập nhanh theo vai trò'}</h3>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:12px">
          <div style="padding:8px 10px;border-left:3px solid #2196F3;border-radius:4px;background:#f5f9ff"><b>CNC Operator</b> — <a href="#" onclick="openDoc('SOP-502');return false" style="color:#0369a1">SOP-502</a> · <a href="#" onclick="openDoc('SOP-504');return false" style="color:#0369a1">SOP-504</a> · <a href="#" onclick="openDoc('WI-519');return false" style="color:#0369a1">WI-519</a></div>
          <div style="padding:8px 10px;border-left:3px solid #4CAF50;border-radius:4px;background:#f8fdf8"><b>QC Inspector</b> — <a href="#" onclick="openDoc('SOP-302');return false" style="color:#0369a1">SOP-302</a> · <a href="#" onclick="openDoc('SOP-604');return false" style="color:#0369a1">SOP-604</a> · <a href="#" onclick="openDoc('SOP-601');return false" style="color:#0369a1">SOP-601</a></div>
          <div style="padding:8px 10px;border-left:3px solid #FF9800;border-radius:4px;background:#fffbf0"><b>Team Leader / Foreman</b> — <a href="#" onclick="openDoc('WI-202');return false" style="color:#0369a1">WI-202</a> · <a href="#" onclick="openDoc('SOP-501');return false" style="color:#0369a1">SOP-501</a> · <a href="#" onclick="openDoc('SOP-606');return false" style="color:#0369a1">SOP-606</a></div>
          <div style="padding:8px 10px;border-left:3px solid #9C27B0;border-radius:4px;background:#fdf5ff"><b>Planner / Engineer</b> — <a href="#" onclick="openDoc('SOP-501');return false" style="color:#0369a1">SOP-501</a> · <a href="#" onclick="openDoc('SOP-303');return false" style="color:#0369a1">SOP-303</a> · <a href="#" onclick="openDoc('SOP-103');return false" style="color:#0369a1">SOP-103</a></div>
          <div style="padding:8px 10px;border-left:3px solid #0C2D48;border-radius:4px;background:#f0f4f8"><b>Manager / Director</b> — <a href="#" onclick="openDoc('SOP-902');return false" style="color:#0369a1">SOP-902</a> · <a href="#" onclick="openDoc('WI-901');return false" style="color:#0369a1">WI-901</a> · <a href="#" onclick="openDoc('ANNEX-122');return false" style="color:#0369a1">ANNEX-122</a></div>
          <div style="padding:8px 10px;border-left:3px solid #00BCD4;border-radius:4px;background:#f0fdff"><b>IT / QMS Admin</b> — <a href="#" onclick="openDoc('SOP-101');return false" style="color:#0369a1">SOP-101</a> · <a href="#" onclick="openDoc('SOP-104');return false" style="color:#0369a1">SOP-104</a> · <a href="#" onclick="openDoc('ANNEX-101');return false" style="color:#0369a1">ANNEX-101</a></div>
        </div>
      </div>
      <div class="card">
        <h3>📋 ${lang==='en'?'Key Documents & Matrices':'Tài liệu trọng yếu'}</h3>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-120')"><b>Authority Matrix</b><span style="color:#0369a1;font-size:11px">ANNEX-120 →</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-121')"><b>RACI Master</b><span style="color:#0369a1;font-size:11px">ANNEX-121 →</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-122')"><b>KPI Cascade Dictionary</b><span style="color:#0369a1;font-size:11px">ANNEX-122 →</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-123')"><b>Deputy / Backup Matrix</b><span style="color:#0369a1;font-size:11px">ANNEX-123 →</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('WI-201')"><b>Quality Gates & Hold Points</b><span style="color:#0369a1;font-size:11px">WI-201 →</span></div>
          <div style="padding:8px 10px;border:1px solid #fee2e2;border-left:3px solid #ef4444;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-118')"><b>⚠ Offline Fallback Kit</b><span style="color:#ef4444;font-size:11px">ANNEX-118 →</span></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>📊 ${lang==='en'?'Operational KPIs — ISO 9001:2026 §9.1':'KPI vận hành — ISO 9001:2026 §9.1'}</h3>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;font-size:12px">
        <div style="padding:10px;border:1px solid #dcfce7;border-radius:8px;background:#f0fdf4;text-align:center;min-width:0"><div style="font-size:10px;color:#166534;font-weight:600;text-transform:uppercase">OTD</div><div style="font-size:18px;font-weight:700;color:#16a34a;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'On-Time Delivery':'Giao hàng đúng hạn'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 95%</div></div>
        <div style="padding:10px;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;text-align:center;min-width:0"><div style="font-size:10px;color:#1e40af;font-weight:600;text-transform:uppercase">FPY</div><div style="font-size:18px;font-weight:700;color:#2563eb;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'First Pass Yield':'Tỷ lệ đạt lần đầu'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 98%</div></div>
        <div style="padding:10px;border:1px solid #fef3c7;border-radius:8px;background:#fffbeb;text-align:center;min-width:0"><div style="font-size:10px;color:var(--amber);font-weight:600;text-transform:uppercase">COPQ</div><div style="font-size:18px;font-weight:700;color:#d97706;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'Cost of Poor Quality':'Chi phí CL kém'}</div><div style="font-size:9px;color:#999;margin-top:2px">≤ 2%</div></div>
        <div style="padding:10px;border:1px solid #fee2e2;border-radius:8px;background:#fef2f2;text-align:center;min-width:0"><div style="font-size:10px;color:var(--red);font-weight:600;text-transform:uppercase">NCR</div><div style="font-size:18px;font-weight:700;color:#dc2626;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'Open NCRs':'NCR đang mở'}</div><div style="font-size:9px;color:#999;margin-top:2px">= 0</div></div>
        <div style="padding:10px;border:1px solid #f3e8ff;border-radius:8px;background:#faf5ff;text-align:center;min-width:0"><div style="font-size:10px;color:#6b21a8;font-weight:600;text-transform:uppercase">IQC Pass</div><div style="font-size:18px;font-weight:700;color:#7c3aed;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'IQC Pass Rate':'Tỷ lệ đạt IQC'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 99%</div></div>
        <div style="padding:10px;border:1px solid #e0f2fe;border-radius:8px;background:#f0f9ff;text-align:center;min-width:0"><div style="font-size:10px;color:#075985;font-weight:600;text-transform:uppercase">OEE</div><div style="font-size:18px;font-weight:700;color:#0284c7;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'Equipment Effectiveness':'Hiệu suất thiết bị'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 85%</div></div>
        <div style="padding:10px;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;text-align:center;min-width:0"><div style="font-size:10px;color:#1e3a5f;font-weight:600;text-transform:uppercase">ENG FTR</div><div style="font-size:18px;font-weight:700;color:#1565c0;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'Eng First-Time-Right':'KT đúng lần đầu'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 95%</div></div>
        <div style="padding:10px;border:1px solid #fce7f3;border-radius:8px;background:#fdf2f8;text-align:center;min-width:0"><div style="font-size:10px;color:#831843;font-weight:600;text-transform:uppercase">ECN Lead</div><div style="font-size:18px;font-weight:700;color:#be185d;margin:4px 0">—</div><div style="font-size:9px;color:#666">${lang==='en'?'Eng Change Lead':'TG thay đổi KT'}</div><div style="font-size:9px;color:#999;margin-top:2px">≤ 48h</div></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text-3);text-align:right"><a href="#" onclick="openDoc('ANNEX-122');return false" style="color:#0369a1">${lang==='en'?'Full KPI Dictionary':'Từ điển KPI đầy đủ'} → ANNEX-122</a> · <a href="#" onclick="openDoc('WI-901');return false" style="color:#0369a1">${lang==='en'?'Dashboard Guide':'Hướng dẫn Dashboard'} → WI-901</a></div>
    </div>
    `;
/* OLD DASHBOARD CODE REMOVED — see git history for reference */
}

var _lastDocRenderTarget = 'page-documents';
function renderDocuments(targetContainerId){
  if(targetContainerId) _lastDocRenderTarget = targetContainerId;
  const el = document.getElementById(_lastDocRenderTarget || 'page-documents');
  const VDOCS = getVisibleDocs();

  // ═══ Update header breadcrumb ═══
  updateDocBreadcrumb();

  // ═══ SEARCH MODE: flat list ═══
  if(searchQuery){
    const q = searchQuery.toLowerCase();
    const filtered = VDOCS.filter(d => d.code.toLowerCase().includes(q) || d.title.toLowerCase().includes(q));
    el.innerHTML = renderDocSearchBar(VDOCS) + renderDocFileList(filtered);
    return;
  }

  // ═══ ALL DOCS MODE: show category cards ═══
  if(currentFilter === 'ALL' && currentFolderPath.length === 0){
    el.innerHTML = renderDocSearchBar(VDOCS) + renderDocCategoryGrid(VDOCS);
    return;
  }

  // ═══ CATEGORY/FOLDER BROWSING MODE ═══
  const catDocs = currentFilter !== 'ALL' ? VDOCS.filter(d=>d.cat===currentFilter) : VDOCS;
  const treeNode = currentFilter !== 'ALL'
    ? ((typeof getCategoryTreeRoot === 'function' ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs))
    : null;
  const currentNode = currentFilter !== 'ALL' ? resolveTreeNodeForCategory(currentFilter, currentFolderPath, catDocs) : null;

  // Get child folders and docs at current level
  const childFolders = currentNode && currentNode.subs ? currentNode.subs.filter(s => s.num >= 1) : [];
  const currentPath = currentNode ? currentNode.path : (treeNode ? treeNode.path : '');
  const docsHere = catDocs.filter(d => (d.folder||'') === currentPath);

  // Toolbar - edit button always right-aligned, create buttons when in edit mode
  let toolbar = '';
  if(canCreateNewDoc()){
    toolbar = `<div class="fm-toolbar" style="justify-content:flex-end">
      ${folderEditMode ? `
        <button class="fm-btn primary" onclick="openCreateFolderDialog()">📁 ${lang==='en'?'New folder':'Tạo folder'}</button>
        <button class="fm-btn primary" onclick="openCreateDocModalQuick()">📄 ${lang==='en'?'New document':'Tạo tài liệu'}</button>
        <span style="font-size:11px;color:var(--text-3)">${lang==='en'?'Drag to move':'Kéo thả để di chuyển'}</span>
      ` : ''}
      <button class="fm-btn ${folderEditMode?'active':''}" onclick="folderEditMode=!folderEditMode;renderDocuments()">
        ${folderEditMode?'✕ '+(lang==='en'?'Exit':'Thoát'):'✏️ '+(lang==='en'?'Edit':'Chỉnh sửa')}
      </button>
    </div>`;
  }

  // Folder grid
  let folderHtml = '';
  if(childFolders.length > 0){
    folderHtml = `<div class="fm-grid">`;
    childFolders.forEach(sub => {
      const subKey = (sub.path||'').split('/').pop();
      const label = getSubfolderLabel(subKey);
      const allSubDocs = collectTreeDocsFromAPI(sub, catDocs);
      const accessible = allSubDocs.filter(d=>canAccessDoc(d.code)).length;
      const isLocked = accessible === 0 && allSubDocs.length > 0;
      const dropAttr = folderEditMode ? `ondragover="event.preventDefault();this.classList.add('drag-over')" ondragleave="this.classList.remove('drag-over')" ondrop="handleFileDrop(event,this,'${escapeHtml(sub.path)}')"` : '';
      folderHtml += `
        <div class="fm-folder ${isLocked?'locked':''}" onclick="${isLocked?'':`currentFolderPath.push('${escapeHtml(subKey)}');renderDocuments();renderSidebar()`}" ${dropAttr} data-folder-path="${escapeHtml(sub.path)}" oncontextmenu="event.preventDefault();event.stopPropagation();openFolderEditMenu(event,'${escapeHtml(sub.path)}','${escapeHtml(subKey)}')">
          ${folderEditMode?`<button class="fm-del-btn" onclick="event.stopPropagation();confirmDeleteFolder('${escapeHtml(sub.path)}','${escapeHtml(subKey)}')" title="${lang==='en'?'Delete folder':'Xóa folder'}">✕</button>`:''}
          <div class="fm-icon" style="position:relative">
            <div class="folder-tab"></div>
            <div class="folder-back"></div>
            <div class="folder-front"></div>
            <div class="folder-dept-icon">${getFolderIcon(subKey)}</div>
            ${allSubDocs.length>0?`<div class="folder-badge">${allSubDocs.length}</div>`:''}
          </div>
          <div class="fm-label">${label}</div>
          <div class="fm-desc">${getFolderDesc(sub.path) || (allSubDocs.length > 0 ? `${allSubDocs.length} ${lang==='en'?'docs':'tài liệu'}${isLocked?' 🔒':''}` : (lang==='en'?'Empty folder':'Thư mục trống'))}</div>
        </div>`;
    });
    folderHtml += `</div>`;
  }

  // File list
  let fileHtml = '';
  if(docsHere.length > 0){
    fileHtml = renderDocFileList(docsHere);
  }

  // Empty state
  if(childFolders.length === 0 && docsHere.length === 0){
    fileHtml = `<div class="fm-empty">${lang==='en'?'This folder is empty':'Thư mục này trống'}</div>`;
  }

  el.innerHTML = renderDocSearchBar(VDOCS) + toolbar + folderHtml + fileHtml;
}

// ═══ DYNAMIC HEADER BREADCRUMB ═══
function updateDocBreadcrumb(){
  const bcEl = document.getElementById('header-breadcrumb');
  if(!bcEl || currentPage !== 'documents') return;

  let html = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];renderDocuments();renderSidebar()">🏠</span>`;

  if(currentFilter !== 'ALL'){
    const cat = CATEGORIES.find(c=>c.id===currentFilter);
    html += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
    if(currentFolderPath.length > 0){
      html += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];renderDocuments()">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    } else {
      html += `<span style="font-weight:700;color:var(--text-1)">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    }
  }

  for(let i=0; i<currentFolderPath.length; i++){
    const seg = currentFolderPath[i];
    const label = getSubfolderLabel(seg);
    html += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
    if(i < currentFolderPath.length - 1){
      html += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});renderDocuments()">📁 ${label}</span>`;
    } else {
      html += `<span style="font-weight:700;color:var(--text-1)">📁 ${label}</span>`;
    }
  }

  bcEl.innerHTML = html;
  bcEl.style.display = 'flex';
  bcEl.style.alignItems = 'center';
  bcEl.style.gap = '0';
  bcEl.style.flex = '1';
}

// Helper: collect all docs recursively from API tree node
function collectTreeDocsFromAPI(apiNode, allDocs){
  let docs = allDocs.filter(d => (d.folder||'') === apiNode.path);
  if(apiNode.subs){
    apiNode.subs.forEach(sub => {
      docs = docs.concat(collectTreeDocsFromAPI(sub, allDocs));
    });
  }
  return docs;
}

// Render search bar + category filter chips
function renderDocSearchBar(VDOCS){
  return `
    <div class="filter-bar">
      <button class="filter-chip ${currentFilter==='ALL'?'active':''}" onclick="currentFilter='ALL';currentFolderPath=[];renderDocuments();renderSidebar()">${T('all')} (${VDOCS.length})</button>
      ${CATEGORIES.filter(c=>!c.hidden&&(VDOCS.some(d=>d.cat===c.id) || portalCategoryHasPhysicalTree(c.id))).map(cat =>
        `<button class="filter-chip ${currentFilter===cat.id?'active':''}" onclick="currentFilter='${cat.id}';currentFolderPath=[];renderDocuments();renderSidebar()">${cat.icon} ${catLabel(cat).split('(')[0].trim()} (${VDOCS.filter(d=>d.cat===cat.id).length})</button>`
      ).join('')}
    </div>
    <input class="search-box" type="text" placeholder="${T('search_docs_ph')}" value="${searchQuery}" oninput="searchQuery=this.value;renderDocuments()">`;
}

// Render ALL docs view as category folder cards
function renderDocCategoryGrid(VDOCS){
  let html = `<div class="fm-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:16px 0">`;
  CATEGORIES.filter(c=>!c.hidden&&(VDOCS.some(d=>d.cat===c.id) || portalCategoryHasPhysicalTree(c.id))).forEach(cat => {
    const cnt = VDOCS.filter(d=>d.cat===cat.id).length;
    html += `
      <div class="fm-folder" onclick="currentFilter='${cat.id}';currentFolderPath=[];renderDocuments();renderSidebar()" style="padding:20px 14px">
        <div style="width:52px;height:52px;border-radius:16px;display:flex;align-items:center;justify-content:center;background:${cat.color};color:#fff;font-size:24px;box-shadow:0 4px 12px ${cat.color}33">${cat.icon}</div>
        <div class="fm-label" style="font-size:14px;margin-top:4px">${catLabel(cat).split('(')[0].trim()}</div>
        <div class="fm-count">${cnt} ${lang==='en'?'docs':'tài liệu'}</div>
      </div>`;
  });
  html += `</div>`;
  return html;
}

// Render flat file list (for search results or leaf folder docs)
function renderDocFileList(docs){
  if(docs.length === 0) return `<div class="fm-empty">${T('no_docs')}</div>`;
  let html = `<div class="fm-files">
    <div class="fm-header-row">
      <span></span><span>${lang==='en'?'Document code / Standard title':'Mã tài liệu / Tên file chuẩn'}</span><span>${T('rev')}</span><span>${T('status')}</span><span>${T('access')}</span>
    </div>`;
  docs.forEach(doc => {
    const cat = getCatForDoc(doc);
    const locked = !canAccessDoc(doc.code);
    const dragAttr = folderEditMode ? `draggable="true" ondragstart="handleFileDragStart(event,'${escapeHtml(doc.code)}')"` : '';
    const displayTitle = getDocDisplayTitle(doc);
    const displayDesc = getDocDisplayDescription(doc);
    html += `
      <div class="fm-file-row ${locked?'locked':''}" ${locked?'':`onclick="openDoc('${doc.code}')"`} ${dragAttr} oncontextmenu="event.preventDefault();event.stopPropagation();openDocEditMenu(event,'${escapeHtml(doc.code)}')" data-doc-code="${doc.code}">
        <div class="fm-file-icon" style="border-color:${cat?cat.color:'#a5b4fc'}">${getDocIcon(doc.code)}</div>
        <div class="fm-file-name">
          <span style="color:${cat?cat.color:'#64748b'}">${doc.code}</span>
          <small>${displayTitle}</small>
          ${displayDesc?`<small class="fm-doc-desc">${displayDesc}</small>`:''}
        </div>
        <div class="fm-file-rev">v${getDocRevision(doc)}</div>
        <div class="fm-file-status"><span style="padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${statusColor(getDocStatus(doc))}15;color:${statusColor(getDocStatus(doc))}">${statusLabel(getDocStatus(doc))}</span></div>
        <div class="fm-file-access">${locked?'<span style="color:var(--red)">🔒</span>':'<span style="color:var(--green)">✓</span>'}</div>
        ${folderEditMode&&canCreateNewDoc()?`<div class="fm-file-del"><button class="fm-del-btn-row" onclick="event.stopPropagation();confirmDeleteDoc('${escapeHtml(doc.code)}','${escapeHtml(displayTitle)}')" title="${lang==='en'?'Delete':'Xóa'}">🗑️</button></div>`:''}
      </div>`;
  });
  html += `</div>`;
  return html;
}

// ═══ EDIT MODE: Folder creation dialog ═══
function openCreateFolderDialog(){
  // Auto-compute next folder number
  const catDocs = DOCS.filter(d=>d.cat===currentFilter);
  const treeNode = ((typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs);
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, catDocs);
  // Find max existing number in current folder
  let maxNum = 0;
  if(currentNode && currentNode.subs){
    currentNode.subs.forEach(s => { if(s.num > maxNum) maxNum = s.num; });
  }
  const nextNum = maxNum + 1;

  const parentPath = currentNode ? currentNode.path : (treeNode ? treeNode.path : currentFilter);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'folder-create-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:440px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-weight:700;font-size:16px">📁 ${lang==='en'?'Create New Folder':'Tạo Folder Mới'}</div>
        <button class="btn-admin secondary" onclick="document.getElementById('folder-create-modal')?.remove()">✕</button>
      </div>
      <div class="modal-field">
        <label>${lang==='en'?'Folder name':'Tên folder'}</label>
        <input id="nf-name" type="text" placeholder="VD: PROC-NEW, Templates" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px" autofocus>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text-3)">
        📂 ${lang==='en'?'Will create':'Sẽ tạo'}: <code>${parentPath}/<b>${String(nextNum).padStart(2,'0')}</b>-<span id="nf-preview">???</span>/</code>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-admin secondary" onclick="document.getElementById('folder-create-modal')?.remove()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="doCreateFolder(${nextNum})">📁 ${lang==='en'?'Create':'Tạo'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  const nameEl=document.getElementById('nf-name'), prevEl=document.getElementById('nf-preview');
  nameEl.addEventListener('input', ()=>{ prevEl.textContent=nameEl.value||'???'; });
}

async function doCreateFolder(nextNum){
  const name = (document.getElementById('nf-name')?.value||'').trim().replace(/[^A-Za-z0-9_-]/g,'-');
  if(!name){ showToast(lang==='en'?'Enter folder name':'Nhập tên folder'); return; }
  const folderName = String(nextNum).padStart(2,'0') + '-' + name;
  const catDocs = DOCS.filter(d=>d.cat===currentFilter);
  const treeNode = ((typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs);
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, catDocs);
  const parentPath = currentNode ? currentNode.path : (treeNode ? treeNode.path : '');
  try {
    const res = await apiCall('create_folder', {parent: parentPath, name: folderName});
    if(res && res.ok){
      showToast('✅ ' + (lang==='en'?'Folder created':'Đã tạo folder'));
      document.getElementById('folder-create-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 Error: ' + e.message); }
}

// ═══ QUICK CREATE DOC — defaults to current folder ═══
function openCreateDocModalQuick(){
  // Compute current folder path
  const catDocs = DOCS.filter(d=>d.cat===currentFilter);
  const treeNode = ((typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs);
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, catDocs);
  const folderPath = currentNode ? currentNode.path : (treeNode ? treeNode.path : '');
  const folderLabel = currentNode ? getSubfolderLabel((currentNode.path||'').split('/').pop()) : currentFilter;

  // Owner dropdown options
  const ownerOpts = [
    {v:'QA/QMS'},{v:'Production'},{v:'Engineering'},{v:'QA/QC'},{v:'OPS'},
    {v:'Planning'},{v:'Purchasing'},{v:'Sales'},{v:'Warehouse'},
    {v:'Maintenance'},{v:'Finance'},{v:'HR'},{v:'HSE'},{v:'IT'},
    {v:'Executive'},{v:'Multi'},
  ];
  const ownerDept = currentUser?.dept || 'QA/QMS';

  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'quick-create-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:480px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <div style="font-weight:700;font-size:16px">📄 ${lang==='en'?'Create New Document':'Tạo Tài Liệu Mới'}</div>
        <button class="btn-admin secondary" onclick="document.getElementById('quick-create-modal')?.remove()">✕</button>
      </div>
      <div style="margin-bottom:10px;padding:8px 12px;background:var(--bg-2);border-radius:8px;font-size:12px">
        📂 ${lang==='en'?'Folder':'Folder'}: <b>${folderPath}/</b>
      </div>
      <div class="modal-field">
        <label>${lang==='en'?'Document code':'Mã tài liệu'}</label>
        <input id="qc-code" type="text" placeholder="VD: PROC-CNC-003" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px" autofocus>
      </div>
      <div class="modal-field" style="margin-top:8px">
        <label>${lang==='en'?'English standard title / file name':'Tên file / tiêu đề chuẩn'}</label>
        <input id="qc-title" type="text" placeholder="${lang==='en'?'English standard title':'Tên file / tiêu đề chuẩn tiếng Anh'}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px">
      </div>
      <div class="modal-field" style="margin-top:8px">
        <label>${lang==='en'?'Owner':'Chủ sở hữu'}</label>
        <select id="qc-owner" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px">
          ${ownerOpts.map(o=>`<option value="${o.v}" ${o.v===ownerDept?'selected':''}>${o.v}</option>`).join('')}
        </select>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-admin secondary" onclick="document.getElementById('quick-create-modal')?.remove()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="doQuickCreateDoc('${escapeHtml(folderPath)}','${escapeHtml(currentFilter)}')">📄 ${lang==='en'?'Create':'Tạo'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

async function doQuickCreateDoc(folder, cat){
  const code = (document.getElementById('qc-code')?.value||'').trim();
  const title = (document.getElementById('qc-title')?.value||'').trim();
  const owner = (document.getElementById('qc-owner')?.value||'').trim();
  if(!code){ showToast(lang==='en'?'Enter doc code':'Nhập mã tài liệu'); return; }
  if(!title){ showToast(lang==='en'?'Enter title':'Nhập tiêu đề'); return; }
  if(!ensureEnglishStandardTitle(title)) return;
  try {
    const res = await controlPlaneDocumentAuthoringRequest('create', {code, title, cat, owner, folder, revision:'0.0'}, 'POST', 300000);
    if(res && res.ok){
      showToast('✅ ' + code);
      document.getElementById('quick-create-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}

// ═══ DRAG & DROP ═══
let draggedDocCode = null;
function handleFileDragStart(event, code){
  draggedDocCode = code;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', code);
  event.target.closest('.fm-file-row')?.classList.add('dragging');
}

async function handleFileDrop(event, folderEl, targetFolderPath){
  event.preventDefault();
  folderEl.classList.remove('drag-over');
  const code = event.dataTransfer.getData('text/plain') || draggedDocCode;
  if(!code) return;
  draggedDocCode = null;
  try {
    const res = await apiCall('move_doc', {code, target_folder: targetFolderPath});
    if(res && res.ok){
      showToast(`✅ ${code} → ${getSubfolderLabel(targetFolderPath.split('/').pop())}`);
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Move failed'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}



// ═══════════════════════════════════════════════════
// FOLDER CONTEXT MENU (rename, edit description)
// ═══════════════════════════════════════════════════
function openFolderEditMenu(event, folderPath, folderKey){
  event.stopPropagation();
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const menu = document.createElement('div');
  menu.className = 'fm-context-menu';
  menu.style.cssText = `position:fixed;top:${event.clientY}px;left:${event.clientX}px;z-index:9999;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:6px 0;min-width:180px`;
  const vi=lang!=='en';
  menu.innerHTML = `
    <div class="ctx-item" onclick="openFolderEditDialog('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">✏️ ${vi?'Chỉnh sửa folder':'Edit folder'}</div>
    ${canCreateNewDoc()?`<div class="ctx-item ctx-danger" onclick="confirmDeleteFolder('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">🗑️ ${vi?'Xóa folder':'Delete folder'}</div>`:''}
  `;
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-item').forEach(item=>{
    const isDanger=item.classList.contains('ctx-danger');
    item.style.cssText = 'padding:8px 16px;cursor:pointer;font-size:13px;transition:background .1s'+(isDanger?';color:#dc2626':'');
    item.onmouseenter = ()=>item.style.background=isDanger?'#fef2f2':'var(--bg-2)';
    item.onmouseleave = ()=>item.style.background='transparent';
  });
  const close = (e)=>{ if(!menu.contains(e.target)){menu.remove();document.removeEventListener('click',close);} };
  setTimeout(()=>document.addEventListener('click', close), 10);
}

function openDocEditMenu(event, code){
  event.stopPropagation();
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const doc = DOCS.find(d=>d.code===code) || {};
  const standardTitle = getDocStandardTitle(doc) || String(doc.title || '').trim() || code;
  const menu = document.createElement('div');
  menu.className = 'fm-context-menu';
  menu.style.cssText = `position:fixed;top:${event.clientY}px;left:${event.clientX}px;z-index:9999;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:6px 0;min-width:180px`;
  const vi=lang!=='en';
  menu.innerHTML = `
    <div class="ctx-item" onclick="openDoc('${escapeHtml(code)}')">📄 ${vi?'Mở tài liệu':'Open document'}</div>
    <div class="ctx-item" onclick="openDocEditDialog('${escapeHtml(code)}')">✏️ ${vi?'Chỉnh sửa thông tin':'Edit info'}</div>
    ${canCreateNewDoc()?`<div style="border-top:1px solid #f1f3f5;margin:4px 0"></div><div class="ctx-item ctx-danger" onclick="confirmDeleteDoc('${escapeHtml(code)}','${escapeHtml(standardTitle)}')">🗑️ ${vi?'Xóa tài liệu':'Delete document'}</div>`:''}
  `;
  document.body.appendChild(menu);
  menu.querySelectorAll('.ctx-item').forEach(item=>{
    const isDanger=item.classList.contains('ctx-danger');
    item.style.cssText = 'padding:8px 16px;cursor:pointer;font-size:13px;transition:background .1s'+(isDanger?';color:#dc2626':'');
    item.onmouseenter = ()=>item.style.background=isDanger?'#fef2f2':'var(--bg-2)';
    item.onmouseleave = ()=>item.style.background='transparent';
  });
  const close = (e)=>{ if(!menu.contains(e.target)){menu.remove();document.removeEventListener('click',close);} };
  setTimeout(()=>document.addEventListener('click', close), 10);
}

// ═══ UNIFIED FOLDER EDIT DIALOG (name + desc + icon) ═══
function openFolderEditDialog(folderPath, folderKey){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const label = getSubfolderLabel(folderKey);
  const numPrefix = folderKey.match(/^(\d{2})-/) ? folderKey.match(/^(\d{2})-/)[1] + '-' : '';
  const currentName = folderKey.replace(/^\d{2}-/, '');
  const desc = getFolderDesc(folderPath);
  const curIcon = getFolderIcon(folderKey);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'folder-edit-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <div class="modal-title">✏️ ${lang==='en'?'Edit Folder':'Chỉnh Sửa Folder'}</div>
        <button class="icon-btn" onclick="document.getElementById('folder-edit-modal')?.remove()">✕</button>
      </div>
      <div class="modal-body">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">📂 ${escapeHtml(folderPath)}</div>

        <div class="modal-grid-2">
          <div class="modal-field" style="flex:1">
            <label>${lang==='en'?'Folder name':'Tên folder'} (${numPrefix}...)</label>
            <input id="fe-name" type="text" value="${escapeHtml(currentName)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" autofocus>
            <div style="font-size:10px;color:var(--text-3);margin-top:2px">${lang==='en'?'Preview':'Xem trước'}: <code>${numPrefix}<span id="fe-preview">${escapeHtml(currentName)}</span></code></div>
          </div>
          <div class="modal-field" style="width:80px">
            <label>${lang==='en'?'Icon':'Biểu tượng'}</label>
            <button id="fe-icon-btn" onclick="showIconPickerInline('folder','${escapeHtml(folderKey)}','fe-icon-btn')" 
              style="width:60px;height:48px;font-size:28px;border:1.5px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s"
              onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'"
            >${curIcon}</button>
          </div>
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'Description / Notes':'Ghi chú / Mô tả'}</label>
          <textarea id="fe-desc" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;font-size:13px" placeholder="${lang==='en'?'Brief description':'Mô tả ngắn'}">${escapeHtml(desc)}</textarea>
        </div>

        <div style="margin-top:8px;font-size:10px;color:var(--text-3)">⚠️ ${lang==='en'?'Renaming updates all internal links automatically':'Đổi tên sẽ cập nhật tất cả liên kết nội bộ tự động'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" onclick="document.getElementById('folder-edit-modal')?.remove()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="doSaveFolderEdit('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">💾 ${lang==='en'?'Save':'Lưu'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  const inp = document.getElementById('fe-name');
  inp.addEventListener('input', ()=>{ document.getElementById('fe-preview').textContent = inp.value || '???'; });
  inp.select();
}

async function doSaveFolderEdit(folderPath, folderKey){
  const newName = (document.getElementById('fe-name')?.value||'').trim();
  const desc = (document.getElementById('fe-desc')?.value||'').trim();
  const currentName = folderKey.replace(/^\d{2}-/, '');

  // Save description
  await saveFolderDesc(folderPath, desc);

  // Rename if changed
  if(newName && newName !== currentName){
    try {
      const res = await apiCall('rename_folder', {old_path: folderPath, new_name: newName});
      if(res && res.ok){
        showToast(`✅ ${lang==='en'?'Saved':'Đã lưu'} (${res.updated_files} ${lang==='en'?'files':'tệp'})`);
        document.getElementById('folder-edit-modal')?.remove();
        await rescanDocs();
        await loadFolderDescriptions();
        renderDocuments(); renderSidebar();
        return;
      } else {
        showToast('\u26A0 ' + (res?.detail || res?.error || 'Rename error'));
      }
    } catch(e){ showToast('\u26A0 ' + e.message); }
  } else {
    showToast('✅ '+(lang==='en'?'Saved':'Đã lưu'));
  }
  document.getElementById('folder-edit-modal')?.remove();
  renderDocuments(); renderSidebar();
}

// ═══ UNIFIED DOC EDIT DIALOG (code + title + desc) ═══
function titleHasNonAsciiChars(text){
  return /[^\x20-\x7E]/.test(String(text||''));
}

function ensureEnglishStandardTitle(title){
  const value = String(title || '').trim();
  if(!value){
    showToast(lang==='en'?'⚠ Missing standard title':'⚠ Thiếu tên file chuẩn');
    return false;
  }
  if(titleHasNonAsciiChars(value)){
    showToast(lang==='en'?'⚠ Standard title must be English (ASCII only)':'⚠ Tên file chuẩn phải là tiếng Anh (ASCII)');
    return false;
  }
  if(!/[A-Za-z]/.test(value)){
    showToast(lang==='en'?'⚠ Invalid standard title':'⚠ Tên file chuẩn không hợp lệ');
    return false;
  }
  return true;
}

function openDocEditDialog(code){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const doc = DOCS.find(d=>d.code===code) || {};
  const standardTitle = getDocStandardTitle(doc) || String(doc.title || '').trim() || code;
  const desc = String(getDocDesc(code) || getDocDisplayDescription(doc) || '').trim();
  const curIcon = getDocIcon(code);
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'doc-edit-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div class="modal-header">
        <div class="modal-title">✏️ ${lang==='en'?'Edit Document':'Chỉnh Sửa Tài Liệu'}</div>
        <button class="icon-btn" onclick="document.getElementById('doc-edit-modal')?.remove()">✕</button>
      </div>
      <div class="modal-body">
        <div class="modal-grid-2">
          <div class="modal-field" style="flex:1">
            <label>${lang==='en'?'Document code':'Mã tài liệu'}</label>
            <input id="de-code" type="text" value="${escapeHtml(code)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-weight:600">
          </div>
          <div class="modal-field" style="width:80px">
            <label>${lang==='en'?'Icon':'Biểu tượng'}</label>
            <button id="de-icon-btn" onclick="showIconPickerInline('doc','${escapeHtml(code)}','de-icon-btn')" 
              style="width:60px;height:48px;font-size:28px;border:1.5px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"
            >${curIcon}</button>
          </div>
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'English standard title / file name':'Tên file / tiêu đề chuẩn'}</label>
          <input id="de-title" data-original="${escapeHtml(standardTitle)}" type="text" value="${escapeHtml(standardTitle)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'Vietnamese description':'Mô tả tiếng Việt'}</label>
          <textarea id="de-desc" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;font-size:13px" placeholder="${lang==='en'?'Brief Vietnamese description':'Mô tả ngắn bằng tiếng Việt'}">${escapeHtml(desc)}</textarea>
        </div>

        <div style="margin-top:8px;font-size:10px;color:var(--text-3)">⚠️ ${lang==='en'?'Document code + English standard title are SSOT for filename and header title. Vietnamese description syncs to the header note.':'Mã tài liệu + tên file / tiêu đề chuẩn là SSOT cho filename và title header. Mô tả tiếng Việt đồng bộ vào ghi chú trên header.'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" onclick="document.getElementById('doc-edit-modal')?.remove()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="doSaveDocEdit('${escapeHtml(code)}')">💾 ${lang==='en'?'Save':'Lưu'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

/**
 * Normalise a user-entered document code for the DCC control plane.
 * Strips redundant title suffixes so "QMS-MAN-001-QMS-MANUAL" becomes
 * "QMS-MAN-001", "POL-QMS-001-QUALITY-POLICY" becomes "POL-QMS-001", etc.
 *
 * Mirrors DocumentControlService::canonicalizeCode() and the backend's
 * scan_extract_code(). Uses the SAME specific patterns as
 * deriveDocCodeFromPath() in 01-data-config.js — numeric-tail families stop
 * at the first digit group, alpha-only families keep their whole slug.
 *
 * Previous implementation used a greedy `-[A-Z0-9]+(?:-[A-Z0-9]+)?` which
 * mis-parsed "QMS-MAN-001-QMS-MANUAL" as "QMS-MAN-001-QMS" because the first
 * `[A-Z0-9]+` ate only "001" before the optional group captured "-QMS".
 */
function canonicalizeDocCode(raw){
  var clean = String(raw || '').toUpperCase().trim();
  if(!clean) return '';
  // Strip any filename extension a paste might include
  clean = clean.replace(/\.[A-Z0-9]+$/i, '');
  var patterns = [
    /^(SOP-\d{3})/,
    /^(FRM-\d{3})/,
    /^(WI-\d{3})/,
    /^(ANNEX-\d{3})/,
    /^(REF-\d{3})/,
    /^(QMS-MAN-\d+)/,
    /^(QMS-GDL-\d+)/,
    /^(POL-QMS-\d+)/,
    /^(FRM-HR-JD-[A-Z]+-\d+)/,
    /^(FRM-HR-TRN-\d+)/,
    /^(ANNEX-DEP-[A-Z]+-\d+)/,
    /^(ANNEX-(?:JOB|ORG)-\d+)/,
    /^(ANNEX-HR-LAB-\d+)/,
    /^((?:SOP|PROC|WI|FRM|ANNEX|POL|QMS|DEPT)-[A-Z]+-\d+)/,
    /^(JD-[A-Z0-9-]+)/,
    /^(DEPT-[A-Z0-9-]+)/,
    /^(RACI-[A-Z0-9-]+)/,
    /^(AUTHORITY-[A-Z0-9-]+)/
  ];
  for(var i=0;i<patterns.length;i++){
    var m = clean.match(patterns[i]);
    if(m && m[1]) return m[1];
  }
  // Fallback: sanitise and cap at 40 chars
  return clean.replace(/[^A-Z0-9-]+/g, '-').replace(/-+/g, '-').replace(/^-+|-+$/g, '').slice(0, 40);
}

async function doSaveDocEdit(oldCode){
  var newCodeRaw = (document.getElementById('de-code')?.value||'').trim();
  var newCode = canonicalizeDocCode(newCodeRaw);
  const titleEl = document.getElementById('de-title');
  const newTitle = (titleEl?.value||'').trim();
  const originalTitle = (titleEl?.dataset?.original||'').trim();
  const desc = (document.getElementById('de-desc')?.value||'').trim();
  const currentDocMeta = DOCS.find(d=>d.code===oldCode) || {};
  const originalDesc = String(getDocDesc(oldCode) || getDocDisplayDescription(currentDocMeta) || '').trim();
  if(!newCode){
    showToast(lang==='en'?'⚠ Missing document code':'⚠ Thiếu mã tài liệu');
    return;
  }
  if(!ensureEnglishStandardTitle(newTitle)) return;

  const codeChanged = newCode !== oldCode;
  const titleChanged = newTitle !== originalTitle;
  const descChanged = desc !== originalDesc;

  // The portal DOCS registry sometimes stores the filename-derived long
  // code (e.g. "QMS-MAN-001-QMS-MANUAL") while the backend scan cache is
  // keyed on the canonical short form (e.g. "QMS-MAN-001"). Resolve to the
  // backend's canonical key first: prefer __rawCode when present, otherwise
  // fall back to the DOCS.code, and always send the file path for unambiguous
  // identification.
  const backendCode = String(currentDocMeta.__rawCode || currentDocMeta.code || oldCode);
  const backendPath = String(currentDocMeta.path || '');

  // Rename file + sync header title when code, standard title, or header note changes
  if(codeChanged || titleChanged || descChanged){
    try {
      const res = await apiCall('rename_doc', {
        old_code: backendCode,
        old_path: backendPath,
        path: backendPath,
        code: backendCode,
        new_code: newCode,
        new_title: newTitle,
        new_desc: desc
      });
      if(res && res.ok){
        // Mirror the edit into the DCC control plane (dcc_document_header)
        // so the portal header renderer sees the authoritative data.
        // The CSRF middleware enforces a token on every state-changing call,
        // so we attach the same header that apiCall() sends above.
        try {
          // Defensive: re-canonicalize before upsert. If the user pasted a
          // long filename-derived code, the canonical form is what the DB
          // should be keyed on so repeated saves stay idempotent and don't
          // spawn duplicate rows like QMS-MAN-001 + QMS-MAN-0012.
          var dccCode = canonicalizeDocCode(newCode);
          var dccHeaders = {'Content-Type': 'application/json', 'Accept': 'application/json'};
          if (window.csrfToken) dccHeaders['X-CSRF-Token'] = window.csrfToken;
          var dccRes = await fetch('/api/v1/dcc/documents/upsert', {
            method: 'POST',
            credentials: 'same-origin',
            headers: dccHeaders,
            body: JSON.stringify({
              doc_code:     dccCode,
              old_doc_code: canonicalizeDocCode(backendCode) || null,
              title:        newTitle || dccCode,
              subtitle:     desc || null
            })
          });
          if (!dccRes.ok) {
            var dccErrBody = await dccRes.text().catch(function(){ return ''; });
            console.warn('[DCC] upsert HTTP ' + dccRes.status + ':', dccErrBody);
          } else {
            try { console.info('[DCC] upsert ok', dccCode); } catch(e){}
          }
        } catch(dccErr){
          console.warn('[DCC] upsert failed (non-fatal):', dccErr);
        }

        showToast(`✅ ${lang==='en'?'Saved':'Đã lưu'}`);
        document.getElementById('doc-edit-modal')?.remove();
        // Force a DB-side overlay refresh before the UI repaints so the
        // listing card + breadcrumb pick up the new subtitle from DCC.
        try {
          if (typeof window.refreshDccOverlayFromServer === 'function') {
            await window.refreshDccOverlayFromServer({refreshUi: false});
          }
        } catch(e){}
        await rescanDocs(); renderDocuments(); renderSidebar();
        if(currentDoc && (currentDoc===oldCode || currentDoc===newCode)){
          try{ await openDocPreview(newCode || oldCode, {allowFromCode: oldCode}); }catch(e){}
        }
        return;
      } else {
        showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
      }
    } catch(e){ showToast('\u26A0 ' + e.message); }
  } else {
    showToast('✅ '+(lang==='en'?'Saved':'Đã lưu'));
  }
  document.getElementById('doc-edit-modal')?.remove();
  renderDocuments();
}

// ═══ INLINE ICON PICKER (opens in modal context) ═══
function showIconPickerInline(targetType, targetId, btnId){
  // Remove existing picker
  document.querySelectorAll('.icon-picker-inline').forEach(p=>p.remove());
  const btn = document.getElementById(btnId);
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  
  const catLabels={docs:'📄 Tài liệu',folders:'📁 Thư mục',departments:'🏢 Phòng ban',tools:'🔧 Công cụ',industry:'🏭 Ngành',objects:'🎪 Đối tượng',symbols:'✨ Biểu tượng',nature:'🌍 Tự nhiên',flags:'🏳️ Cờ',food:'🍜 Ẩm thực',hands:'🤝 Biểu cảm'};
  let gridHtml='';
  Object.entries(ICON_LIBRARY).forEach(([catKey,icons])=>{
    gridHtml+=`<div style="margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;color:#6b7280;margin-bottom:4px">${catLabels[catKey]||catKey}</div>
      <div style="display:flex;flex-wrap:wrap;gap:2px">
        ${icons.map(ic=>`<button onclick="applyIconInline('${targetType}','${escapeHtml(targetId)}','${ic.icon}','${btnId}')" title="${ic.label}"
          style="width:32px;height:32px;border-radius:6px;border:1px solid #e5e7eb;background:#fff;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;padding:0"
          onmouseenter="this.style.background='#eff6ff';this.style.borderColor='#60a5fa'" onmouseleave="this.style.background='#fff';this.style.borderColor='#e5e7eb'"
        >${ic.icon}</button>`).join('')}
      </div>
    </div>`;
  });
  // Add reset option
  gridHtml += `<div style="text-align:center;margin-top:4px">
    <a href="#" onclick="event.preventDefault();applyIconInline('${targetType}','${escapeHtml(targetId)}','','${btnId}')" style="font-size:11px;color:#dc2626">${lang==='en'?'Reset to default':'Đặt lại mặc định'}</a>
  </div>`;
  
  const picker = document.createElement('div');
  picker.className = 'icon-picker-inline';
  picker.style.cssText = `position:fixed;top:${Math.min(rect.bottom+4, window.innerHeight-420)}px;left:${Math.min(rect.left, window.innerWidth-380)}px;z-index:10000;background:#fff;border:1px solid #d1d5db;border-radius:12px;box-shadow:0 12px 40px rgba(0,0,0,.18);padding:12px;width:360px;max-height:400px;overflow-y:auto`;
  picker.innerHTML = gridHtml;
  document.body.appendChild(picker);
  
  const close = (e)=>{ if(!picker.contains(e.target) && e.target !== btn){picker.remove();document.removeEventListener('mousedown',close);} };
  setTimeout(()=>document.addEventListener('mousedown', close), 10);
}

function applyIconInline(type, id, icon, btnId){
  if(icon){
    CUSTOM_ICONS[type+':'+id] = icon;
  } else {
    delete CUSTOM_ICONS[type+':'+id];
    icon = type==='folder' ? getFolderIcon(id) : getDocIcon(id);
  }
  saveCustomIcons();
  const btn = document.getElementById(btnId);
  if(btn) btn.textContent = icon;
  document.querySelectorAll('.icon-picker-inline').forEach(p=>p.remove());
}

// Keep legacy functions as wrappers
function openFolderContextMenu(event, folderPath, folderKey){ openFolderEditMenu(event, folderPath, folderKey); }

// ═══ DELETE DOCUMENT — double confirmation + archive ═══
function confirmDeleteDoc(code, title){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const vi=lang!=='en';
  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.id='delete-confirm-modal';
  modal.innerHTML=`
    <div class="modal" style="max-width:460px">
      <div class="modal-header" style="background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));border-bottom:1px solid color-mix(in srgb, var(--red) 24%, var(--border))">
        <h3 style="color:var(--red);font-size:16px;display:flex;align-items:center;gap:8px">🗑️ ${vi?'Xóa tài liệu':'Delete Document'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">✕</button>
      </div>
      <div style="padding:20px">
        <div style="background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 24%, var(--border));border-radius:8px;padding:12px;margin-bottom:16px;display:flex;gap:10px;align-items:start">
          <span style="font-size:20px;flex-shrink:0">⚠️</span>
          <div style="font-size:13px;color:var(--amber);line-height:1.5">
            ${vi?'Bạn đang xóa tài liệu:':'You are about to delete:'}
            <div style="margin-top:6px;font-weight:700;color:var(--text-primary)">${code} — ${title||'(untitled)'}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--text-secondary)">${vi?'Tài liệu sẽ được chuyển vào thư mục <b>_Deleted</b> và có thể khôi phục bởi Admin.':'The document will be moved to <b>_Deleted</b> folder and can be recovered by Admin.'}</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'Tôi xác nhận muốn xóa tài liệu này':'I confirm I want to delete this document'}
          </label>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Hủy':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:var(--red);color:var(--text-inverse,#fff);opacity:.5;cursor:not-allowed" onclick="executeDeleteDoc('${escapeHtml(code)}')">🗑️ ${vi?'Xóa vĩnh viễn':'Delete'}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});
  document.getElementById('del-confirm-check').addEventListener('change',function(){
    const btn=document.getElementById('del-confirm-btn');
    btn.disabled=!this.checked;
    btn.style.opacity=this.checked?'1':'.5';
    btn.style.cursor=this.checked?'pointer':'not-allowed';
  });
}

async function executeDeleteDoc(code){
  const vi=lang!=='en';
  try{
    const res=await apiCall('delete_doc',{code});
    if(res&&res.ok){
      showToast('✅ '+(vi?'Đã xóa tài liệu '+code:'Deleted document '+code));
      document.getElementById('delete-confirm-modal')?.remove();
      // Close doc viewer if this doc is open
      if(typeof closeDocViewerForce==='function')closeDocViewerForce();
      await rescanDocs();
      renderDocuments();
      renderSidebar();
    }else{
      const errMap={
        'doc_not_found':vi?'Không tìm thấy tài liệu':'Document not found',
        'forbidden':vi?'Bạn không có quyền xóa':'Permission denied',
        'move_failed':vi?'Không thể di chuyển file':'Failed to move file',
        'delete_failed':vi?'Xóa tài liệu thất bại trên server':'Document delete failed on server',
        'server_error':vi?'Lỗi server khi xóa tài liệu':'Server error while deleting document'
      };
      showToast('\u26A0 '+(errMap[res?.error]||res?.error||'Error'));
    }
  }catch(e){
    showToast('\u26A0 Error: '+e.message);
  }
}

// ═══ DELETE FOLDER — double confirmation + archive ═══
function confirmDeleteFolder(folderPath, folderKey){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const vi=lang!=='en';
  const label=getSubfolderLabel(folderKey);
  // Count docs in this folder from tree
  const catDocs = DOCS.filter(d=>d.cat===currentFilter);
  const treeNode=((typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs);
  let targetNode=null;
  function findNode(node,path){
    if(node.path===path)return node;
    if(node.subs)for(const s of node.subs){const r=findNode(s,path);if(r)return r;}
    return null;
  }
  if(treeNode)targetNode=findNode(treeNode,folderPath);
  // Also search in all tree nodes
  if(!targetNode)for(const tn of FOLDER_TREE){targetNode=findNode(tn,folderPath);if(targetNode)break;}
  const fileCount=targetNode?targetNode.fileCount:0;
  const subCount=targetNode&&targetNode.subs?targetNode.subs.length:0;

  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.id='delete-confirm-modal';
  modal.innerHTML=`
    <div class="modal" style="max-width:480px">
      <div class="modal-header" style="background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));border-bottom:1px solid color-mix(in srgb, var(--red) 24%, var(--border))">
        <h3 style="color:var(--red);font-size:16px;display:flex;align-items:center;gap:8px">🗑️ ${vi?'Xóa folder':'Delete Folder'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">✕</button>
      </div>
      <div style="padding:20px">
        <div style="background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 24%, var(--border));border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="display:flex;gap:10px;align-items:start">
            <span style="font-size:20px;flex-shrink:0">⚠️</span>
            <div style="font-size:13px;color:var(--amber);line-height:1.5">
              ${vi?'Bạn đang xóa folder:':'You are about to delete folder:'}
              <div style="margin-top:6px;font-weight:700;color:var(--text-primary);font-size:15px">📁 ${label}</div>
              <div style="margin-top:4px;font-size:11px;color:var(--text-secondary);font-family:monospace">${folderPath}</div>
            </div>
          </div>
          ${fileCount>0||subCount>0?`
          <div style="margin-top:12px;padding:10px;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--red) 24%, var(--border));border-radius:6px">
            <div style="font-size:12px;color:var(--red);font-weight:600">${vi?'⚠️ Cảnh báo: Folder này chứa dữ liệu!':'⚠️ Warning: This folder contains data!'}</div>
            <div style="font-size:12px;color:var(--red);margin-top:4px">${fileCount>0?`• ${fileCount} ${vi?'tài liệu':'document(s)'}`:''} ${subCount>0?`• ${subCount} ${vi?'folder con':'subfolder(s)'}`:''}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${vi?'Tất cả sẽ được chuyển vào _Deleted':'All will be moved to _Deleted'}</div>
          </div>`:''}
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'Tôi xác nhận muốn xóa folder này':'I confirm I want to delete this folder'}
          </label>
        </div>
        ${fileCount>0?`
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check2" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'Tôi hiểu rằng '+fileCount+' tài liệu bên trong cũng sẽ bị xóa':'I understand that '+fileCount+' documents inside will also be deleted'}
          </label>
        </div>`:''}
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Hủy':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:var(--red);color:var(--text-inverse,#fff);opacity:.5;cursor:not-allowed" onclick="executeDeleteFolder('${escapeHtml(folderPath)}')">🗑️ ${vi?'Xóa folder':'Delete folder'}</button>
        </div>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)modal.remove();});

  function updateDelBtn(){
    const c1=document.getElementById('del-confirm-check');
    const c2=document.getElementById('del-confirm-check2');
    const allChecked=c1&&c1.checked&&(!c2||c2.checked);
    const btn=document.getElementById('del-confirm-btn');
    btn.disabled=!allChecked;
    btn.style.opacity=allChecked?'1':'.5';
    btn.style.cursor=allChecked?'pointer':'not-allowed';
  }
  document.getElementById('del-confirm-check').addEventListener('change',updateDelBtn);
  const c2=document.getElementById('del-confirm-check2');
  if(c2)c2.addEventListener('change',updateDelBtn);
}

async function executeDeleteFolder(folderPath){
  const vi=lang!=='en';
  try{
    const res=await apiCall('delete_folder',{folder_path:folderPath});
    if(res&&res.ok){
      const cnt=res.file_count||0;
      showToast('✅ '+(vi?'Đã xóa folder'+(cnt>0?' ('+cnt+' tài liệu)':''):'Deleted folder'+(cnt>0?' ('+cnt+' docs)':'')));
      document.getElementById('delete-confirm-modal')?.remove();
      // Go back to parent if we're inside the deleted folder
      if(currentFolderPath.length>0){
        const delKey=folderPath.split('/').pop();
        if(currentFolderPath.includes(delKey)){
          currentFolderPath=currentFolderPath.slice(0,currentFolderPath.indexOf(delKey));
        }
      }
      await rescanDocs();
      renderDocuments();
      renderSidebar();
    }else{
      const errMap={
        'folder_not_found':vi?'Không tìm thấy folder':'Folder not found',
        'forbidden':vi?'Bạn không có quyền xóa':'Permission denied',
        'cannot_delete_system_folder':vi?'Không thể xóa folder hệ thống':'Cannot delete system folder',
        'move_failed':vi?'Không thể di chuyển folder':'Failed to move folder',
        'delete_failed':vi?'Xóa folder thất bại trên server':'Folder delete failed on server',
        'server_error':vi?'Lỗi server khi xóa folder':'Server error while deleting folder'
      };
      showToast('\u26A0 '+(errMap[res?.error]||res?.error||'Error'));
    }
  }catch(e){
    showToast('\u26A0 Error: '+e.message);
  }
}
function openDocContextMenu(event, code, title){ openDocEditMenu(event, code); }

// Legacy rename - kept for API compatibility
async function doRenameFolder(oldPath){
  const newName = (document.getElementById('rf-name')?.value||'').trim();
  if(!newName){ showToast(lang==='en'?'Enter name':'Nhập tên'); return; }
  try {
    const res = await apiCall('rename_folder', {old_path: oldPath, new_name: newName});
    if(res && res.ok){
      showToast(`✅ ${lang==='en'?'Renamed':'Đã đổi tên'} (${res.updated_files} ${lang==='en'?'files updated':'tệp cập nhật'})`);
      document.getElementById('rename-folder-modal')?.remove();
      await rescanDocs();
      await loadFolderDescriptions();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}

// Legacy save desc
async function doSaveDesc(folderPath){
  const desc = (document.getElementById('ed-desc')?.value||'').trim();
  await saveFolderDesc(folderPath, desc);
  showToast('✅ ' + (lang==='en'?'Saved':'Đã lưu'));
  document.getElementById('edit-desc-modal')?.remove();
  renderDocuments();
}

// Legacy: openRenameDocDialog replaced by openDocEditDialog
function openRenameDocDialog(code, title){ openDocEditDialog(code); }

async function doRenameDoc(oldCode){
  const newCode = (document.getElementById('rd-code')?.value||'').trim();
  const newTitle = (document.getElementById('rd-title')?.value||'').trim();
  if(!newCode && !newTitle){ showToast(lang==='en'?'Enter code or title':'Nhập mã hoặc tiêu đề'); return; }
  try {
    const res = await apiCall('rename_doc', {old_code: oldCode, new_code: newCode, new_title: newTitle});
    if(res && res.ok){
      showToast(`✅ ${lang==='en'?'Renamed':'Đã đổi tên'}`);
      document.getElementById('rename-doc-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}

// ═══════════════════════════════════════════════════
// FOLDER STRUCTURE MAP — mirrors actual server filesystem
// ═══════════════════════════════════════════════════
// FOLDER_STRUCTURE is now dynamically built from FOLDER_TREE (api.php scan_folders)
// This fallback is only used before FOLDER_TREE loads
const FOLDER_STRUCTURE = {};

// Default folders for non-dept categories (flat categories)
const DEFAULT_FOLDERS = {
  MAN:'mom/docs/system/quality-manual',
  POL:'mom/docs/system/policies',
  ORG:'mom/docs/system/organization',
  SOP:'mom/docs/operations/sops',
  WI:'mom/docs/operations/work-instructions',
  ANNEX:'mom/docs/operations/references',
  FRM:'mom/docs/forms',
  TRN:'mom/docs/training',
};

// Department labels for UI (shared across create modal)
const DEPT_LABELS = {
  CNC:{vi:'CNC',en:'CNC'},ENG:{vi:'Kỹ thuật',en:'Engineering'},FIN:{vi:'Tài chính',en:'Finance'},
  HR:{vi:'Nhân sự',en:'HR'},HSE:{vi:'An toàn',en:'HSE'},IT:{vi:'CNTT',en:'IT'},
  MNT:{vi:'Bảo trì',en:'Maintenance'},OPS:{vi:'Vận hành',en:'Operations'},
  PLA:{vi:'Kế hoạch',en:'Planning'},PUR:{vi:'Mua hàng',en:'Purchasing'},
  QA:{vi:'QA/QC',en:'QA/QC'},QMS:{vi:'Hệ thống QMS',en:'QMS System'},
  SAL:{vi:'Kinh doanh',en:'Sales'},WHS:{vi:'Kho vận',en:'Warehouse'},
  EXE:{vi:'Ban điều hành',en:'Executive'},PRO:{vi:'Sản xuất',en:'Production'},
  GDL:{vi:'Hướng dẫn',en:'Guidelines'},
};

// Auto-generated dept label from folder name (e.g., "01-PROC-CNC" → "PROC-CNC")
function getDeptLabel(subName){
  const stripped = getSubfolderLabel(subName); // "PROC-CNC"
  // Check explicit labels first
  const key = stripped.replace(/^[A-Z]+-/, ''); // "CNC"
  if(DEPT_LABELS[key]) return lang==='en' ? DEPT_LABELS[key].en : DEPT_LABELS[key].vi;
  if(DEPT_LABELS[stripped]) return lang==='en' ? DEPT_LABELS[stripped].en : DEPT_LABELS[stripped].vi;
  // Fallback: clean up the folder name
  return stripped.replace(/-/g, ' ');
}

// Category labels for create modal dropdown
const CAT_OPTIONS = [
  {id:'SOP',  label:'SOP — Quy trình hệ thống',  labelEn:'SOP — Standard Operating Procedure'},
  {id:'PROC', label:'PROC — Quy trình phòng ban',  labelEn:'PROC — Department Process'},
  {id:'WI',   label:'WI — Hướng dẫn công việc',   labelEn:'WI — Work Instruction'},
  {id:'FRM',  label:'FRM — Biểu mẫu / Hồ sơ',    labelEn:'FRM — Forms & Records'},
  {id:'ORG',  label:'ORG — Tổ chức & Nhân sự',    labelEn:'ORG — Organization & HR'},
  {id:'ANNEX',label:'ANNEX — Phụ lục',labelEn:'ANNEX — Annexes'},
  {id:'POL',  label:'POL — Chính sách',            labelEn:'POL — Policy'},
  {id:'MAN',  label:'MAN — Sổ tay chất lượng',    labelEn:'MAN — Quality Manual'},
  {id:'TRN',  label:'TRN — Đào tạo & Năng lực',   labelEn:'TRN — Training & Competency'},
];

function getDefaultFolderForCat(cat){
  const catDocs = DOCS.filter(d=>d.cat===cat);
  const rootNode = (typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(cat, catDocs) : null;
  if(rootNode && rootNode.path) return rootNode.path;
  const bestNode = getBestTreeNodeForCategory(cat, catDocs);
  if(bestNode && bestNode.path) return bestNode.path;
  if(DEFAULT_FOLDERS[cat]) return DEFAULT_FOLDERS[cat];
  // Use dynamic tree
  if(DYNAMIC_FOLDERS && DYNAMIC_FOLDERS[cat]){
    const keys = Object.keys(DYNAMIC_FOLDERS[cat]);
    return keys.length > 0 ? DYNAMIC_FOLDERS[cat][keys[0]] : '04-SOPs';
  }
  return '04-SOPs';
}

function getCatHasDept(cat){
  // Fully dynamic: check DYNAMIC_FOLDERS built from FOLDER_TREE
  if(DYNAMIC_FOLDERS && DYNAMIC_FOLDERS[cat] && Object.keys(DYNAMIC_FOLDERS[cat]).length > 0){
    return true;
  }
  return false;
}

function computeFolder(cat, dept){
  // Use dynamic tree
  if(DYNAMIC_FOLDERS && DYNAMIC_FOLDERS[cat] && dept && DYNAMIC_FOLDERS[cat][dept]){
    return DYNAMIC_FOLDERS[cat][dept];
  }
  if(!getCatHasDept(cat)){
    const rootNode = (typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(cat, DOCS.filter(d=>d.cat===cat)) : null;
    if(rootNode && rootNode.path) return rootNode.path;
    const bestNode = getBestTreeNodeForCategory(cat, DOCS.filter(d=>d.cat===cat));
    if(bestNode && bestNode.path) return bestNode.path;
    if(DEFAULT_FOLDERS[cat]) return DEFAULT_FOLDERS[cat];
    return '04-SOPs';
  }
  // Fallback: first available subfolder
  if(DYNAMIC_FOLDERS && DYNAMIC_FOLDERS[cat]){
    const k = Object.keys(DYNAMIC_FOLDERS[cat]);
    return k.length ? DYNAMIC_FOLDERS[cat][k[0]] : '04-SOPs';
  }
  return '04-SOPs';
}

function getDynamicDeptOptions(catCode){
  // Build dropdown options from dynamic tree
  if(DYNAMIC_FOLDERS && DYNAMIC_FOLDERS[catCode]){
    return Object.entries(DYNAMIC_FOLDERS[catCode]).map(([name, path])=>{
      return {value: name, label: name, path: path};
    });
  }
  // Fall back to static FOLDER_STRUCTURE
  const fs = FOLDER_STRUCTURE[catCode];
  if(fs && typeof fs === 'object'){
    return Object.entries(fs).map(([name, path])=>{
      const lb = DEPT_LABELS[name];
      const txt = lb ? (lang==='en'?(lb.en||name):(lb.vi||name)) : name;
      return {value: name, label: name + ' — ' + txt, path: path};
    });
  }
  return [];
}

function openCreateDocModal(cat){
  if(!canCreateNewDoc()){
    showToast(lang==='en'?'⚠ You do not have permission to create new documents':'⚠ Bạn không có quyền tạo mới tài liệu');
    return;
  }
  closeModal();

  const modal=document.createElement('div');
  modal.id='create-doc-modal';
  modal.className='modal-overlay';

  const ownerDept=(currentUser && (currentUser.dept||currentUser.title)) ? (currentUser.dept||currentUser.title) : 'QA/QMS';
  const hasDept = getCatHasDept(cat);
  const deptOptions = hasDept ? getDynamicDeptOptions(cat) : [];
  const initDept = deptOptions.length > 0 ? deptOptions[0].value : '';
  const initFolder = computeFolder(cat, initDept);

  // Build category select HTML
  const catSelectHTML = CAT_OPTIONS.map(c=>`<option value="${c.id}" ${c.id===cat?'selected':''}>${lang==='en'?c.labelEn:c.label}</option>`).join('');

  // Build dept select HTML
  const buildDeptOptions = (catId) => {
    return getDynamicDeptOptions(catId).map(opt=>{
      const txt = getDeptLabel(opt.value);
      return `<option value="${opt.value}">${getSubfolderLabel(opt.value)} — ${txt}</option>`;
    }).join('');
  };

  modal.innerHTML=`
    <div class="modal" style="max-width:640px">
      <div class="modal-header">
        <div class="modal-title">${lang==='en'?'Create new document':'Tạo mới tài liệu'}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <!-- ROW 1: Category + Department -->
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>① ${lang==='en'?'Category':'Loại tài liệu'}</label>
            <select id="cd-cat" onchange="onCreateDocCatChange()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer">
              ${catSelectHTML}
            </select>
          </div>
          <div class="modal-field" id="cd-dept-wrap">
            <label>② ${lang==='en'?'Department':'Phòng ban'}</label>
            <select id="cd-dept" onchange="onCreateDocDeptChange()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer;${hasDept?'':'opacity:0.4;pointer-events:none'}">
              ${hasDept ? buildDeptOptions(cat) : `<option value="">— ${lang==='en'?'Not applicable':'Không áp dụng'} —</option>`}
            </select>
            <div class="help-text" id="cd-dept-hint" style="margin-top:4px;font-size:11px;color:var(--text-3)">
              ${hasDept ? (lang==='en'?'Select department for this document type':'Chọn phòng ban cho loại tài liệu này') : (lang==='en'?'This category has no department subdivision':'Loại tài liệu này không chia theo phòng ban')}
            </div>
          </div>
        </div>

        <!-- ROW 2: Code + Version -->
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>③ ${lang==='en'?'Document code':'Mã tài liệu'}</label>
            <input id="cd-code" type="text" placeholder="${cat==='PROC'?'PROC-CNC-003':cat==='FRM'?'FRM-QA-020':'SOP-QMS-027'}" value="">
          </div>
          <div class="modal-field">
            <label>${lang==='en'?'Initial version':'Phiên bản khởi tạo'}</label>
            <input id="cd-rev" type="text" value="0.0" placeholder="0.0">
          </div>
        </div>

        <!-- ROW 3: Title -->
        <div class="modal-field">
          <label>④ ${lang==='en'?'Title':'Tiêu đề'}</label>
          <input id="cd-title" type="text" placeholder="${lang==='en'?'Document title':'Tên tài liệu'}" value="">
        </div>

        <!-- ROW 4: Owner -->
        <div class="modal-field">
          <label>${lang==='en'?'Owner':'Chủ sở hữu'}</label>
          <select id="cd-owner" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer">
            ${[
              {v:'QA/QMS',vi:'QA/QMS — Hệ thống chất lượng',en:'QA/QMS — Quality System'},
              {v:'Production',vi:'Production — Sản xuất',en:'Production'},
              {v:'Engineering',vi:'Engineering — Kỹ thuật',en:'Engineering'},
              {v:'QA/QC',vi:'QA/QC — Kiểm tra chất lượng',en:'QA/QC — Quality Control'},
              {v:'OPS',vi:'OPS — Vận hành',en:'OPS — Operations'},
              {v:'Planning',vi:'Planning — Kế hoạch',en:'Planning'},
              {v:'Purchasing',vi:'Purchasing — Mua hàng',en:'Purchasing'},
              {v:'Sales',vi:'Sales — Kinh doanh',en:'Sales'},
              {v:'Warehouse',vi:'Warehouse — Kho vận',en:'Warehouse'},
              {v:'Maintenance',vi:'Maintenance — Bảo trì',en:'Maintenance'},
              {v:'Finance',vi:'Finance — Tài chính',en:'Finance'},
              {v:'HR',vi:'HR — Nhân sự',en:'HR — Human Resources'},
              {v:'HSE',vi:'HSE — An toàn',en:'HSE — Health Safety Environment'},
              {v:'IT',vi:'IT — Công nghệ thông tin',en:'IT — Information Technology'},
              {v:'Executive',vi:'Executive — Ban điều hành',en:'Executive'},
              {v:'Multi',vi:'Multi — Đa phòng ban',en:'Multi — Cross-department'},
            ].map(o=>'<option value="'+o.v+'" '+(o.v===ownerDept?'selected':'')+'>'+
              (lang==='en'?o.en:o.vi)+'</option>').join('')}
          </select>
        </div>

        <!-- ROW 5: Folder (auto-computed, read-only display) -->
        <div class="modal-field">
          <label>📁 ${lang==='en'?'Save location':'Vị trí lưu'}</label>
          <div id="cd-folder-display" style="padding:10px 12px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;font-family:var(--mono);font-size:12px;color:var(--text-2);display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">📂</span>
            <span id="cd-folder-text">${initFolder}/</span>
          </div>
          <input type="hidden" id="cd-folder" value="${initFolder}">
          <div class="help-text" style="margin-top:4px;font-size:11px;color:var(--text-3)">
            ${lang==='en'
              ?'Auto-computed from Category + Department. Baseline V0 does not create an <b>_Archive</b> subfolder; control is maintained through the active file, checksum registry and release manifest.'
              :'Tự động tính từ Loại + Phòng ban. Baseline V0 không tạo thư mục <b>_Archive</b>; kiểm soát được duy trì qua file active, checksum registry và release manifest.'}
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-admin" onclick="closeModal()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="submitCreateDoc(document.getElementById('cd-cat').value)">${lang==='en'?'Create':'Tạo mới'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>{ document.getElementById('cd-code')?.focus(); }, 50);
}

// When category changes → update dept dropdown + folder
function onCreateDocCatChange(){
  const cat = document.getElementById('cd-cat').value;
  const deptSel = document.getElementById('cd-dept');
  const deptWrap = document.getElementById('cd-dept-wrap');
  const deptHint = document.getElementById('cd-dept-hint');
  const hasDept = getCatHasDept(cat);

  if(hasDept){
    const fs = DYNAMIC_FOLDERS[cat] || {};
    const keys = Object.keys(fs);
    deptSel.innerHTML = keys.map(d=>{
      const txt = getDeptLabel(d);
      return `<option value="${d}">${getSubfolderLabel(d)} — ${txt}</option>`;
    }).join('');
    deptSel.style.opacity = '1';
    deptSel.style.pointerEvents = 'auto';
    deptHint.textContent = lang==='en'?'Select department for this document type':'Chọn phòng ban cho loại tài liệu này';
  } else {
    deptSel.innerHTML = `<option value="">— ${lang==='en'?'Not applicable':'Không áp dụng'} —</option>`;
    deptSel.style.opacity = '0.4';
    deptSel.style.pointerEvents = 'none';
    deptHint.textContent = lang==='en'?'This category has no department subdivision':'Loại tài liệu này không chia theo phòng ban';
  }

  onCreateDocDeptChange();
}

// When dept changes → update folder display
function onCreateDocDeptChange(){
  const cat = document.getElementById('cd-cat').value;
  const dept = document.getElementById('cd-dept').value;
  const folder = computeFolder(cat, dept);
  document.getElementById('cd-folder').value = folder;
  document.getElementById('cd-folder-text').textContent = folder + '/';

  // Update code placeholder hint (derived from category + subfolder)
  const codeInput = document.getElementById('cd-code');
  if(codeInput){
    let prefix = `${cat}-`;
    if(dept){
      // Derive prefix from subfolder name: "PROC-CNC" → "PROC-CNC-", "Job-Descriptions" → "JD-"
      const subLabel = dept;
      if(subLabel.startsWith('PROC-')||subLabel.startsWith('FRM-')||subLabel.startsWith('WI-')||subLabel.startsWith('ANNEX-')||subLabel.startsWith('JD-')){
        prefix = subLabel + '-';
      } else if(subLabel === 'Job-Descriptions'){
        prefix = 'JD-XXX-';
      } else if(subLabel === 'Department-Handbooks'){
        prefix = 'DEPT-HB-';
      } else {
        prefix = `${cat}-${dept}-`;
      }
    }
    codeInput.placeholder = prefix + '001';
  }
}


async function submitCreateDoc(cat){
  const code=document.getElementById('cd-code')?.value.trim();
  const title=document.getElementById('cd-title')?.value.trim();
  const owner=document.getElementById('cd-owner')?.value.trim();
  const revision=document.getElementById('cd-rev')?.value.trim();
  const folder=document.getElementById('cd-folder')?.value.trim();

  if(!code){ showToast(lang==='en'?'⚠ Missing document code':'⚠ Thiếu mã tài liệu'); return; }
  if(!title){ showToast(lang==='en'?'⚠ Missing title':'⚠ Thiếu tiêu đề'); return; }
  if(!ensureEnglishStandardTitle(title)) return;

  if(revision && !/^\d+(?:\.\d+)?$/.test(revision)){
    showToast(lang==='en'?'⚠ Invalid version (e.g., 0.0, 1.0, 1.1)':'⚠ Phiên bản không hợp lệ (ví dụ: 0.0, 1.0, 1.1)');
    return;
  }

  if(DOCS.find(d=>d.code===code.toUpperCase())){
    showToast(lang==='en'?'⚠ Code already exists':'⚠ Mã đã tồn tại');
    return;
  }

  try{
    const res=await controlPlaneDocumentAuthoringRequest('create',{code,title,cat,owner,folder,revision}, 'POST', 300000);
    if(res && res.ok && res.doc){
      await rescanDocs();
      if(!DOCS.find(d=>d.code===res.doc.code)) DOCS.push(res.doc);
      if(res.state) SERVER_DOC_STATE[res.doc.code]=res.state;
      if(res.versions) SERVER_DOC_VERSIONS[res.doc.code]=res.versions;
      closeModal();
      showToast(lang==='en'?'✅ Document created':'✅ Đã tạo tài liệu');
      renderDocuments();
      renderSidebar();
      openDoc(res.doc.code);
      // Also refresh dashboard counters
      renderDashboard();
    }else{
      showToast((res && res.error) ? ('⚠ '+res.error) : (lang==='en'?'⚠ Create failed':'⚠ Tạo thất bại'));
    }
  }catch(err){
    showToast('Error: '+(err && err.message ? err.message : err));
  }
}

function renderSearch(){
  const el = document.getElementById('page-search');
  const suggestions = ['NCR','CAPA','FAI','calibration','inspection','shipping','supplier','audit','setup sheet','quality gate','job traveler','control plan'];
  el.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">${T('search_title')}</h2>
    <input class="search-input-lg" type="text" placeholder="${T('search_ph')}" id="search-main" oninput="handleSearch(this.value)" autofocus>
    <div id="search-results" class="search-results"></div>
    <div class="search-tags" id="search-suggestions">
      ${suggestions.map(s => `<button class="search-tag" onclick="document.getElementById('search-main').value='${s}';handleSearch('${s}')"><div class="st-label">${T('keyword')}</div><div class="st-text">${s}</div></button>`).join('')}
    </div>`;
}

function handleSearch(q){
  if(!q){ document.getElementById('search-results').innerHTML=''; document.getElementById('search-suggestions').style.display='flex'; return; }
  document.getElementById('search-suggestions').style.display='none';
  const ql = q.toLowerCase();
  const results = getVisibleDocs().filter(doc => {
    const haystack = [
      doc.code,
      doc.title,
      getDocDisplayTitle(doc),
      getDocDisplayDescription(doc),
    ].join(' ').toLowerCase();
    return haystack.includes(ql);
  });
  document.getElementById('search-results').innerHTML = results.length === 0 
    ? '<div style="padding:24px;color:var(--text-3);text-align:center">'+T('no_results')+' "'+q+'"</div>'
    : results.map(doc => {
      const cat = getCatForDoc(doc);
      const locked = !canAccessDoc(doc.code);
      const displayTitle = getDocDisplayTitle(doc);
      const displayDesc = getDocDisplayDescription(doc);
      return `<div class="search-result ${locked?'locked':''}" ${locked?'':`onclick="openDoc('${doc.code}')"`}>
        <div class="sr-badge" style="background:${cat.color}">${cat.icon}</div>
        <div class="sr-main"><div class="sr-code" style="color:${cat.color}">${doc.code}</div><div class="sr-title">${displayTitle}</div>${displayDesc?`<div class="sr-desc">${displayDesc}</div>`:''}</div>
        <div class="sr-cat">${catLabel(cat).split('(')[0].trim()} ${locked?'🔒':''}</div>
      </div>`;
    }).join('');
}

function renderAccessMatrix(){
  const el = document.getElementById('page-access');
  const VDOCS = getVisibleDocs();
  const cats = CATEGORIES.filter(c=>VDOCS.some(d=>d.cat===c.id));
  el.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:8px">${T('access_title')}</h2>
    <p style="font-size:13px;color:var(--text-3);margin-bottom:16px">${T('access_desc')}</p>
    <div style="overflow-x:auto">
    <table class="matrix-table">
      <thead><tr><th style="text-align:left;width:200px">${T('role')}</th>${cats.map(c=>`<th>${c.icon}<br><span style="font-size:9px">${catLabel(c).split('(')[0].trim()}</span></th>`).join('')}<th>${T('approve')}</th><th>Total</th></tr></thead>
      <tbody>
        ${Object.entries(ROLES).map(([role,r]) => {
          const totalForRole = VDOCS.filter(d=>docMatchesRole(d.code,role)).length;
          return `
          <tr class="${role===currentUser.role?'current-role':''}">
            <td><span style="color:${r.color}">${r.icon}</span> ${lang==='en'?(r.labelEn||r.label):r.label}</td>
            ${cats.map(c => {
              const docsInCat = VDOCS.filter(d=>d.cat===c.id);
              const accessCount = docsInCat.filter(d=>docMatchesRole(d.code,role)).length;
              const full = accessCount === docsInCat.length;
              const partial = accessCount > 0 && !full;
              const none = accessCount === 0;
              return `<td title="${accessCount}/${docsInCat.length}"><span class="${none?'cross':'check'}">${full?'✓':partial?accessCount:'✕'}</span></td>`;
            }).join('')}
            <td><span class="${r.approve?'check':'cross'}">${r.approve?'✓':'—'}</span></td>
            <td style="font-size:10px;font-family:var(--mono)">${totalForRole}/${VDOCS.length}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    <p style="font-size:11px;color:var(--text-3);margin-top:8px">✓ = ${lang==='en'?'Full access to category':'Toàn quyền danh mục'} | <i>number</i> = ${lang==='en'?'Partial (X docs)':'Một phần (X tài liệu)'} | ✕ = ${lang==='en'?'No access':'Không truy cập'}</p>`;
}

// ═══════════════════════════════════════════════════
// DICTIONARY
// ═══════════════════════════════════════════════════
let dictData = null;
let dictQuery = '';
let dictCatFilter = 'ALL';
let dictShowCount = 30;

const DICT_CAT_COLORS = {
  'ISO/QMS':'#7c3aed','Quality':'#2e7d32','CNC/Engineering':'#0369a1',
  'Operations/Planning':'#059669','HR/Training':'#c026d3','Finance':'#d97706',
  'IT/Systems':'#6366f1','Logistics':'#0891b2','HSE':'#dc2626','General':'#64748b'
};

async function loadDictData(){
  if(dictData) return;
  try {
    // Prefer server API (always latest after admin edits)
    if(currentUser){
      try{
        const res = await apiCall('dict_list', null, 'GET');
        if(res && res.ok && Array.isArray(res.items)){
          dictData = res.items;
          return;
        }
      }catch(_e){}
    }

    // Fallback (static file)
    if(typeof DICT_DATA !== 'undefined') {
      dictData = DICT_DATA;
    } else {
      const resp = await fetch('../mom/docs/glossary/dict-data.json');
      dictData = await resp.json();
    }
  } catch(e){
    console.error('Dict load error:',e);
    dictData = [];
  }
}

function updateDictBadge(){
  const badge = document.getElementById('dict-badge');
  if(badge && dictData) badge.textContent = dictData.length.toLocaleString();
}

function renderDictionary(){
  // Update badge whenever dictionary page renders
  updateDictBadge();
  const el = document.getElementById('page-dictionary');
  el.innerHTML = `
    <div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:20px">
      <div>
        <h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px">📖 ${T('dict_title')} <span style="font-size:12px;font-weight:400;color:var(--text-3);background:#f1f3f5;padding:2px 10px;border-radius:20px">ANNEX-50470</span></h2>
        <p style="font-size:13px;color:var(--text-3);margin-top:4px">${T('dict_desc')}</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-shrink:0">
        ${isAdmin()?`<button class=\"btn-admin primary\" onclick=\"openDictTermModal()\">➕ ${lang==='en'?'Add term':'Thêm thuật ngữ'}</button>`:''}
      </div>
    </div>
    <input class="search-input-lg" type="text" placeholder="${T('dict_ph')}" id="dict-search" oninput="handleDictSearch(this.value)" autofocus>
    <div id="dict-body">
      <div class="dict-loading"><div class="spinner"></div>${T('dict_loading')}</div>
  </div>`;
  loadDictData().then(()=>{renderDictBody();updateDictBadge();});
}

function normalizeDictionarySearchText(text){
  return String(text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/Ä'/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

const DICT_STATUS_TERMS = new Set(['PASS', 'FAIL', 'REJECT', 'REWORK']);

function normalizeDictionarySingleLineText(text){
  return String(text || '').replace(/\s+/g, ' ').trim();
}

function getDictionaryAliasMatch(term){
  const match = normalizeDictionarySingleLineText(term).match(/^(.*?)\s*\(([A-Z0-9][A-Z0-9/&+.\-]{1,})\)$/);
  if(!match) return null;
  return {
    phrase: normalizeDictionarySingleLineText(match[1]),
    abbr: normalizeDictionarySingleLineText(match[2])
  };
}

function isDictionaryStatusTerm(term){
  return DICT_STATUS_TERMS.has(normalizeDictionarySingleLineText(term).toUpperCase());
}

function isDictionaryAbbreviationTerm(term){
  const value = normalizeDictionarySingleLineText(term);
  if(!value || value.includes(' ') || isDictionaryStatusTerm(value)) return false;
  if(/^[A-Z]{2,}-\d{2,}$/.test(value)) return true;
  return /^[A-Z0-9][A-Z0-9/&+.\-]{1,}$/.test(value);
}

function sanitizeDictionaryMeaning(term, meaning){
  const cleanTerm = normalizeDictionarySingleLineText(term);
  let cleanMeaning = normalizeDictionarySingleLineText(meaning).replace(/\s*\/\s*/g, ' / ');
  if(!cleanMeaning) return '';
  if(isDictionaryAbbreviationTerm(cleanTerm)){
    const escaped = cleanTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleanMeaning = cleanMeaning.replace(new RegExp(`\\s*\\(${escaped}\\)\\s*$`, 'i'), '').trim();
  }
  return cleanMeaning;
}

function getDictionaryValidationError(term, meaning, def, originalTerm){
  const cleanTerm = normalizeDictionarySingleLineText(term);
  const cleanMeaning = sanitizeDictionaryMeaning(cleanTerm, meaning);
  const cleanDef = String(def || '').trim();
  const cleanOriginal = normalizeDictionarySingleLineText(originalTerm || cleanTerm);
  const aliasMatch = getDictionaryAliasMatch(cleanTerm);

  if(!cleanTerm) return 'missing_term';
  if(!cleanMeaning) return 'missing_meaning';
  if(!cleanDef) return 'missing_definition';
  if(aliasMatch && (!originalTerm || cleanOriginal.toLowerCase() !== cleanTerm.toLowerCase())){
    return 'use_abbreviation_canonical_term';
  }
  if(isDictionaryAbbreviationTerm(cleanTerm) && cleanMeaning.toLowerCase() === cleanTerm.toLowerCase()){
    return 'meaning_must_expand_abbreviation';
  }
  return '';
}

function getDictionarySaveErrorMessage(errorCode){
  const viMessages = {
    missing_term: 'Cần nhập thuật ngữ',
    missing_meaning: 'Cần nhập tên đầy đủ tiếng Anh',
    missing_definition: 'Cần nhập định nghĩa',
    use_abbreviation_canonical_term: 'Dùng mã viết tắt làm term chính và điền tên đầy đủ tiếng Anh vào trường Meaning',
    meaning_must_expand_abbreviation: 'Tên đầy đủ tiếng Anh phải khai triển mã viết tắt, không được lặp lại chính mã đó'
  };
  const enMessages = {
    missing_term: 'Term is required',
    missing_meaning: 'Full English is required',
    missing_definition: 'Definition is required',
    use_abbreviation_canonical_term: 'Use the abbreviation as the canonical term and put the full English in Meaning',
    meaning_must_expand_abbreviation: 'Meaning must expand the abbreviation instead of repeating the code'
  };
  const messages = lang === 'en' ? enMessages : viMessages;
  return messages[errorCode] || errorCode || (lang === 'en' ? 'Save failed' : 'Lưu thất bại');
}

function isDictionaryWordStart(text, index){
  return index === 0 || text.charAt(index - 1) === ' ';
}

function scoreDictionaryField(text, query, fieldWeight){
  if(!text || !query) return null;
  const idx = text.indexOf(query);
  const tokens = query.split(' ').filter(Boolean);
  let bestScore = null;

  if(text === query){
    bestScore = fieldWeight + 600;
  }
  if(text.startsWith(query)){
    const score = fieldWeight + 420 - Math.min(160, text.length - query.length);
    bestScore = bestScore === null ? score : Math.max(bestScore, score);
  }
  if(idx >= 0){
    const boundaryBoost = isDictionaryWordStart(text, idx) ? 290 : 180;
    const score = fieldWeight + boundaryBoost - Math.min(140, idx * 3);
    bestScore = bestScore === null ? score : Math.max(bestScore, score);
  }
  if(tokens.length > 1){
    const tokenIndexes = tokens.map(token => text.indexOf(token));
    if(tokenIndexes.every(tokenIndex => tokenIndex >= 0)){
      const boundaryHits = tokenIndexes.filter(tokenIndex => isDictionaryWordStart(text, tokenIndex)).length;
      const tokenPenalty = Math.min(120, tokenIndexes.reduce((sum, tokenIndex) => sum + tokenIndex, 0));
      const score = fieldWeight + 210 + (boundaryHits * 24) - tokenPenalty;
      bestScore = bestScore === null ? score : Math.max(bestScore, score);
    }
  }

  return bestScore;
}

function getDictionarySearchMatch(item, rawQuery){
  const query = normalizeDictionarySearchText(rawQuery);
  if(!query) return { item, score: 0 };
  const aliasComposite = item.meaning && item.term ? `${item.meaning} (${item.term})` : '';

  const fields = [
    { key: 'term', value: normalizeDictionarySearchText(item.term), weight: 1200 },
    { key: 'alias', value: normalizeDictionarySearchText(aliasComposite), weight: 1140 },
    { key: 'vi', value: normalizeDictionarySearchText(item.vi), weight: 1120 },
    { key: 'meaning', value: normalizeDictionarySearchText(item.meaning), weight: 720 },
    { key: 'def', value: normalizeDictionarySearchText(item.def), weight: 220 }
  ];

  let bestField = null;
  let bestScore = null;

  fields.forEach(field => {
    const score = scoreDictionaryField(field.value, query, field.weight);
    if(score === null) return;
    if(bestScore === null || score > bestScore){
      bestScore = score;
      bestField = field.key;
    }
  });

  if(bestScore === null) return null;

  const termLength = String(item.term || '').trim().length || 999;
  return {
    item,
    score: bestScore,
    field: bestField,
    termLength,
    term: String(item.term || '').toLowerCase()
  };
}

function getRankedDictionaryMatches(items, rawQuery){
  return items
    .map(item => getDictionarySearchMatch(item, rawQuery))
    .filter(Boolean)
    .sort((a, b) => {
      if(b.score !== a.score) return b.score - a.score;
      if(a.termLength !== b.termLength) return a.termLength - b.termLength;
      return a.term.localeCompare(b.term);
    });
}

function renderDictBody(){
  if(!dictData) return;
  const el = document.getElementById('dict-body');

  const rankedMatches = dictQuery ? getRankedDictionaryMatches(dictData, dictQuery) : [];
  const queryMatchedItems = dictQuery ? rankedMatches.map(match => match.item) : dictData;

  // Filter
  let filtered = queryMatchedItems;
  if(dictCatFilter !== 'ALL'){
    filtered = filtered.filter(d => d.cat === dictCatFilter);
  }

  // Category counts
  const catCounts = {};
  const srcData = queryMatchedItems;
  srcData.forEach(d => { catCounts[d.cat] = (catCounts[d.cat]||0)+1; });
  
  const showing = filtered.slice(0, dictShowCount);
  const hasMore = filtered.length > dictShowCount;
  
  // Build suggestions if no query
  const suggestions = ['FAI','CAPA','NCR','OTD','RFQ','GD&T','CMM','ERP','SPC','IPQC','5S','Kaizen','PFMEA','AQL','COC','WIP','PO','BOM','DFM','Cpk'];
  
  el.innerHTML = `
    <div class="dict-stats">
      <div class="dict-stat"><b>${dictData.length.toLocaleString()}</b>${T('dict_total')}</div>
      <div class="dict-stat"><b>${Object.keys(catCounts).length}</b>${T('dict_cats')}</div>
      <div class="dict-stat"><b>${filtered.length.toLocaleString()}</b>${dictQuery||dictCatFilter!=='ALL'?T('dict_filtered'):T('dict_display')}</div>
    </div>
    <div class="dict-cat-chips">
      <button class="dict-cat-chip ${dictCatFilter==='ALL'?'active':''}" onclick="dictCatFilter='ALL';dictShowCount=30;renderDictBody()">${T('dict_all')}</button>
      ${Object.entries(catCounts).sort((a,b)=>b[1]-a[1]).map(([cat,cnt]) => 
        `<button class="dict-cat-chip ${dictCatFilter===cat?'active':''}" onclick="dictCatFilter='${cat.replace(/'/g,"\\'")}';dictShowCount=30;renderDictBody()">
          <span class="chip-dot" style="background:${DICT_CAT_COLORS[cat]||'#94a3b8'}"></span>${cat} (${cnt})
        </button>`
      ).join('')}
    </div>
    ${!dictQuery && dictCatFilter==='ALL' ? `
      <div class="search-tags" style="margin-top:12px;margin-bottom:8px">
        ${suggestions.map(s => `<button class="search-tag" onclick="document.getElementById('dict-search').value='${s}';handleDictSearch('${s}')"><div class="st-label">${T('dict_lookup')}</div><div class="st-text">${s}</div></button>`).join('')}
      </div>
    ` : ''}
    <div class="dict-results">
      ${filtered.length===0 ? `<div style="text-align:center;padding:40px;color:var(--text-3)">${T('no_results')} "${dictQuery}"</div>` : ''}
      ${showing.map(d => {
        const safeTerm = String(d.term||'').replace(/'/g,"\\'");
        return `
        <div class="dict-card">
          <div class="dict-card-header">
            <div>
              <div class="dict-term">${highlightMatch(d.term, dictQuery)}</div>
              ${d.meaning ? `<div class="dict-meaning">${highlightMatch(d.meaning, dictQuery)}</div>` : ''}
              ${d.vi && d.vi !== d.term && d.vi !== d.meaning ? `<div class="dict-vi">${highlightMatch(d.vi, dictQuery)}</div>` : ''}
            </div>
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0">
              <div class="dict-cat-badge"><span class="dot" style="background:${DICT_CAT_COLORS[d.cat]||'#94a3b8'}"></span>${d.cat}</div>
              ${isAdmin()?`
                <button class="btn-admin secondary sm" title="${lang==='en'?'Edit term':'Sửa thuật ngữ'}" onclick="openDictTermModal('${safeTerm}')">✎</button>
                <button class="btn-admin danger sm" title="${lang==='en'?'Delete term':'Xóa thuật ngữ'}" onclick="deleteDictTerm('${safeTerm}')">🗑</button>
              `:''}
            </div>
          </div>
          <div class="dict-def">${highlightMatch(d.def, dictQuery)}</div>
          ${d.ctx ? `<div class="dict-ctx"><b>${T('dict_ctx')}:</b> ${d.ctx}</div>` : ''}
          ${d.rec ? `<div class="dict-rec">📋 ${d.rec}</div>` : ''}
        </div>
      `;
      }).join('')}
    </div>
    ${hasMore ? `<button class="dict-more-btn" onclick="dictShowCount+=30;renderDictBody()">${T('dict_more')} (${filtered.length - dictShowCount > 0 ? filtered.length - dictShowCount : 0} ${T('dict_remaining')})</button>` : ''}
    <div style="margin-top:12px;font-size:11px;color:var(--text-3);text-align:center">${T('showing')} ${Math.min(dictShowCount, filtered.length)} / ${filtered.length} · ${T('dict_source')}: ANNEX-50470</div>
  `;
}

function highlightMatch(text, query){
  if(!query || !text) return text;
  const escaped = query.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const darkUi = document.documentElement.getAttribute('data-color-mode') === 'dark';
  const markBg = darkUi ? 'rgba(251,191,36,.28)' : '#fff9c4';
  return text.replace(new RegExp('('+escaped+')','gi'),'<mark style="background:'+markBg+';color:inherit;padding:0 2px;border-radius:2px">$1</mark>');
}

function handleDictSearch(q){
  dictQuery = q;
  dictCatFilter = 'ALL';
  dictShowCount = 30;
  renderDictBody();
}

// ─────────────────────────────────────────────────────────────
// DICTIONARY CRUD (Admin only)
// ─────────────────────────────────────────────────────────────
function openDictTermModal(term){
  if(!isAdmin()){
    showToast(lang==='en'?'Not permitted':'Không có quyền');
    return;
  }
  const isEdit = !!term;
  const existing = isEdit ? (dictData||[]).find(x=>String(x.term)===String(term)) : null;
  const cats = Array.from(new Set((dictData||[]).map(x=>x.cat).filter(Boolean))).sort();
  const catOptions = cats.map(c=>`<option value="${c}" ${existing && existing.cat===c?'selected':''}>${c}</option>`).join('');
  const modal = document.createElement('div');
  modal.className='modal-overlay';
  modal.id='dict-modal';
  modal.innerHTML = `<div class="modal" style="max-width:720px">
    <h3 style="margin-bottom:10px">${isEdit?(lang==='en'?'Edit term':'Sửa thuật ngữ'):(lang==='en'?'Add new term':'Thêm thuật ngữ mới')}</h3>

    <div class="modal-field"><label>${lang==='en'?'Term (EN)':'Thuật ngữ (EN)'}</label><input id="dm-term" value="${existing?escapeHtml(existing.term):''}" ${isEdit?'disabled':''}></div>
    <div class="modal-field"><label>${lang==='en'?'Vietnamese':'Tiếng Việt'}</label><input id="dm-vi" value="${existing?escapeHtml(existing.vi||''):''}"></div>
    <div class="modal-field"><label>${lang==='en'?'Full English (required)':'Tên đầy đủ tiếng Anh (bắt buộc)'}</label><input id="dm-meaning" value="${existing?escapeHtml(existing.meaning||''):''}"></div>
    <div class="modal-field"><label>${lang==='en'?'Category':'Nhóm'}</label>
      <select id="dm-cat">${catOptions || '<option value="General">General</option>'}</select>
    </div>
    <div class="modal-field"><label>${lang==='en'?'Definition':'Định nghĩa'}</label><textarea id="dm-def" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.def||''):''}</textarea></div>
    <div class="modal-field"><label>${lang==='en'?'Context / Example':'Ngữ cảnh / Ví dụ'}</label><textarea id="dm-ctx" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.ctx||''):''}</textarea></div>
    <div class="modal-field"><label>${lang==='en'?'Required records':'Hồ sơ phải có'}</label><textarea id="dm-rec" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.rec||''):''}</textarea></div>

    <div class="modal-actions">
      <button class="btn-admin secondary" onclick="closeModal()">✕ ${T('admin_cancel')}</button>
      <button class="btn-admin primary" onclick="saveDictTerm('${isEdit?String(term).replace(/'/g,"\\'"):''}')">✓ ${T('admin_save')}</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
}

async function saveDictTerm(originalTerm){
  if(!isAdmin()) return;
  const term = (document.getElementById('dm-term').value||'').trim();
  const vi = (document.getElementById('dm-vi').value||'').trim();
  const meaning = sanitizeDictionaryMeaning(term, document.getElementById('dm-meaning').value||'');
  const cat = (document.getElementById('dm-cat').value||'General').trim();
  const def = (document.getElementById('dm-def').value||'').trim();
  const ctx = (document.getElementById('dm-ctx').value||'').trim();
  const rec = (document.getElementById('dm-rec').value||'').trim();

  const validationError = getDictionaryValidationError(term, meaning, def, originalTerm);
  if(validationError){
    alert(getDictionarySaveErrorMessage(validationError));
    return;
  }

  try{
    const res = await apiCall('dict_upsert',{term,vi,meaning,cat,def,ctx,rec,originalTerm});
    if(!(res && res.ok)){
      showToast('⚠ ' + getDictionarySaveErrorMessage(res && res.error));
      return;
    }
    dictData = res.items || dictData;
    closeModal();
    renderDictBody();
    showToast(lang==='en'?'✓ Saved':'✓ Đã lưu');
  }catch(e){
    showToast(lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại');
  }
}

async function deleteDictTerm(term){
  if(!isAdmin()) return;
  if(!confirm((lang==='en'?'Delete term':'Xóa thuật ngữ')+': '+term+' ?')) return;
  try{
    const res = await apiCall('dict_delete',{term});
    if(!(res && res.ok)){
      showToast((res && res.error)?('⚠ '+res.error):(lang==='en'?'⚠ Delete failed':'⚠ Xóa thất bại'));
      return;
    }
    dictData = res.items || dictData;
    renderDictBody();
    showToast(lang==='en'?'✓ Deleted':'✓ Đã xóa');
  }catch(e){
    showToast(lang==='en'?'⚠ Delete failed':'⚠ Xóa thất bại');
  }
}

function escapeHtml(s){
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function syncSidebarToggleState(){
  const sidebar = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle-btn');
  const toggleText = document.getElementById('collapse-text');
  if(!sidebar || !toggleBtn || !toggleText) return;
  const collapsed = sidebar.classList.contains('collapsed');
  const label = collapsed ? (typeof T === 'function' ? T('expand_menu') : 'M\u1edf r\u1ed9ng menu') : (typeof T === 'function' ? T('collapse_menu') : 'Thu g\u1ecdn menu');
  toggleBtn.setAttribute('aria-label', label);
  toggleBtn.setAttribute('title', label);
  toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  toggleText.textContent = collapsed ? (typeof T === 'function' ? T('expand') : 'M\u1edf r\u1ed9ng') : (typeof T === 'function' ? T('collapse') : 'Thu g\u1ecdn');
}

function toggleSidebar(){
  // Desktop only: collapse/expand
  if(window.innerWidth > 900){
    const sidebarEl = document.getElementById('sidebar');
    if(!sidebarEl) return;
    sidebarEl.classList.toggle('collapsed');
    syncSidebarToggleState();
    return;
    const s = document.getElementById('sidebar');
    s.classList.toggle('collapsed');
    const icon = document.getElementById('collapse-icon');
    icon.textContent = s.classList.contains('collapsed') ? '▷' : '◁';
  } else {
    toggleMobileSidebar();
  }
}

function toggleMobileSidebar(){
  const s = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  const isOpen = s.classList.contains('mobile-open');
  if(isOpen){
    closeMobileSidebar();
  } else {
    s.classList.add('mobile-open');
    if(bd) bd.classList.add('active');
  }
}

function closeMobileSidebar(){
  const s = document.getElementById('sidebar');
  const bd = document.getElementById('sidebar-backdrop');
  s.classList.remove('mobile-open');
  if(bd) bd.classList.remove('active');
}

function toggleUserMenu(){
  var dd=document.getElementById('user-dropdown');
  if(!dd)return;
  dd.style.display=dd.style.display==='block'?'none':'block';
  // Close on outside click
  if(dd.style.display==='block'){
    setTimeout(function(){
      document.addEventListener('click',function _close(ev){
        if(!dd.contains(ev.target)&&!ev.target.closest('.user-info')){
          dd.style.display='none';
          document.removeEventListener('click',_close);
        }
      });
    },50);
  }
}

// Close dropdown on outside click
document.addEventListener('click', e => {
  if(!e.target.closest('.user-info')&&!e.target.closest('#user-dropdown')){var _dd=document.getElementById('user-dropdown');if(_dd)_dd.style.display='none';}
});


// ═══════════════════════════════════════════════════
// ADMIN PANEL
// ═══════════════════════════════════════════════════
let adminTab = 'users';
let adminUserViewMode = 'cards'; // 'cards' or 'list'
let adminEditRole = 'ceo';
let adminUnsaved = false;

// In-flight write counter — incremented by the apiCall() wrapper for any
// POST/PUT/PATCH/DELETE so canReloadNow() can refuse to reload while a save
// is on the wire (otherwise the request aborts and the user sees a partial
// commit). Reads (GET) don't bump the counter — losing a re-fetchable read
// is harmless.
let _apiInFlightWrites = 0;

// Bridge for 00-version-check.js — when a backend deploy publishes a new
// build sha, the version checker calls this to ask "is it safe to reload
// the user's tab right now?". Returning false defers the auto-reload by
// 60s so admin edits in progress are not destroyed mid-typing.
//
// Other modules can extend the answer by adding their own dirty checks:
//   const prev = window.__hesemPortalCanReloadNow;
//   window.__hesemPortalCanReloadNow = () => prev() && !myFormDirty();
window.__hesemPortalCanReloadNow = function () {
  if (adminUnsaved) return false;
  if (_apiInFlightWrites > 0) return false;
  // Graphics draft buffer (00bb-graphics-authority.js): isEmpty() === false
  // means the user has an unsaved theme/token edit in flight.
  try {
    if (window.GraphicsAuthority
        && GraphicsAuthority.draft
        && typeof GraphicsAuthority.draft.isEmpty === 'function'
        && !GraphicsAuthority.draft.isEmpty()) {
      return false;
    }
  } catch (e) { /* be permissive — better to reload than to wedge */ }
  return true;
};
let adminManualRuntimeState = {
  loading:false,
  loaded:false,
  summary:null,
  lastCreated:null,
  error:''
};
let adminDataSourceState = {
  loading:false,
  loaded:false,
  error:'',
  draft:null,
  snapshot:null,
  dirty:false
};
const ADMIN_TAB_FILTER_DEFAULTS = {
  dept_title:{search:'',status:'all'},
  orgchart:{search:'',status:'all'},
  roles:{search:'',dept:'',status:'all'},
  activity:{search:'',actor:'',eventType:'',aggregateType:''}
};
let ADMIN_TAB_FILTERS = JSON.parse(JSON.stringify(ADMIN_TAB_FILTER_DEFAULTS));
const ADMIN_RUNTIME_ASSET_VERSION = '20260413c';
const ADMIN_MANUAL_MACHINE_ENTITIES = Object.freeze([
  'work_centers',
  'machines',
  'mes_connectivity_adapters',
  'mes_alarm_catalog',
  'mes_alarm_playbooks',
  'downtime_reason_codes',
  'downtime_resolution_codes',
  'tooling_assets'
]);
const ADMIN_MANUAL_MACHINE_ENTITY_LABELS = Object.freeze({
  work_centers:{vi:'Work center',en:'Work centers'},
  machines:{vi:'Máy / thiết bị',en:'Machines'},
  mes_connectivity_adapters:{vi:'Adapter kết nối MES',en:'MES connectivity adapters'},
  mes_alarm_catalog:{vi:'Danh mục alarm MES',en:'MES alarm catalog'},
  mes_alarm_playbooks:{vi:'Playbook alarm',en:'Alarm playbooks'},
  downtime_reason_codes:{vi:'Mã lý do downtime',en:'Downtime reason codes'},
  downtime_resolution_codes:{vi:'Mã khôi phục downtime',en:'Downtime resolution codes'},
  tooling_assets:{vi:'Dao / tooling',en:'Tooling assets'}
});

function adminFilterState(tab){
  if(!ADMIN_TAB_FILTERS[tab]){
    ADMIN_TAB_FILTERS[tab] = {};
  }
  return ADMIN_TAB_FILTERS[tab];
}

function setAdminFilter(tab, key, value){
  const state = adminFilterState(tab);
  state[key] = value == null ? '' : String(value);
  if(currentPage === 'admin'){
    renderAdmin();
  }
}

function resetAdminFilters(tab){
  if(!ADMIN_TAB_FILTER_DEFAULTS[tab]) return;
  ADMIN_TAB_FILTERS[tab] = JSON.parse(JSON.stringify(ADMIN_TAB_FILTER_DEFAULTS[tab]));
  if(currentPage === 'admin'){
    renderAdmin();
  }
}

function adminContainsNeedle(needle, values){
  const token = String(needle || '').trim().toLowerCase();
  if(!token) return true;
  return (values || []).some(value => String(value || '').toLowerCase().includes(token));
}

function showToast(msg, type, duration){
  duration = duration || 3000;
  var colorMap = {
    success: {bg:'#16a34a', icon:'✅'},
    error: {bg:'#dc2626', icon:'❌'},
    warning: {bg:'#d97706', icon:'⚠️'},
    info: {bg:'#2563eb', icon:'ℹ️'}
  };
  var style = colorMap[type] || colorMap.info;
  var t=document.createElement('div');
  t.className='toast';
  t.style.cssText='position:fixed;bottom:24px;right:24px;z-index:1500;padding:12px 20px;border-radius:10px;font-size:13px;font-weight:600;color:#fff;background:'+style.bg+';box-shadow:0 8px 24px rgba(0,0,0,0.2);opacity:0;transform:translateY(12px);transition:all .3s ease;max-width:420px;display:flex;align-items:center;gap:8px';
  t.innerHTML=style.icon+' '+String(msg||'');
  document.body.appendChild(t);
  requestAnimationFrame(function(){requestAnimationFrame(function(){t.style.opacity='1';t.style.transform='translateY(0)';});});
  setTimeout(function(){t.style.opacity='0';t.style.transform='translateY(12px)';setTimeout(function(){t.remove();},350);},duration);
}

function gitSyncStatusTone(status){
  const raw = String(status||'').toUpperCase();
  if(raw === 'RESTORE') return 'is-modify';
  if(raw === 'REMOVE') return 'is-delete';
  if(raw.startsWith('A') || raw === '??') return 'is-add';
  if(raw.startsWith('D')) return 'is-delete';
  if(raw.startsWith('R')) return 'is-rename';
  if(raw.startsWith('M')) return 'is-modify';
  return 'is-neutral';
}

function gitSyncRenderSimpleFileTable(items, emptyText){
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!rows.length){
    return `<div class="git-sync-empty">${escapeHtml(emptyText)}</div>`;
  }
  return `
    <div class="git-sync-table-wrap">
      <table class="git-sync-table">
        <thead>
          <tr>
            <th>${lang==='en'?'Status':'Trạng thái'}</th>
            <th>${lang==='en'?'Path':'Đường dẫn'}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row=>{
            const xy = String(row.xy || row.status || '').trim() || '--';
            const path = String(row.path || row || '').trim();
            return `<tr>
              <td><span class="git-sync-status ${gitSyncStatusTone(xy)}">${escapeHtml(xy)}</span></td>
              <td><code>${escapeHtml(path)}</code></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

async function adminSaveAll(){
  saveRetentionPolicy(getRetentionPolicy());

  // Server-backed settings
  try{
    const resRole = await saveRolePermsToServer();
    if(!(resRole && resRole.ok)){
      showToast((resRole && resRole.error) ? ('⚠ '+resRole.error) : (lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại'));
      return;
    }
    const resDocs = await saveDocVisibilityToServer();
    if(!(resDocs && resDocs.ok)){
      showToast((resDocs && resDocs.error) ? ('⚠ '+resDocs.error) : (lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại'));
      return;
    }
    const resOverrides = await saveUserDocOverridesToServer();
    if(!(resOverrides && resOverrides.ok)){
      showToast((resOverrides && resOverrides.error) ? ('⚠ '+resOverrides.error) : (lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại'));
      return;
    }
  }catch(e){
    showToast(lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại');
    return;
  }

  adminUnsaved = false;
  showToast(lang==='en'?'✅ All changes saved successfully':'✅ Đã lưu tất cả thay đổi thành công');
  renderAdmin();
}

let gitRepoStatusState = {loading:false, loaded:false, error:'', data:null};

function getGitRepoStatus(){
  return gitRepoStatusState && gitRepoStatusState.data && gitRepoStatusState.data.ok
    ? gitRepoStatusState.data
    : null;
}

function gitRepoFormatTime(value){
  const text = String(value||'').trim();
  if(!text) return '';
  const date = new Date(text);
  if(Number.isNaN(date.getTime())) return text;
  return date.toLocaleString(lang==='en' ? 'en-US' : 'vi-VN');
}

function gitRepoCommitHeadline(commit){
  if(!commit || typeof commit !== 'object') return '—';
  const hash = String(commit.short_hash || commit.hash || '').trim();
  const subject = String(commit.subject || '').trim();
  if(!hash && !subject) return '—';
  return `${hash}${subject ? ` ${subject}` : ''}`.trim();
}

function gitRepoCommitMeta(commit){
  if(!commit || typeof commit !== 'object') return '';
  const author = String(commit.author_name || '').trim();
  const committedAt = gitRepoFormatTime(commit.committed_at);
  return [author, committedAt].filter(Boolean).join(' • ');
}

function gitRepoRelativeState(status){
  if(!status) return {label:'—', tone:'neutral'};
  const ahead = Number(status.ahead_count || 0);
  const behind = Number(status.behind_count || 0);
  if(ahead > 0 && behind > 0){
    return {
      label: lang==='en' ? `Diverged (+${ahead} / -${behind})` : `Phân kỳ (+${ahead} / -${behind})`,
      tone: 'warn'
    };
  }
  if(behind > 0){
    return {
      label: lang==='en' ? `Behind ${behind}` : `Chậm ${behind} commit`,
      tone: 'info'
    };
  }
  if(ahead > 0){
    return {
      label: lang==='en' ? `Ahead ${ahead}` : `Đi trước ${ahead} commit`,
      tone: 'good'
    };
  }
  return {
    label: lang==='en' ? 'Up to date' : 'Đã đồng bộ',
    tone: 'good'
  };
}

function gitRepoWorkingTreeState(status){
  if(!status) return {label:'—', tone:'neutral'};
  const dirtyCount = Number(status.meaningful_dirty_count || 0);
  if(dirtyCount > 0){
    return {
      label: lang==='en' ? `${dirtyCount} local change(s)` : `${dirtyCount} thay đổi local`,
      tone: 'warn'
    };
  }
  return {
    label: lang==='en' ? 'Working tree clean' : 'Working tree sạch',
    tone: 'good'
  };
}

function gitRepoStatusPill(label, tone='neutral'){
  return `<span class="admin-sync-status-pill is-${escapeHtml(tone)}">${escapeHtml(label)}</span>`;
}

async function loadGitRepoStatus(options={}){
  const force = !!options.force;
  if(gitRepoStatusState.loading && !force) return;
  if(gitRepoStatusState.loaded && !force) return;
  gitRepoStatusState.loading = true;
  if(!options.silent && currentPage === 'admin') renderAdmin();
  try{
    const res = await apiCall('admin_git_status', null, 'GET');
    if(res && res.ok){
      gitRepoStatusState = {loading:false, loaded:true, error:'', data:res};
    }else{
      gitRepoStatusState = {
        loading:false,
        loaded:false,
        error:(res && (res.detail || res.error)) ? String(res.detail || res.error) : 'git_status_failed',
        data:null
      };
    }
  }catch(e){
    gitRepoStatusState = {
      loading:false,
      loaded:false,
      error:(e && e.message) ? String(e.message) : 'git_status_failed',
      data:null
    };
  }finally{
    if(currentPage === 'admin') renderAdmin();
  }
}

function adminRefreshGitRepoStatus(){
  loadGitRepoStatus({force:true});
}

function adminGitSyncIcon(kind){
  if(kind === 'pull'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12"></path><path d="m7 11 5 5 5-5"></path><path d="M5 19h14"></path></svg>';
  }
  if(kind === 'push'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V8"></path><path d="m7 13 5-5 5 5"></path><path d="M5 5h14"></path></svg>';
  }
  if(kind === 'discard'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16"></path><path d="M9 7V4h6v3"></path><path d="m10 11 4 4"></path><path d="m14 11-4 4"></path><path d="M6 7l1 12h10l1-12"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.66-5.66L20 8"></path><path d="M20 4v4h-4"></path><path d="M20 12a8 8 0 0 1-13.66 5.66L4 16"></path><path d="M4 20v-4h4"></path></svg>';
}







function renderAdminSyncPanelV2(){
  const status = gitRepoStatusState.data && typeof gitRepoStatusState.data === 'object' ? gitRepoStatusState.data : null;
  const statusError = String(gitRepoStatusState.error || '').trim();
  const relativeState = gitRepoRelativeState(status);
  const workingTreeState = gitRepoWorkingTreeState(status);
  const dirtyEntries = Array.isArray(status && status.meaningful_dirty_entries) ? status.meaningful_dirty_entries : [];
  const fetchError = String((status && status.fetch_error) || '').trim();
  const remoteRefStale = !!(status && status.remote_ref_stale);
  const branch = String((status && status.branch) || 'main');
  const remoteBranch = String((status && status.remote_branch) || `origin/${branch}`);
  const repoPath = String((status && status.repo_path) || '--');
  const remoteUrl = String((status && status.remote_url) || '--');
  const headMeta = gitRepoCommitMeta(status && status.head) || (lang==='en' ? 'No local commit metadata available.' : 'Chưa đọc được metadata commit local.');
  const remoteMeta = gitRepoCommitMeta(status && status.remote_head) || (lang==='en' ? 'No remote commit metadata available.' : 'Chưa đọc được metadata commit remote.');
  const metaRow = (label, value, code=false) => `
    <div class="admin-sync-meta-row">
      <div class="admin-sync-meta-label">${escapeHtml(label)}</div>
      <div class="admin-sync-meta-value">${code ? `<code>${escapeHtml(value || '--')}</code>` : escapeHtml(value || '--')}</div>
    </div>`;
  const notice = (() => {
    if(gitRepoStatusState.loading && !status){
      return `<div class="admin-sync-callout-bar is-info">${escapeHtml(lang==='en' ? 'Refreshing repository status from the VPS…' : 'Đang làm mới trạng thái repo từ VPS…')}</div>`;
    }
    if(statusError){
      return `<div class="admin-sync-callout-bar is-error">${escapeHtml((lang==='en' ? 'Could not read repository status. ' : 'Không đọc được trạng thái repo. ') + statusError)}</div>`;
    }
    if(fetchError){
      return `<div class="admin-sync-callout-bar is-warn">${escapeHtml((lang==='en' ? 'Origin probe warning (server-side, harmless): ' : 'Cảnh báo probe origin (phía server, không ảnh hưởng): ') + fetchError)}</div>`;
    }
    if(remoteRefStale){
      return `<div class="admin-sync-callout-bar is-info">${escapeHtml(lang==='en' ? 'Origin has new commits the VPS has not fetched yet. Counts shown below are based on the cached remote ref and will refresh after the next deploy.' : 'Origin có commit mới mà VPS chưa fetch. Số liệu bên dưới đang dựa trên ref remote cache và sẽ làm mới sau lần deploy tiếp theo.')}</div>`;
    }
    if(status && Number(status.meaningful_dirty_count || 0) > 0){
      return `<div class="admin-sync-callout-bar is-warn">${escapeHtml(lang==='en' ? 'The checked-out branch on the VPS has local changes. Resolve them via SSH or re-run the deploy script.' : 'Nhánh đang checkout trên VPS có thay đổi local. Hãy SSH vào VPS để xử lý hoặc chạy lại deploy script.')}</div>`;
    }
    if(status && Number(status.behind_count || 0) > 0){
      return `<div class="admin-sync-callout-bar is-good">${escapeHtml(lang==='en' ? `Origin has ${Number(status.behind_count || 0)} newer commit(s). Run the deploy pipeline to apply.` : `Origin đang có ${Number(status.behind_count || 0)} commit mới hơn. Chạy deploy pipeline để áp dụng.`)}</div>`;
    }
    return `<div class="admin-sync-callout-bar is-info">${escapeHtml(lang==='en' ? 'This repository is aligned with its tracked remote branch.' : 'Repo này đang khớp với nhánh remote được theo dõi.')}</div>`;
  })();

  const deployTitle = lang==='en' ? 'How deployment works' : 'Quy trình deploy chuẩn';
  const deploySteps = lang==='en'
    ? [
        'Push commits to <code>main</code> on GitHub (locally or via PR merge).',
        'GitHub Actions runs <code>.github/workflows/deploy.yml</code>: validates code, then SSHs into the VPS and runs <code>tools/vps-setup/scripts/deploy.sh</code>.',
        'The deploy script tags a rollback point, fetches origin, refreshes Composer dependencies, copies private config, fixes permissions, runs DB migrations, reloads PHP-FPM, and then runs the healthcheck.',
        'For an out-of-band deploy: SSH to the VPS and run <code>sudo bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh</code>.'
      ]
    : [
        'Đẩy commit lên <code>main</code> trên GitHub (commit local hoặc merge PR).',
        'GitHub Actions chạy <code>.github/workflows/deploy.yml</code>: validate code, sau đó SSH vào VPS và gọi <code>tools/vps-setup/scripts/deploy.sh</code>.',
        'Script deploy tạo tag rollback, fetch origin, làm mới Composer dependencies, copy private config, sửa permission, chạy DB migration, reload PHP-FPM rồi chạy healthcheck.',
        'Khi cần deploy thủ công: SSH vào VPS rồi chạy <code>sudo bash /var/www/eqms.hesemeng.com/tools/vps-setup/scripts/deploy.sh</code>.'
      ];

  return `
    <section class="admin-sync-strip admin-sync-strip--cpanel">
      <div class="admin-sync-head admin-sync-head--cpanel">
        <div class="admin-sync-title-wrap">
          <div class="admin-sync-kicker">${lang==='en' ? 'Version control' : 'Điều khiển phiên bản'}</div>
          <h3>${lang==='en' ? 'Repository status (read-only)' : 'Trạng thái repo (chỉ đọc)'}</h3>
          <p>${lang==='en'
            ? 'This panel observes the live VPS repository. Code changes flow through the deploy pipeline below — the portal never writes to the working tree.'
            : 'Bảng này quan sát repo trên VPS. Thay đổi code đi qua pipeline deploy bên dưới — portal không ghi trực tiếp vào working tree.'}</p>
        </div>
        <div class="admin-sync-head-actions">
          <button class="admin-sync-mini" onclick="adminRefreshGitRepoStatus()">
            <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
            <span>${lang==='en' ? 'Refresh status' : 'Làm mới trạng thái'}</span>
          </button>
          <button class="admin-sync-mini" onclick="rescanDocs().then(n=>{showToast('Scanned: '+n+' docs');renderAdmin()})">
            <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
            <span>${lang==='en' ? 'Rescan folders' : 'Quét lại thư mục'}</span>
          </button>
        </div>
      </div>
      ${notice}
      <div class="admin-sync-cpanel-grid">
        <article class="admin-sync-cpanel-card">
          <div class="admin-sync-panel-title">${lang==='en' ? 'Basic information' : 'Thông tin cơ bản'}</div>
          <div class="admin-sync-meta-list">
            ${metaRow(lang==='en' ? 'Repository path' : 'Đường dẫn repo', repoPath, true)}
            ${metaRow(lang==='en' ? 'Remote URL' : 'Remote URL', remoteUrl, true)}
            ${metaRow(lang==='en' ? 'Checked-out branch' : 'Nhánh đang checkout', branch)}
            ${metaRow(lang==='en' ? 'Tracked remote branch' : 'Nhánh remote đang theo dõi', remoteBranch)}
            ${metaRow(lang==='en' ? 'Server time' : 'Thời gian server', gitRepoFormatTime(status && status.server_time) || '--')}
          </div>
        </article>
        <article class="admin-sync-cpanel-card">
          <div class="admin-sync-panel-title">${lang==='en' ? 'Remote state' : 'Trạng thái remote'}</div>
          <div class="admin-sync-pill-row">
            ${gitRepoStatusPill(relativeState.label, relativeState.tone)}
            ${gitRepoStatusPill(workingTreeState.label, workingTreeState.tone)}
          </div>
          <div class="admin-sync-commit-stack">
            <div class="admin-sync-commit-card">
              <div class="admin-sync-commit-kicker">${lang==='en' ? 'HEAD commit' : 'Commit HEAD'}</div>
              <strong>${escapeHtml(gitRepoCommitHeadline(status && status.head))}</strong>
              <span>${escapeHtml(headMeta)}</span>
            </div>
            <div class="admin-sync-commit-card is-remote">
              <div class="admin-sync-commit-kicker">${lang==='en' ? 'Remote HEAD' : 'HEAD remote'}</div>
              <strong>${escapeHtml(gitRepoCommitHeadline(status && status.remote_head))}</strong>
              <span>${escapeHtml(remoteMeta)}</span>
            </div>
          </div>
        </article>
      </div>
      ${dirtyEntries.length ? `
        <div class="admin-sync-cpanel-card admin-sync-cpanel-card--full">
          <div class="admin-sync-panel-title">${lang==='en' ? 'Local changes on the VPS working tree' : 'Thay đổi local trên working tree VPS'}</div>
          ${gitSyncRenderSimpleFileTable(dirtyEntries, lang==='en' ? 'The checked-out branch is clean.' : 'Nhánh đang checkout đang sạch.')}
        </div>
      ` : ''}
      <article class="admin-sync-cpanel-card admin-sync-cpanel-card--full">
        <div class="admin-sync-panel-title">${escapeHtml(deployTitle)}</div>
        <ol class="admin-sync-deploy-steps">
          ${deploySteps.map(step => `<li>${step}</li>`).join('')}
        </ol>
      </article>
    </section>`;
}

function markUnsaved(){
  adminUnsaved = true;
  const bar = document.getElementById('admin-save-bar');
  if(bar) bar.style.display = 'flex';
}

function renderAdminVersionControl(){
  const el = document.getElementById('admin-content');
  if(!gitRepoStatusState.loaded && !gitRepoStatusState.loading && !gitRepoStatusState.error){
    loadGitRepoStatus({silent:true});
  }
  el.innerHTML = renderAdminSyncPanelV2();
}

function renderAdminInfrastructure(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  if(typeof window._renderVpsControlTower === 'function'){
    window._renderVpsControlTower(el);
    return;
  }
  el.innerHTML = '<div class="hm-empty">' + (lang==='en' ? 'Loading VPS infrastructure module...' : 'Đang tải module hạ tầng VPS...') + '</div>';
}

function adminTabLabel(meta){
  if(!meta) return '';
  if(meta.id === 'metadata_studio') return 'Data Schema';
  return lang==='en' ? meta.labelEn : meta.labelVi;
}

function adminTabGroupCatalog(){
  return [
    {id:'identity', labelEn:'Identity & org', labelVi:'Nhân sự & tổ chức'},
    {id:'governance', labelEn:'Governance', labelVi:'Quản trị điều hành'},
    {id:'content', labelEn:'Content & experience', labelVi:'Nội dung & trải nghiệm'},
    {id:'data', labelEn:'Data platform', labelVi:'Nền tảng dữ liệu'},
    {id:'operations', labelEn:'Operations', labelVi:'Vận hành'},
    {id:'security', labelEn:'Security', labelVi:'Bảo mật'}
  ];
}

function adminTabBadgeValue(tabId){
  if(tabId === 'users') return USERS.length;
  if(tabId === 'activity'){
    if(!canViewActivityLog()) return '';
    if(ADMIN_AUTH_STATE.audit.loading && !ADMIN_AUTH_STATE.audit.loaded) return '…';
    return ADMIN_AUTH_STATE.audit.events.length;
  }
  return '';
}

function renderAdminTabNavigation(){
  const sections = adminTabGroupCatalog().map(group => {
    const items = moduleAccessAdminTabCatalog().filter(meta => meta.group === group.id).filter(meta => {
      if(meta.id === 'activity' && !canViewActivityLog()) return false;
      return canUserAccessAdminTab(meta.id);
    });
    if(!items.length) return '';
    const buttons = items.map(meta => {
      const badge = adminTabBadgeValue(meta.id);
      return `<button class="admin-tab-v2 ${adminTab===meta.id?'active':''}" onclick="adminTab='${meta.id}';renderAdmin()">
        <span class="admin-tab-icon">${escapeHtml(meta.icon || '•')}</span>
        <span class="admin-tab-label">${escapeHtml(adminTabLabel(meta))}</span>
        ${badge !== '' ? `<span class="tab-badge">${escapeHtml(String(badge))}</span>` : ''}
      </button>`;
    }).join('');
    return `<section class="admin-nav-group">
      <div class="admin-nav-group-title">${escapeHtml(lang==='en' ? group.labelEn : group.labelVi)}</div>
      <div class="admin-nav-group-list">${buttons}</div>
    </section>`;
  }).filter(Boolean).join('');

  return `<div class="admin-nav-panel">
    <div class="admin-nav-panel-head">
      <div class="portal-display-kicker">${lang==='en' ? 'Admin console' : 'Bảng điều khiển Admin'}</div>
      <h3>${lang==='en' ? 'System control, grouped by domain' : 'Điều khiển hệ thống theo từng miền chức năng'}</h3>
      <p>${lang==='en'
        ? 'Data Schema sits directly above VPS Infrastructure, and every workspace in this rail is governed by the same access matrix.'
        : 'Data Schema nằm ngay phía trên Hạ tầng VPS, và toàn bộ workspace trong rail này đi qua cùng một ma trận phân quyền.'}</p>
    </div>
    <div class="admin-nav-groups">${sections}</div>
  </div>`;
}

function adminScopedLayout(headHtml, bodyHtml, bodyClass){
  return `
    <section class="admin-scroll-layout">
      <div class="admin-scroll-head">${headHtml || ''}</div>
      <div class="admin-scroll-body${bodyClass ? ' ' + bodyClass : ''}">${bodyHtml || ''}</div>
    </section>`;
}

function renderAdmin(){
  if(!canUserAccessModule('admin')){
    document.getElementById('page-admin').innerHTML='<div style="text-align:center;padding:60px;color:var(--text-3)">\u26A0 '+T('no_docs')+'</div>';
    return;
  }
  if(!canUserAccessAdminTab(adminTab)){
    adminTab = firstAccessibleAdminTab();
  }
  syncPortalScrollMode('admin', adminTab);
  const el = document.getElementById('page-admin');
  if(['users','dept_title','orgchart'].includes(adminTab)) loadAuthoritativeOrgCatalog({silent:true});
  if(['users','roles','activity'].includes(adminTab)) loadAuthoritativeRoleCatalog({silent:true});
  if(adminTab === 'activity') loadAuthoritativeAuditTrail({silent:true});
  el.innerHTML = `
    <div class="admin-console-shell">
      <aside class="admin-console-rail">
        ${renderAdminTabNavigation()}
      </aside>
      <div class="admin-console-main">
        <div class="admin-panel ${adminTabUsesScopedScroll(adminTab) ? 'is-scoped-scroll' : ''}" id="admin-content"></div>
      </div>
    </div>
  `;
  if(adminTab==='version_control' && !gitRepoStatusState.loaded && !gitRepoStatusState.loading && !gitRepoStatusState.error){
    loadGitRepoStatus({silent:true});
  }
  if(adminTab==='users') renderAdminUsers();
  if(adminTab==='dept_title') renderAdminDeptTitle();
  if(adminTab==='perms') renderAdminPerms();
  if(adminTab==='roles') renderAdminRoles();
  if(adminTab==='orgchart') renderAdminOrgChart();
  if(adminTab==='activity') renderAdminActivity();
  if(adminTab==='module_access'){
    renderAdminModuleAccess();
    loadModuleAccessConfigFromServer({silent:true});
  }
  if(adminTab==='docs') renderAdminEffectiveDocs();
  if(adminTab==='infrastructure') renderAdminInfrastructure();
  if(adminTab==='manual_runtime') renderAdminManualRuntime();
  if(adminTab==='data_sources') renderAdminDataSources();
  if(adminTab==='metadata_studio') renderAdminMetadataStudio();
  if(adminTab==='version_control') renderAdminVersionControl();
  if(adminTab==='portal_display'){
    renderAdminPortalDisplay();
    loadPortalDisplayConfigFromServer({silent:true});
  }
  if(adminTab==='retention') renderAdminRetention();
  if(adminTab==='mfa') renderAdminMfa();
  if(adminTab==='ai_control') renderAdminAiControl();
  if(adminTab==='appearance') renderAdminAppearance();
}

/* ── Admin: AI Control Tab ───────────────────────────────────────────────── */
function renderAdminAiControl(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  if(typeof window._renderAdminAiControl === 'function'){
    window._renderAdminAiControl(el);
    return;
  }
  el.innerHTML = '<div class="hm-empty">'+(lang==='en'?'Loading AI Control...':'Đang tải AI Control...')+'</div>';
  var existing = document.getElementById('admin-ai-control-script');
  if(existing){ existing.remove(); }
  var s = document.createElement('script');
  s.id  = 'admin-ai-control-script';
  s.src = (window.HmRuntimePaths && HmRuntimePaths.scriptsBase ? HmRuntimePaths.scriptsBase : 'scripts/portal/') + '00d-admin-ai-control.js?v=' + (window.APP_VERSION || Date.now());
  s.onload = function(){ if(typeof window._renderAdminAiControl === 'function') window._renderAdminAiControl(el); };
  document.head.appendChild(s);
}

/* ── Admin: Appearance Settings — Enterprise Theme Editor v2 ─────────────── */
var _appSubTab = 'templates';

function renderAdminMetadataStudio(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  if(typeof window._renderAdminMetadataStudio === 'function'){
    window._renderAdminMetadataStudio(el);
    return;
  }
  el.innerHTML='<div class="hm-empty">'+(lang==='en'?'Loading Data Schema...':'Dang tai Data Schema...')+'</div>';
  var existing=document.getElementById('admin-metadata-studio-script');
  if(existing){
    var tries=0;
    (function waitForStudio(){
      if(typeof window._renderAdminMetadataStudio === 'function'){
        window._renderAdminMetadataStudio(el);
        return;
      }
      if(tries < 40){
        tries += 1;
        setTimeout(waitForStudio, 150);
        return;
      }
      el.innerHTML='<div class="hm-empty">Failed to initialize Data Schema.</div>';
    })();
    return;
  }
  var script=document.createElement('script');
  script.id='admin-metadata-studio-script';
  script.src='scripts/portal/32-admin-metadata-studio.js?v=' + ADMIN_RUNTIME_ASSET_VERSION;
  script.onload=function(){
    if(typeof window._renderAdminMetadataStudio === 'function'){
      window._renderAdminMetadataStudio(el);
    }
  };
  script.onerror=function(){
    el.innerHTML='<div class="hm-empty">Failed to load Data Schema. Check 32-admin-metadata-studio.js</div>';
  };
  document.head.appendChild(script);
}

function renderAdminAppearance(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  var expectedVersion = ADMIN_RUNTIME_ASSET_VERSION;
  /* Delegate to external file if loaded, otherwise fallback inline */
  if(typeof window._renderAdminAppearanceFull === 'function' && window._renderAdminAppearanceFullVersion === expectedVersion){
    window._renderAdminAppearanceFull(el, _appSubTab, lang);
    return;
  }
  var existing = document.getElementById('hm-admin-appearance-script');
  if(existing) existing.remove();
  try {
    delete window._renderAdminAppearanceFull;
    delete window._renderAdminAppearanceFullVersion;
  } catch(e){
    window._renderAdminAppearanceFull = null;
    window._renderAdminAppearanceFullVersion = null;
  }
  var scriptUrl = 'scripts/portal/00c-admin-appearance.js?v=' + expectedVersion;
  var renderLoaded = function(){
    if(typeof window._renderAdminAppearanceFull === 'function'){
      window._renderAdminAppearanceFull(el, _appSubTab, lang);
    }
  };
  var renderError = function(){
    el.innerHTML = '<div class="hm-empty">Failed to load appearance editor. Check 00c-admin-appearance.js</div>';
  };
  var loadViaScriptTag = function(){
    var script = document.createElement('script');
    script.id = 'hm-admin-appearance-script';
    script.charset = 'UTF-8';
    script.src = scriptUrl;
    script.onload = renderLoaded;
    script.onerror = renderError;
    document.head.appendChild(script);
  };
  var loadViaUtf8Decode = function(){
    if(!(window.fetch && window.TextDecoder)){
      loadViaScriptTag();
      return;
    }
    fetch(scriptUrl, { cache:'no-store' })
      .then(function(res){
        if(!res.ok) throw new Error('appearance_fetch_failed');
        return res.arrayBuffer();
      })
      .then(function(buf){
        var source = new TextDecoder('utf-8').decode(buf);
        var script = document.createElement('script');
        script.id = 'hm-admin-appearance-script';
        script.charset = 'UTF-8';
        script.text = source + '\n//# sourceURL=' + scriptUrl;
        document.head.appendChild(script);
        renderLoaded();
      })
      .catch(function(){
        loadViaScriptTag();
      });
  };
  loadViaUtf8Decode();
}

function renderAdminMfa(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-3)">Đang tải cài đặt MFA...</div>';

  apiCall('admin_mfa_settings_get',{},'GET').then(function(res){
    if(!res||!res.ok){
      el.innerHTML='<div style="color:var(--red);padding:20px">Lỗi tải MFA settings: '+(res?res.error:'unknown')+'</div>';
      return;
    }
    const d=res;
    const requireMfa=d.require_mfa;
    const users=d.users_mfa||[];
    const enrolled=d.mfa_enrolled||0;
    const total=d.total_users||0;

    let html='<div style="margin-bottom:24px">';
    html+='<h3 style="font-size:16px;font-weight:700;margin-bottom:12px">'+(lang==='en'?'MFA Security Settings':'Cài đặt bảo mật MFA')+'</h3>';

    // Global toggle
    html+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:16px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px">';
    html+='<label style="font-weight:600;flex:1">'+(lang==='en'?'Require MFA for all users':'Yêu cầu MFA cho tất cả người dùng')+'</label>';
    html+='<button id="mfa-toggle-btn" style="padding:8px 20px;border-radius:6px;border:none;cursor:pointer;font-weight:600;color:#fff;background:'+(requireMfa?'var(--green)':'var(--red)')+'">'+(requireMfa?(lang==='en'?'ON — Required':'BẬT — Bắt buộc'):(lang==='en'?'OFF — Not required':'TẮT — Không bắt buộc'))+'</button>';
    html+='</div>';

    // Stats
    html+='<div style="display:flex;gap:16px;margin-bottom:20px">';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700">'+total+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'Total users':'Tổng người dùng')+'</div></div>';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--green)">'+enrolled+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'MFA enrolled':'Đã đăng ký MFA')+'</div></div>';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700;color:'+(requireMfa?'var(--red)':'var(--text-3)')+'">'+(total-enrolled)+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'Not enrolled':'Chưa đăng ký')+'</div></div>';
    html+='</div>';

    // User table
    html+='<h4 style="font-size:14px;font-weight:600;margin-bottom:8px">'+(lang==='en'?'Per-User MFA Status':'Trạng thái MFA theo người dùng')+'</h4>';
    html+='<table style="width:100%;border-collapse:collapse;font-size:13px">';
    html+='<thead><tr style="background:var(--bg-surface-alt,var(--bg));border-bottom:1px solid var(--border)"><th style="padding:8px;text-align:left">'+(lang==='en'?'User':'Người dùng')+'</th><th style="padding:8px;text-align:left">'+(lang==='en'?'Name':'Họ tên')+'</th><th style="padding:8px;text-align:left">'+(lang==='en'?'Role':'Vai trò')+'</th><th style="padding:8px;text-align:center">MFA</th><th style="padding:8px;text-align:center">'+(lang==='en'?'Actions':'Thao tác')+'</th></tr></thead><tbody>';

    users.forEach(function(u){
      html+='<tr style="border-bottom:1px solid var(--border)">';
      html+='<td style="padding:8px;font-weight:600">'+String(u.username||'')+'</td>';
      html+='<td style="padding:8px">'+String(u.name||'')+'</td>';
      html+='<td style="padding:8px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border)">'+String(u.role||'')+'</span></td>';
      html+='<td style="padding:8px;text-align:center">'+(u.mfa_enabled?'<span style="color:var(--green);font-weight:700">✓ '+('BẬT')+'</span>':'<span style="color:var(--text-3)">✗ '+('TẮT')+'</span>')+'</td>';
      html+='<td style="padding:8px;text-align:center">';
      if(u.mfa_enabled){
        html+='<button data-mfa-reset="'+String(u.username||'')+'" style="padding:4px 10px;border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;background:var(--bg-surface,#fff);color:var(--text-primary)">'+(lang==='en'?'Reset':'Đặt lại')+'</button> ';
        html+='<button data-mfa-disable="'+String(u.username||'')+'" style="padding:4px 10px;border:1px solid color-mix(in srgb, var(--red) 30%, var(--border));border-radius:4px;cursor:pointer;font-size:11px;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));color:var(--red)">'+(lang==='en'?'Disable':'Tắt')+'</button>';
      } else {
        html+='<span style="color:var(--text-3);font-size:11px">'+(lang==='en'?'Will enroll on login':'Sẽ đăng ký khi đăng nhập')+'</span>';
      }
      html+='</td></tr>';
    });

    html+='</tbody></table></div>';
    el.innerHTML=html;

    // Event handlers
    document.getElementById('mfa-toggle-btn').addEventListener('click',function(){
      var newVal=!requireMfa;
      apiCall('admin_mfa_settings_save',{require_mfa:newVal}).then(function(r){
        if(r&&r.ok){ renderAdminMfa(); }
        else { alert('Lỗi: '+(r?r.error:'unknown')); }
      });
    });

    el.querySelectorAll('[data-mfa-reset]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var username=this.getAttribute('data-mfa-reset');
        if(!confirm((lang==='en'?'Reset MFA for ':'Đặt lại MFA cho ')+username+'?')) return;
        apiCall('admin_mfa_settings_save',{reset_user:username}).then(function(r){
          if(r&&r.ok) renderAdminMfa();
        });
      });
    });

    el.querySelectorAll('[data-mfa-disable]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var username=this.getAttribute('data-mfa-disable');
        if(!confirm((lang==='en'?'Disable MFA for ':'Tắt MFA cho ')+username+'?')) return;
        apiCall('admin_mfa_settings_save',{disable_user:username}).then(function(r){
          if(r&&r.ok) renderAdminMfa();
        });
      });
    });
  });
}

function setModuleAccessConfigDirty(value){
  moduleAccessConfigDirty = !!value;
  const bar = document.getElementById('module-access-save-bar');
  if(bar) bar.style.display = moduleAccessConfigDirty ? 'flex' : 'none';
}

function moduleAccessRoleOptions(){
  const out = [];
  const seen = new Set();
  const candidateRoles = [
    ...ADMIN_ROLES,
    ...Object.keys(ROLES || {}),
    ...(Array.isArray(USERS) ? USERS.map(user => user && user.role) : []),
    ...PURCHASING_MODULE_DEFAULT_ROLES
  ];
  candidateRoles.forEach(role => {
    const id = normalizeAccessRole(role);
    if(!id || seen.has(id)) return;
    seen.add(id);
    const meta = ROLES[id] || {};
    out.push({
      id,
      label: lang==='en' ? (meta.labelEn || meta.label || id) : (meta.label || meta.labelEn || id),
      group: ADMIN_ROLES.includes(id) ? 'admin' : 'ops'
    });
  });
  return out.sort((a, b) => {
    if(a.group !== b.group) return a.group === 'admin' ? -1 : 1;
    return String(a.label).localeCompare(String(b.label), lang==='en' ? 'en' : 'vi');
  });
}

function updateModuleAccessDraft(scope, id, updater){
  const draft = ensureModuleAccessConfigDraft();
  const bucket = scope === 'admin_tabs' ? draft.admin_tabs : draft.portal_modules;
  const meta = moduleAccessMeta(scope, id);
  if(!bucket || !meta || !bucket[id] || meta.locked) return;
  const current = sanitizeModuleAccessPolicy(bucket[id], meta);
  bucket[id] = sanitizeModuleAccessPolicy(typeof updater === 'function' ? updater(current) : current, meta);
  setModuleAccessConfigDirty(true);
  renderAdminModuleAccess();
}

function setModuleAccessEnabled(scope, id, enabled){
  updateModuleAccessDraft(scope, id, current => Object.assign({}, current, {enabled: !!enabled}));
}

function setModuleAccessMode(scope, id, mode){
  updateModuleAccessDraft(scope, id, current => Object.assign({}, current, {
    access: ['all','admin','roles'].includes(String(mode || '').toLowerCase()) ? String(mode).toLowerCase() : current.access
  }));
}

function toggleModuleAccessRole(scope, id, role, enabled){
  const safeRole = normalizeAccessRole(role);
  if(!safeRole) return;
  updateModuleAccessDraft(scope, id, current => {
    const roles = new Set(Array.isArray(current.roles) ? current.roles : []);
    if(enabled) roles.add(safeRole);
    else roles.delete(safeRole);
    return Object.assign({}, current, {roles: Array.from(roles)});
  });
}

function resetModuleAccessConfigDraft(){
  MODULE_ACCESS_CONFIG_DRAFT = sanitizeModuleAccessConfig(MODULE_ACCESS_CONFIG);
  setModuleAccessConfigDirty(false);
  renderAdminModuleAccess();
}

async function saveModuleAccessConfig(){
  if(!isAdmin()) return;
  const draft = sanitizeModuleAccessConfig(ensureModuleAccessConfigDraft());
  const current = sanitizeModuleAccessConfig(MODULE_ACCESS_CONFIG);
  if(moduleAccessConfigFingerprint(draft) === moduleAccessConfigFingerprint(current)){
    showToast(lang==='en' ? 'No module access changes to save.' : 'Không có thay đổi phân quyền module để lưu.');
    return;
  }
  try{
    const res = await apiCall('admin_module_access_save', {config: draft});
    if(!(res && res.ok && res.config)){
      showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en' ? 'Save failed.' : 'Lưu cấu hình thất bại.')));
      return;
    }
    applyModuleAccessConfig(res.config, {forceDraftSync:true});
    setModuleAccessConfigDirty(false);
    if(currentPage === 'admin' && !canUserAccessAdminTab(adminTab)){
      adminTab = firstAccessibleAdminTab();
    }
    renderSidebar();
    renderAdmin();
    showToast(lang==='en' ? 'Module access updated.' : 'Đã cập nhật phân quyền module.');
  }catch(e){
    showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'Save failed.' : 'Lưu cấu hình thất bại.')));
  }
}

function moduleAccessGroupLabel(scope, group){
  const groups = scope === 'admin_tabs'
    ? {
        identity: lang==='en' ? 'Identity & org' : 'Nhân sự & tổ chức',
        governance: lang==='en' ? 'Governance' : 'Quản trị điều hành',
        content: lang==='en' ? 'Content & portal' : 'Nội dung & portal',
        data: lang==='en' ? 'Data & infrastructure' : 'Dữ liệu & hạ tầng',
        operations: lang==='en' ? 'Operations' : 'Vận hành',
        security: lang==='en' ? 'Security' : 'Bảo mật'
      }
    : {
        core: lang==='en' ? 'Core portal' : 'Portal lõi',
        production: lang==='en' ? 'Production' : 'Sản xuất',
        supply: lang==='en' ? 'Supply chain' : 'Chuỗi cung ứng',
        quality: lang==='en' ? 'Quality' : 'Chất lượng',
        records: lang==='en' ? 'Records & reporting' : 'Hồ sơ & báo cáo',
        tools: lang==='en' ? 'Tools' : 'Công cụ',
        admin: 'Admin'
      };
  return groups[group] || group;
}

function renderModuleAccessScope(scope, roleOptions){
  const draft = ensureModuleAccessConfigDraft();
  const bucket = scope === 'admin_tabs' ? draft.admin_tabs : draft.portal_modules;
  const grouped = {};
  moduleAccessCatalog(scope).forEach(meta => {
    const group = String(meta.group || 'other');
    if(!grouped[group]) grouped[group] = [];
    grouped[group].push(meta);
  });
  return Object.keys(grouped).map(group => {
    const rows = grouped[group].map(meta => {
      const policy = sanitizeModuleAccessPolicy(bucket[meta.id], meta);
      const roleChecks = roleOptions.map(role => {
        const checked = Array.isArray(policy.roles) && policy.roles.includes(role.id) ? 'checked' : '';
        return `<label class="module-access-role-chip ${checked ? 'is-active' : ''}">
          <input type="checkbox" ${checked} onchange="toggleModuleAccessRole('${scope}','${meta.id}','${role.id}', this.checked)">
          <span>${escapeHtml(role.label)}</span>
        </label>`;
      }).join('');
      const deprecatedBadge = meta.deprecated
        ? ` <span style="display:inline-block;font-size:0.7em;padding:1px 5px;border-radius:3px;background:rgba(255,160,0,0.15);color:#f59e0b;vertical-align:middle;font-weight:600">${lang==='en'?'Deprecated':'Đã hợp nhất'}</span>`
        : '';
      return `<article class="module-access-row ${policy.enabled ? '' : 'is-disabled'}${meta.deprecated ? ' is-deprecated' : ''}" style="${meta.deprecated ? 'opacity:0.65' : ''}">
        <div class="module-access-row-main">
          <label class="module-access-toggle">
            <input type="checkbox" ${policy.enabled ? 'checked' : ''} ${meta.locked ? 'disabled' : ''} onchange="setModuleAccessEnabled('${scope}','${meta.id}', this.checked)">
            <span class="module-access-toggle-copy">
              <b>${escapeHtml(meta.icon || '•')} ${escapeHtml(lang==='en' ? meta.labelEn : meta.labelVi)}</b>${deprecatedBadge}
              <small>${escapeHtml(lang==='en' ? meta.noteEn : meta.noteVi)}</small>
            </span>
          </label>
        </div>
        <div class="module-access-row-side">
          <select class="portal-display-input module-access-select" ${meta.locked ? 'disabled' : ''} onchange="setModuleAccessMode('${scope}','${meta.id}', this.value)">
            <option value="all" ${policy.access==='all' ? 'selected' : ''}>${lang==='en' ? 'All logged-in users' : 'Mọi người dùng đã đăng nhập'}</option>
            <option value="admin" ${policy.access==='admin' ? 'selected' : ''}>${lang==='en' ? 'Admin roles only' : 'Chỉ nhóm admin'}</option>
            <option value="roles" ${policy.access==='roles' ? 'selected' : ''}>${lang==='en' ? 'Selected roles' : 'Vai trò chỉ định'}</option>
          </select>
          ${meta.locked ? `<span class="portal-display-chip is-static">${lang==='en' ? 'Locked' : 'Cố định'}</span>` : ''}
        </div>
        ${policy.access === 'roles' ? `<div class="module-access-roles">${roleChecks}</div>` : ''}
      </article>`;
    }).join('');
    return `<section class="module-access-scope-card">
      <div class="module-access-scope-head">
        <h4>${escapeHtml(moduleAccessGroupLabel(scope, group))}</h4>
        <small>${scope === 'admin_tabs'
          ? escapeHtml(lang==='en' ? 'Admin workspaces governed from the same access matrix.' : 'Các workspace trong Admin được quản bởi cùng một ma trận quyền.')
          : escapeHtml(lang==='en' ? 'Portal modules exposed in left navigation and direct routes.' : 'Các module portal hiển thị ở menu trái và route trực tiếp.')}</small>
      </div>
      <div class="module-access-scope-body">${rows}</div>
    </section>`;
  }).join('');
}

function renderAdminModuleAccess(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  const draft = ensureModuleAccessConfigDraft();
  const isLoadingConfig = !moduleAccessConfigHydrated && !!moduleAccessConfigLoadPromise;
  const portalEnabled = Object.values(draft.portal_modules || {}).filter(policy => policy && policy.enabled !== false).length;
  const adminEnabled = Object.values(draft.admin_tabs || {}).filter(policy => policy && policy.enabled !== false).length;
  const roleOptions = moduleAccessRoleOptions();

  el.innerHTML = `
    <div class="module-access-admin">
      <div class="module-access-hero">
        <div>
          <div class="portal-display-kicker">${lang==='en' ? 'Module governance' : 'Quản trị module'}</div>
          <h3>${lang==='en' ? 'One permission matrix for the whole portal' : 'Một ma trận quyền cho toàn bộ portal'}</h3>
          <p>${lang==='en'
            ? 'Admin controls sidebar visibility and direct page access from one place. Critical governance shells stay locked so the recovery path cannot disappear.'
            : 'Admin điều khiển cả menu trái lẫn quyền vào trang trực tiếp từ một nơi. Các shell quản trị trọng yếu được khóa để không mất đường khôi phục quản trị.'}</p>
          ${isLoadingConfig ? `<div class="portal-display-loading-note">${lang==='en' ? 'Loading saved module access policy from server...' : 'Đang tải cấu hình phân quyền module từ server...'}</div>` : ''}
        </div>
        <div class="module-access-hero-stats">
          <div class="module-access-hero-stat"><strong>${portalEnabled}</strong><span>${lang==='en' ? 'Portal modules enabled' : 'Module portal đang bật'}</span></div>
          <div class="module-access-hero-stat"><strong>${adminEnabled}</strong><span>${lang==='en' ? 'Admin workspaces enabled' : 'Workspace admin đang bật'}</span></div>
          <div class="module-access-hero-stat"><strong>${roleOptions.length}</strong><span>${lang==='en' ? 'Roles available' : 'Vai trò khả dụng'}</span></div>
        </div>
      </div>

      <div class="module-access-grid">
        <section class="module-access-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en' ? 'Portal modules' : 'Module portal'}</h4>
              <p>${lang==='en'
                ? 'These rules drive left navigation and direct route access for production, quality, records, tools and customer-facing workspaces.'
                : 'Các quy tắc này điều khiển menu trái và route trực tiếp cho sản xuất, chất lượng, hồ sơ, công cụ và workspace hướng khách hàng.'}</p>
            </div>
          </div>
          <div class="module-access-stack">${renderModuleAccessScope('portal_modules', roleOptions)}</div>
        </section>

        <section class="module-access-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en' ? 'Admin workspaces' : 'Workspace trong Admin'}</h4>
              <p>${lang==='en'
                ? 'Sensitive workspaces such as metadata, infrastructure and Git control now live behind the same matrix instead of custom one-off guards.'
                : 'Các workspace nhạy cảm như metadata, hạ tầng và điều khiển Git giờ nằm sau cùng một ma trận quyền thay vì guard rời rạc từng nơi.'}</p>
            </div>
          </div>
          <div class="module-access-stack">${renderModuleAccessScope('admin_tabs', roleOptions)}</div>
        </section>
      </div>

      <div class="admin-save-bar" id="module-access-save-bar" style="${moduleAccessConfigDirty ? 'display:flex' : 'display:none'}">
        <span class="save-hint">${moduleAccessConfigDirty
          ? `<b>⚠ ${lang==='en' ? 'Unsaved module access changes' : 'Có thay đổi phân quyền module chưa lưu'}</b>`
          : (lang==='en' ? 'Adjust the matrix, then click Save.' : 'Điều chỉnh ma trận quyền rồi nhấn Lưu.')}</span>
        <button class="btn-admin secondary" onclick="resetModuleAccessConfigDraft()">↩ ${lang==='en' ? 'Reset draft' : 'Khôi phục bản nháp'}</button>
        <button class="btn-admin primary" onclick="saveModuleAccessConfig()" style="padding:8px 24px;font-size:13px">💾 ${lang==='en' ? 'SAVE' : 'LƯU'}</button>
      </div>
    </div>`;
}

function renderAdminPortalDisplay(){
  const el = document.getElementById('admin-content');
  if(!el) return;

  const draft = ensurePortalDisplayConfigDraft();
  const isLoadingConfig = !portalDisplayConfigHydrated && !!portalDisplayConfigLoadPromise;
  const enabledExt = new Set(draft.extensions.enabled || []);
  const customExt = new Set(draft.extensions.custom || []);
  const coreHidden = new Set(draft.sidebar.hidden_core_items || []);
  const sectionHidden = new Set(draft.sidebar.hidden_sections || []);
  const catHidden = new Set(draft.sidebar.hidden_categories || []);

  const extRows = (draft.extensions.known || []).map(ext => {
    const checked = enabledExt.has(ext) ? 'checked' : '';
    const typeLabel = ext === 'html'
      ? (lang==='en' ? 'Inline page' : 'Trang HTML hiển thị trực tiếp')
      : (lang==='en' ? 'Controlled download / file stream' : 'Tệp được quản lý và tải qua portal');
    const sourceLabel = customExt.has(ext)
      ? (lang==='en' ? 'Custom' : 'Tự thêm')
      : (lang==='en' ? 'Built-in' : 'Mặc định');
    const removeBtn = customExt.has(ext)
      ? `<button class="btn-admin secondary portal-display-mini-btn" onclick="removePortalDisplayCustomExtension('${ext}')">${lang==='en'?'Remove':'Xóa'}</button>`
      : `<span class="portal-display-chip is-static">${sourceLabel}</span>`;
    return `<div class="portal-display-row">
      <label class="portal-display-check">
        <input type="checkbox" ${checked} onchange="setPortalDisplayExtensionVisible('${ext}', this.checked)">
        <span class="portal-display-check-copy">
          <b>.${ext}</b>
          <small>${typeLabel}</small>
        </span>
      </label>
      <div class="portal-display-row-actions">
        <span class="portal-display-chip">${sourceLabel}</span>
        ${removeBtn}
      </div>
    </div>`;
  }).join('');

  const coreRows = portalSidebarCoreItems().map(item => {
    const visible = item.locked ? true : !coreHidden.has(item.id);
    const checked = visible ? 'checked' : '';
    const disabled = item.locked ? 'disabled' : '';
    const note = item.locked
      ? (lang==='en' ? 'Always visible for admin access' : 'Luôn hiện để bảo toàn đường vào trang quản trị')
      : '';
    return `<label class="portal-display-option">
      <input type="checkbox" ${checked} ${disabled} onchange="setPortalDisplayCoreItemVisible('${item.id}', this.checked)">
      <span class="portal-display-option-copy">
        <b>${item.icon} ${item.label}</b>
        ${note ? `<small>${note}</small>` : ''}
      </span>
    </label>`;
  }).join('');

  const sectionRows = portalSidebarSections().map(section => {
    const visible = !sectionHidden.has(section.id);
    const checked = visible ? 'checked' : '';
    const categories = portalSidebarCategoryItems().filter(cat => cat.section === section.id).map(cat => {
      const catChecked = !catHidden.has(cat.id) ? 'checked' : '';
      return `<label class="portal-display-option is-compact">
        <input type="checkbox" ${catChecked} onchange="setPortalDisplayCategoryVisible('${cat.id}', this.checked)">
        <span class="portal-display-option-copy"><b>${cat.icon} ${cat.label}</b><small>${cat.id}</small></span>
      </label>`;
    }).join('');
    return `<div class="portal-display-section-card">
      <label class="portal-display-option portal-display-section-head">
        <input type="checkbox" ${checked} onchange="setPortalDisplaySectionVisible('${section.id}', this.checked)">
        <span class="portal-display-option-copy">
          <b>${section.label}</b>
          <small>${lang==='en'?'Show or hide this whole group in the left sidebar.':'Bật hoặc ẩn cả nhóm này trên thanh bên trái.'}</small>
        </span>
      </label>
      <div class="portal-display-option-grid">${categories}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="portal-display-admin">
      <div class="portal-display-hero">
        <div>
          <div class="portal-display-kicker">${lang==='en'?'Portal display control':'Điều khiển hiển thị portal'}</div>
          <h3>${lang==='en'?'Choose what the portal shows':'Chọn những gì portal được hiển thị'}</h3>
          <p>${lang==='en'
            ? 'Control which file extensions are indexed on the portal, add extra extensions when needed, and decide which left-sidebar items remain visible to users.'
            : 'Quản lý các đuôi file được index trên portal, thêm đuôi mới khi cần, và chọn các mục nào ở thanh bên trái sẽ xuất hiện với người dùng.'}</p>
          ${isLoadingConfig ? `<div class="portal-display-loading-note">${lang==='en'?'Loading saved configuration from server...':'Đang tải cấu hình hiển thị đã lưu từ server...'}</div>` : ''}
        </div>
      </div>

      <div class="portal-display-grid">
        <section class="portal-display-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en'?'Displayed file extensions':'Đuôi file hiển thị'}</h4>
              <p>${lang==='en'
                ? 'Only enabled extensions are scanned from server folders and shown on the portal. Non-HTML extensions open through controlled download mode.'
                : 'Chỉ các đuôi file đang bật mới được scan từ thư mục server và hiển thị lên portal. Các đuôi không phải HTML sẽ mở qua chế độ tải tệp được kiểm soát.'}</p>
            </div>
          </div>
          <div class="portal-display-add-row">
            <input id="portal-display-new-ext" class="portal-display-input" placeholder="${lang==='en'?'Add extension, e.g. dwg or msg':'Thêm đuôi file, ví dụ dwg hoặc msg'}">
            <button class="btn-admin primary" onclick="addPortalDisplayCustomExtension()">${lang==='en'?'Add extension':'Thêm đuôi file'}</button>
          </div>
          <div class="portal-display-list">${extRows || `<div class="portal-display-empty">${lang==='en'?'No extensions configured.':'Chưa có đuôi file nào được cấu hình.'}</div>`}</div>
        </section>

        <section class="portal-display-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en'?'Left sidebar visibility':'Hiển thị thanh bên trái'}</h4>
              <p>${lang==='en'
                ? 'Choose which fixed portal entries and category groups should appear in the left navigation.'
                : 'Chọn các mục cố định và các nhóm tài liệu nào sẽ xuất hiện ở thanh điều hướng bên trái.'}</p>
            </div>
          </div>
          <div class="portal-display-subtitle">${lang==='en'?'Core portal items':'Mục lõi của portal'}</div>
          <div class="portal-display-option-grid">${coreRows}</div>
          <div class="portal-display-subtitle" style="margin-top:16px">${lang==='en'?'Document groups and categories':'Nhóm tài liệu và chuyên mục'}</div>
          <div class="portal-display-section-stack">${sectionRows}</div>
        </section>
      </div>

      <div class="admin-save-bar" id="portal-display-save-bar" style="${portalDisplayConfigDirty?'display:flex':'display:none'}">
        <span class="save-hint">${portalDisplayConfigDirty
          ? `<b>⚠ ${lang==='en'?'Unsaved portal display changes':'Có thay đổi hiển thị portal chưa lưu'}</b>`
          : (lang==='en'?'Adjust the display configuration, then click Save':'Điều chỉnh cấu hình hiển thị rồi nhấn Lưu')}</span>
        <button class="btn-admin secondary" onclick="resetPortalDisplayConfigDraft()">↩ ${lang==='en'?'Reset draft':'Khôi phục bản nháp'}</button>
        <button class="btn-admin primary" onclick="savePortalDisplayConfig()" style="padding:8px 24px;font-size:13px">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
      </div>
    </div>`;
}

function adminManualMachineEntityLabel(entity){
  const meta = ADMIN_MANUAL_MACHINE_ENTITY_LABELS[String(entity || '')] || {};
  return lang === 'en' ? (meta.en || entity) : (meta.vi || entity);
}

function adminManualMachineEntities(summary){
  const fromBackend = Array.isArray(summary && summary.machine_runtime_entities) ? summary.machine_runtime_entities : [];
  const valid = fromBackend.filter(entity => ADMIN_MANUAL_MACHINE_ENTITIES.includes(String(entity || '')));
  return valid.length ? valid : Array.from(ADMIN_MANUAL_MACHINE_ENTITIES);
}

function adminManualEndpointContracts(summary){
  return Array.isArray(summary && summary.frontend_endpoint_contracts)
    ? summary.frontend_endpoint_contracts.filter(item => item && item.action && item.method)
    : [];
}

function adminFormatRuntimeStamp(value){
  const raw = String(value || '').trim();
  if(!raw) return lang==='en' ? 'Not available' : 'Chưa có dữ liệu';
  try{
    const dt = new Date(raw);
    if(isNaN(dt.getTime())) return raw;
    return dt.toLocaleString(lang==='en' ? 'en-US' : 'vi-VN');
  }catch(e){
    return raw;
  }
}

async function loadAdminManualRuntimeState(options={}){
  if(adminManualRuntimeState.loading && !options.force) return;
  adminManualRuntimeState.loading = true;
  adminManualRuntimeState.error = '';
  if(currentPage === 'admin' && adminTab === 'manual_runtime') renderAdminManualRuntime();
  try{
    const summaryRes = await apiCall('manual_runtime_summary', null, 'GET', 15000);
    if(!(summaryRes && summaryRes.ok)) throw new Error((summaryRes && summaryRes.error) || 'manual_runtime_summary_failed');
    const summary = Object.assign({}, summaryRes.data || {}, {
      runtime_mode: summaryRes.runtime_mode || null,
      read_sources: summaryRes.read_sources || {}
    });
    adminManualRuntimeState.summary = summary;
    adminManualRuntimeState.lastCreated = (Array.isArray(summary.recent_rows) ? summary.recent_rows[0] : null) || null;
    adminManualRuntimeState.loaded = true;
  }catch(e){
    adminManualRuntimeState.error = (e && e.message) ? e.message : (lang==='en' ? 'Unable to load manual runtime data.' : 'Không tải được dữ liệu vận hành thủ công.');
  }finally{
    adminManualRuntimeState.loading = false;
    if(currentPage === 'admin' && adminTab === 'manual_runtime') renderAdminManualRuntime();
  }
}

function adminOpenMasterEntity(entity, scope='machine_runtime'){
  if(String(entity || '') === 'operators'){
    adminTab = 'orgchart';
    renderAdmin();
    showToast(lang==='en'
      ? 'Operators are governed in Admin > Users / Org chart.'
      : 'Người vận hành được quản trị trong Admin > Người dùng / Sơ đồ tổ chức.');
    return;
  }
  if(scope === 'machine_runtime' && !ADMIN_MANUAL_MACHINE_ENTITIES.includes(String(entity || ''))){
    showToast(lang==='en'
      ? 'This data belongs to a process endpoint or owning module, not Manual Machine Runtime.'
      : 'Dữ liệu này thuộc endpoint nghiệp vụ hoặc module chủ quản, không nhập trong Nhập tay máy/MES.');
    return;
  }
  if(typeof window._mdOpenControl === 'function'){
    window._mdOpenControl(entity, {scope});
    return;
  }
  showToast(lang==='en' ? '⚠ Master Data Control is not ready.' : '⚠ Chưa mở được màn hình Dữ liệu nền.');
}

function adminOpenOrderManualCreate(type){
  const orderType = String(type || '').toLowerCase();
  if(['so','jo','wo'].indexOf(orderType) < 0) return;
  navigateTo('orders');
  let attempts = 0;
  (function tryOpen(){
    attempts += 1;
    if(typeof window._sojowoOpenCreate === 'function' && window._sojowoOpenCreate(orderType)){
      return;
    }
    if(attempts < 16){
      setTimeout(tryOpen, 180);
      return;
    }
    showToast(lang==='en' ? '⚠ Could not open the order create form.' : '⚠ Không mở được biểu mẫu tạo đơn.');
  })();
}

function adminOpenOrderWorkspace(){
  navigateTo('orders');
}

function renderAdminManualRuntime(){
  const el = document.getElementById('admin-content');
  if(!el) return;

  if(!adminManualRuntimeState.loaded && !adminManualRuntimeState.loading && !adminManualRuntimeState.error){
    loadAdminManualRuntimeState({force:true});
  }

  if(adminManualRuntimeState.loading && !adminManualRuntimeState.loaded){
    el.innerHTML = `<div style="padding:28px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569)">${lang==='en'?'Loading manual runtime workspace...':'Đang tải module nhập tay vận hành...'}</div>`;
    return;
  }

  if(adminManualRuntimeState.error && !adminManualRuntimeState.loaded){
    el.innerHTML = `
      <div style="display:grid;gap:14px">
        <section style="padding:22px;border:1px solid color-mix(in srgb, var(--red) 30%, var(--border));border-radius:18px;background:color-mix(in srgb, var(--red) 8%, var(--bg-surface,#fff));color:var(--text-primary,#102a43)">
          <div style="font-size:18px;font-weight:700;margin-bottom:8px">${lang==='en'?'Manual runtime failed to load':'Không tải được module nhập tay vận hành'}</div>
          <div style="color:var(--text-secondary,#475569);line-height:1.6">${escapeHtml(adminManualRuntimeState.error)}</div>
          <button class="btn-admin primary" type="button" style="margin-top:14px" onclick="loadAdminManualRuntimeState({force:true})">⟳ ${lang==='en'?'Retry':'Tải lại'}</button>
        </section>
      </div>`;
    return;
  }

  const summary = adminManualRuntimeState.summary || {};
  const masterCounts = summary.master_counts || {};
  const machineCounts = summary.machine_runtime_counts || {};
  const orderCounts = summary.order_counts || { so:0, jo:0, wo:0 };
  const recentRows = Array.isArray(summary.recent_rows) ? summary.recent_rows : [];
  const runtimeMode = (summary.runtime_mode && summary.runtime_mode.mode) ? String(summary.runtime_mode.mode) : 'UNKNOWN';
  const readSources = summary.read_sources || {};
  const operatorAuthority = summary.operator_authority || {};
  const endpointContracts = adminManualEndpointContracts(summary);
  const checklist = adminManualMachineEntities(summary).map(entity => ({
    label:adminManualMachineEntityLabel(entity),
    count:Number(machineCounts[entity] ?? masterCounts[entity] ?? 0),
    entity
  }));
  const missing = checklist.filter(item => Number(item.count || 0) === 0);
  const stats = [
    { label:lang==='en'?'Work centers':'Work center', value:Number(machineCounts.work_centers ?? masterCounts.work_centers ?? 0) },
    { label:lang==='en'?'Machines':'Máy', value:Number(machineCounts.machines ?? masterCounts.machines ?? 0) },
    { label:lang==='en'?'MES adapters':'MES adapter', value:Number(machineCounts.mes_connectivity_adapters ?? masterCounts.mes_connectivity_adapters ?? 0) },
    { label:lang==='en'?'Alarm rules':'Alarm', value:Number(machineCounts.mes_alarm_catalog ?? masterCounts.mes_alarm_catalog ?? 0) },
    { label:'SO', value:orderCounts.so },
    { label:'JO', value:orderCounts.jo },
    { label:'WO', value:orderCounts.wo }
  ];

  el.innerHTML = `
    <div style="display:grid;gap:16px">
      <section style="border:1px solid var(--border);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb, var(--brand-2) 6%, var(--bg-surface,#fff)) 0%,color-mix(in srgb, var(--blue) 8%, var(--bg-surface,#fff)) 48%,color-mix(in srgb, var(--amber) 8%, var(--bg-surface,#fff)) 100%);padding:22px 24px">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
          <div style="max-width:760px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0f4c81">${lang==='en'?'Manual machine runtime':'Nhập tay vận hành máy'}</div>
            <h3 style="margin:8px 0 10px;font-size:24px;line-height:1.2;color:#102a43">${lang==='en'?'Machine/MES input only, process data through endpoints':'Chỉ nhập dữ liệu máy/MES, dữ liệu quy trình đi qua endpoint'}</h3>
            <p style="margin:0;color:#334e68;line-height:1.65">${lang==='en'
              ? 'This workspace is limited to machine-origin and machine-support data: work centers, machines, adapters, alarms, downtime codes and tooling. Customer, supplier, part, PO/SO/JO/WO, CAPA and quality process data are intentionally kept out of this editor.'
              : 'Workspace này chỉ giới hạn cho dữ liệu có nguồn hoặc vai trò trực tiếp với máy: work center, máy, adapter, alarm, mã downtime và tooling. Khách hàng, nhà cung cấp, part, PO/SO/JO/WO, CAPA và dữ liệu chất lượng được loại khỏi editor này có chủ đích.'}</p>
            <div style="margin-top:12px;font-size:13px;color:#486581">${lang==='en'
              ? 'Frontend process screens must call their own process endpoint contracts. This panel only exposes machine/MES endpoint contracts and operator authority references.'
              : 'Frontend các màn hình quy trình phải gọi endpoint contract riêng. Panel này chỉ hiển thị contract máy/MES và tham chiếu authority operator.'}</div>
            <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
              <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid color-mix(in srgb, var(--blue) 22%, var(--border));font-size:12px;color:#0f4c81">${lang==='en'?'Runtime':'Runtime'}: ${escapeHtml(runtimeMode)}</span>
              <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid color-mix(in srgb, var(--blue) 22%, var(--border));font-size:12px;color:#0f4c81">${lang==='en'?'Master source':'Nguồn master'}: ${escapeHtml(String((readSources.master_data || {}).source || '-'))}</span>
              <span style="display:inline-flex;align-items:center;padding:6px 10px;border-radius:999px;background:rgba(255,255,255,.78);border:1px solid color-mix(in srgb, var(--blue) 22%, var(--border));font-size:12px;color:#0f4c81">${lang==='en'?'Orders source':'Nguồn orders'}: ${escapeHtml(String((readSources.orders || {}).source || '-'))}</span>
            </div>
          </div>
          <button class="btn-admin secondary" onclick="loadAdminManualRuntimeState({force:true})">⟳ ${lang==='en'?'Refresh':'Làm mới'}</button>
        </div>
      </section>

      ${adminManualRuntimeState.error ? `<div style="padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber)">${escapeHtml(adminManualRuntimeState.error)}</div>` : ''}

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px">
        ${stats.map(card => `
          <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
            <div style="font-size:12px;color:#486581">${escapeHtml(card.label)}</div>
            <div style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(String(card.value))}</div>
          </div>
        `).join('')}
      </section>

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:16px">
        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Machine/MES runtime tables':'Bảng vận hành máy/MES'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'Only these tables open in this manual runtime editor. They feed machine dispatch, connector health, alarm handling, downtime and tooling readiness.'
            : 'Chỉ các bảng này được mở trong editor nhập tay vận hành. Chúng phục vụ dispatch máy, trạng thái connector, xử lý alarm, downtime và tooling readiness.'}</p>
          <div style="display:grid;gap:10px">
            ${checklist.map(item => `
              <button type="button" onclick="adminOpenMasterEntity('${item.entity}','machine_runtime')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:14px;background:${item.count > 0 ? 'color-mix(in srgb, var(--green) 10%, var(--bg-surface,#fff))' : 'color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff))'};border:1px solid ${item.count > 0 ? 'color-mix(in srgb, var(--green) 28%, var(--border))' : 'color-mix(in srgb, var(--amber) 28%, var(--border))'};cursor:pointer;text-align:left">
                <span>
                  <strong style="display:block;color:#102a43">${escapeHtml(item.label)}</strong>
                  <small style="color:#52667a">${escapeHtml(item.count > 0 ? (lang==='en'?'Runtime table linked':'Đã link runtime') : (lang==='en'?'Missing machine baseline':'Thiếu baseline máy/MES'))}</small>
                </span>
                <strong style="font-size:20px;color:#102a43">${escapeHtml(String(item.count))}</strong>
              </button>
            `).join('')}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Machine/MES endpoint contracts':'Endpoint máy/MES'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'SO / JO / WO are process objects. Create them through their governed forms and API endpoints, not as machine runtime tables.'
            : 'SO / JO / WO là object quy trình. Tạo chúng qua form và API có kiểm soát, không đưa vào bảng nhập tay máy/MES.'}</p>
          <div style="display:grid;gap:10px">
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('so')">+ SO</button>
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('jo')">+ JO</button>
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('wo')">+ WO</button>
            <button class="btn-admin secondary" onclick="adminOpenOrderWorkspace()">${lang==='en'?'Open Order Management':'Mở Quản lý đơn hàng'}</button>
          </div>
          <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px dashed var(--border);color:var(--text-secondary,#475569);font-size:13px;line-height:1.6">
            ${lang==='en'
              ? 'Operator source: Admin users / org chart. Current projected operators: '
              : 'Nguồn operator: Admin > Người dùng / Sơ đồ tổ chức. Số operator đang chiếu ra runtime: '}
            ${escapeHtml(String(masterCounts.operators || 0))}
            <br>${lang==='en'
              ? 'Current authority: '
              : 'Authority hiện tại: '}
            ${escapeHtml(String(operatorAuthority.source || 'admin_users'))}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Frontend endpoint contracts':'Contract endpoint cho frontend'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${missing.length
            ? (lang==='en'
              ? ('Machine baseline still missing for: ' + missing.map(item => item.label).join(', ') + '.')
              : ('Baseline máy/MES còn thiếu cho: ' + missing.map(item => item.label).join(', ') + '.'))
            : (lang==='en'
              ? 'Machine/MES baseline is available. Process objects are intentionally published outside this machine editor.'
              : 'Baseline máy/MES đã có. Object quy trình được tách khỏi editor máy có chủ đích.')}
          </p>
          <div style="display:grid;gap:10px;max-height:360px;overflow:auto;padding-right:4px">
            ${endpointContracts.length ? endpointContracts.map(contract => `
              <div style="padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border);color:var(--text-secondary,#334e68);line-height:1.55">
                <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:6px">
                  <strong style="color:#102a43">${escapeHtml(contract.action || '-')}</strong>
                  <span style="padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--blue) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--blue) 24%, var(--border));font-size:11px;color:#0f4c81">${escapeHtml(contract.method || '-')}</span>
                  <span style="padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--green) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--green) 24%, var(--border));font-size:11px;color:#0f7a50">${escapeHtml(contract.authority || '-')}</span>
                </div>
                <div>${escapeHtml(contract.frontend_use || contract.purpose || '-')}</div>
              </div>
            `).join('') : `<div style="padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber)">${lang==='en'?'Endpoint contract list is not loaded from backend.':'Chưa tải được danh sách endpoint contract từ backend.'}</div>`}
          </div>
        </article>
      </section>

      <section style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Recent records':'Bản ghi gần nhất'}</div>
            <div style="margin-top:6px;color:#52667a">${lang==='en'
              ? 'Quickly verify that manual data is being created in the expected order.'
              : 'Kiểm tra nhanh xem dữ liệu nhập tay đã được tạo đúng trình tự mong muốn hay chưa.'}</div>
          </div>
          <div style="font-size:12px;color:#486581">${lang==='en'?'Last event':'Lần cập nhật gần nhất'}: ${escapeHtml(adminFormatRuntimeStamp(adminManualRuntimeState.lastCreated && adminManualRuntimeState.lastCreated.updated_at))}</div>
        </div>
        <div style="margin-top:14px;overflow:auto">
          <table class="admin-table" style="width:100%;font-size:12px">
            <thead>
              <tr style="background:var(--bg-surface-alt,#f8fafc)">
                <th style="padding:10px;text-align:left">${lang==='en'?'Type':'Loại'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Number':'Mã'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Description':'Mô tả'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Status':'Trạng thái'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Updated':'Cập nhật'}</th>
              </tr>
            </thead>
            <tbody>
              ${recentRows.length ? recentRows.map(row => `
                <tr style="border-bottom:1px solid #eef2f7">
                  <td style="padding:10px;font-weight:700">${escapeHtml(row.type)}</td>
                  <td style="padding:10px"><code>${escapeHtml(row.id || '-')}</code></td>
                  <td style="padding:10px;color:#334e68">${escapeHtml(row.title || '-')}</td>
                  <td style="padding:10px">${escapeHtml(row.status || '-')}</td>
                  <td style="padding:10px;color:#52667a">${escapeHtml(adminFormatRuntimeStamp(row.updated_at))}</td>
                </tr>
              `).join('') : `<tr><td colspan="5" style="padding:14px;color:var(--text-secondary)">${lang==='en'?'No SO / JO / WO records yet.':'Chưa có SO / JO / WO nào được tạo.'}</td></tr>`}
            </tbody>
          </table>
        </div>
      </section>
    </div>`;
}

function adminDataSourceClone(value){
  try{ return JSON.parse(JSON.stringify(value || {})); }catch(e){ return {}; }
}

function adminDataSourceModePreview(config){
  const cfg = config || {};
  if(!cfg.use_postgres) return 'JSON_ONLY';
  if(cfg.shadow_write) return 'SHADOW_WRITE';
  if(cfg.json_fallback) return 'POSTGRES_PRIMARY';
  return 'POSTGRES_ONLY';
}

function adminDataSourceDirty(value){
  adminDataSourceState.dirty = !!value;
  const bar = document.getElementById('admin-data-source-save-bar');
  if(bar) bar.style.display = adminDataSourceState.dirty ? 'flex' : 'none';
}

function adminDataSourceSetField(key, value){
  if(!adminDataSourceState.draft){
    adminDataSourceState.draft = adminDataSourceClone((adminDataSourceState.snapshot && adminDataSourceState.snapshot.config && adminDataSourceState.snapshot.config.effective_config) || {});
  }
  adminDataSourceState.draft[key] = value;
  adminDataSourceDirty(true);
  const preview = document.getElementById('admin-data-source-mode-preview');
  if(preview) preview.textContent = adminDataSourceModePreview(adminDataSourceState.draft);
}

async function loadAdminDataSourceState(options={}){
  if(adminDataSourceState.loading && !options.force) return;
  adminDataSourceState.loading = true;
  adminDataSourceState.error = '';
  if(currentPage === 'admin' && adminTab === 'data_sources') renderAdminDataSources();
  try{
    const results = await Promise.allSettled([
      apiCall('admin_data_layer_config_get', null, 'GET'),
      apiCall('mes_shadow_status', null, 'GET'),
      apiCall('epicor_transport_health', null, 'GET'),
      apiCall('mes_connector_snapshot', null, 'GET')
    ]);
    const configRes = results[0].status === 'fulfilled' ? results[0].value : null;
    if(!(configRes && configRes.ok)) throw new Error((configRes && configRes.error) || 'admin_data_layer_config_get_failed');
    adminDataSourceState.snapshot = {
      config: configRes,
      shadow: (results[1].status === 'fulfilled' && results[1].value && results[1].value.ok) ? results[1].value : null,
      epicor: (results[2].status === 'fulfilled' && results[2].value && results[2].value.ok) ? results[2].value : null,
      connectors: (results[3].status === 'fulfilled' && results[3].value && results[3].value.ok) ? results[3].value : null
    };
    if(!adminDataSourceState.dirty || options.forceDraftSync){
      adminDataSourceState.draft = adminDataSourceClone(configRes.effective_config || {});
      adminDataSourceState.dirty = false;
    }
    adminDataSourceState.loaded = true;
  }catch(e){
    adminDataSourceState.error = (e && e.message) ? e.message : (lang==='en' ? 'Unable to load data source configuration.' : 'Không tải được cấu hình nguồn dữ liệu.');
  }finally{
    adminDataSourceState.loading = false;
    if(currentPage === 'admin' && adminTab === 'data_sources') renderAdminDataSources();
  }
}

function adminDataSourceResetDraft(){
  adminDataSourceState.draft = adminDataSourceClone((adminDataSourceState.snapshot && adminDataSourceState.snapshot.config && adminDataSourceState.snapshot.config.effective_config) || {});
  adminDataSourceDirty(false);
  renderAdminDataSources();
}

async function saveAdminDataSourceConfig(){
  if(adminDataSourceState.loading) return;
  try{
    adminDataSourceState.loading = true;
    renderAdminDataSources();
    const res = await apiCall('admin_data_layer_config_save', { config: adminDataSourceState.draft || {} });
    if(!(res && res.ok)){
      throw new Error((res && res.error) || 'admin_data_layer_config_save_failed');
    }
    adminDataSourceDirty(false);
    await loadAdminDataSourceState({force:true, forceDraftSync:true});
    showToast(lang==='en' ? '✅ Data source configuration saved.' : '✅ Đã lưu cấu hình nguồn dữ liệu.');
  }catch(e){
    adminDataSourceState.loading = false;
    renderAdminDataSources();
    showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'Save failed.' : 'Lưu cấu hình thất bại.')));
  }
}

function renderAdminDataSources(){
  const el = document.getElementById('admin-content');
  if(!el) return;

  if(!adminDataSourceState.loaded && !adminDataSourceState.loading){
    loadAdminDataSourceState({force:true});
  }

  if(adminDataSourceState.loading && !adminDataSourceState.loaded){
    el.innerHTML = `<div style="padding:28px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569)">${lang==='en'?'Loading data source diagnostics...':'Đang tải chẩn đoán nguồn dữ liệu...'}</div>`;
    return;
  }

  const snapshot = adminDataSourceState.snapshot || {};
  const cfgRes = snapshot.config || {};
  const runtimeMode = cfgRes.runtime_mode || {};
  const draft = adminDataSourceState.draft || adminDataSourceClone(cfgRes.effective_config || {});
  const shadow = snapshot.shadow || {};
  const epicor = snapshot.epicor || {};
  const connector = snapshot.connectors || {};
  const shadowFailures = Array.isArray(shadow.shadow_sync_failures) ? shadow.shadow_sync_failures.length : 0;
  const fallbackReads = Array.isArray(shadow.primary_read_fallbacks) ? shadow.primary_read_fallbacks.length : 0;
  const connectorFailures = Array.isArray(shadow.recent_connector_failures) ? shadow.recent_connector_failures.length : 0;
  const launchBlockers = Array.isArray(shadow.launch_blockers) ? shadow.launch_blockers.length : 0;
  const epicorHealth = epicor.health || {};
  const connectorKpis = connector.kpis || {};
  const dbProbeReachable = !!(runtimeMode.database_probe_reachable || runtimeMode.postgres_reachable);
  const dbProbeConfigured = !!runtimeMode.database_configured;

  el.innerHTML = `
    <div style="display:grid;gap:16px">
      <section style="border:1px solid var(--border);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb, var(--amber) 7%, var(--bg-surface,#fff)) 0%,color-mix(in srgb, var(--blue) 8%, var(--bg-surface,#fff)) 55%,color-mix(in srgb, var(--purple) 8%, var(--bg-surface,#fff)) 100%);padding:22px 24px">
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start">
          <div style="max-width:760px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c2d12">${lang==='en'?'Data source and database control':'Nguồn dữ liệu và Database'}</div>
            <h3 style="margin:8px 0 10px;font-size:24px;line-height:1.2;color:#102a43">${lang==='en'?'Inspect and tune the runtime data layer from frontend':'Kiểm tra và chỉnh lớp dữ liệu runtime ngay trên frontend'}</h3>
            <p style="margin:0;color:#334e68;line-height:1.65">${lang==='en'
              ? 'This panel exposes the active JSON / PostgreSQL runtime mode, shadow-sync health, and the connection profile you can safely adjust without touching server code.'
              : 'Panel này hiển thị chế độ runtime JSON / PostgreSQL đang hoạt động, sức khỏe shadow-sync, và bộ cấu hình kết nối mà bạn có thể chỉnh an toàn mà không cần sửa code server.'}</p>
          </div>
          <button class="btn-admin secondary" onclick="loadAdminDataSourceState({force:true,forceDraftSync:true})">⟳ ${lang==='en'?'Refresh diagnostics':'Làm mới chẩn đoán'}</button>
        </div>
      </section>

      ${adminDataSourceState.error ? `<div style="padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber)">${escapeHtml(adminDataSourceState.error)}</div>` : ''}

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Runtime mode':'Chế độ runtime'}</div>
          <div id="admin-data-source-mode-preview" style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(adminDataSourceModePreview(draft))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'Applied to new requests immediately':'Áp dụng ngay cho các request mới'}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">PostgreSQL</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:${dbProbeReachable ? '#0f766e' : '#b45309'}">${dbProbeReachable ? (lang==='en'?'Reachable':'Kết nối được') : (dbProbeConfigured ? (lang==='en'?'Unavailable':'Chưa kết nối') : (lang==='en'?'Not configured':'Chưa cấu hình'))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${escapeHtml(runtimeMode.database_probe_error || runtimeMode.postgres_error || (dbProbeConfigured ? (lang==='en'?'Runtime path may still be JSON-only even though a DB profile exists.':'Runtime có thể vẫn đang JSON-only dù đã có hồ sơ DB.') : (lang==='en'?'No live DB profile configured yet':'Chưa cấu hình hồ sơ DB thật')))}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Shadow-sync failures':'Lỗi shadow-sync'}</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(String(shadowFailures))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'JSON fallback reads':'Lượt fallback về JSON'}: ${escapeHtml(String(fallbackReads))}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Connector alerts':'Cảnh báo connector'}</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(String(connectorFailures))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'WO launch blockers':'WO bị chặn'}: ${escapeHtml(String(launchBlockers))}</div>
        </div>
      </section>

      <section style="display:grid;grid-template-columns:minmax(340px,1.25fr) minmax(280px,.95fr);gap:16px">
        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'PostgreSQL runtime profile':'Hồ sơ runtime PostgreSQL'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'Switch between JSON-only, shadow-write, PostgreSQL-primary, and PostgreSQL-only here. Passwords remain on the server and are not exposed in frontend.'
            : 'Chuyển giữa JSON-only, shadow-write, PostgreSQL-primary và PostgreSQL-only ngay tại đây. Mật khẩu vẫn được giữ ở server và không lộ ra frontend.'}</p>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">Host</span>
              <input class="sj-input" value="${escapeHtml(String(draft.host || ''))}" oninput="adminDataSourceSetField('host', this.value)">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">Port</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.port || 5432))}" oninput="adminDataSourceSetField('port', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">Database</span>
              <input class="sj-input" value="${escapeHtml(String(draft.database || ''))}" oninput="adminDataSourceSetField('database', this.value)">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Username':'Tài khoản'}</span>
              <input class="sj-input" value="${escapeHtml(String(draft.username || ''))}" oninput="adminDataSourceSetField('username', this.value)">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">Schema</span>
              <input class="sj-input" value="${escapeHtml(String(draft.schema || 'public'))}" oninput="adminDataSourceSetField('schema', this.value)">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">SSL Mode</span>
              <select class="sj-input" onchange="adminDataSourceSetField('sslmode', this.value)">
                ${['disable','allow','prefer','require','verify-ca','verify-full'].map(item => `<option value="${item}" ${String(draft.sslmode || 'prefer')===item ? 'selected' : ''}>${item}</option>`).join('')}
              </select>
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Connect timeout (s)':'Timeout kết nối (giây)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.connect_timeout || 5))}" oninput="adminDataSourceSetField('connect_timeout', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Statement timeout (ms)':'Statement timeout (ms)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.statement_timeout || 30000))}" oninput="adminDataSourceSetField('statement_timeout', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Read retry count':'Số lần retry khi đọc'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.read_retry_count || 3))}" oninput="adminDataSourceSetField('read_retry_count', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Read retry delay (ms)':'Độ trễ retry khi đọc (ms)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.read_retry_delay_ms || 150))}" oninput="adminDataSourceSetField('read_retry_delay_ms', Number(this.value || 0))">
            </label>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px">
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.use_postgres ? 'checked' : ''} onchange="adminDataSourceSetField('use_postgres', this.checked)">
              <span><strong>use_postgres</strong><br><small>${lang==='en'?'Enable PostgreSQL path':'Bật đường đọc/ghi PostgreSQL'}</small></span>
            </label>
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.shadow_write ? 'checked' : ''} onchange="adminDataSourceSetField('shadow_write', this.checked)">
              <span><strong>shadow_write</strong><br><small>${lang==='en'?'Write JSON + PostgreSQL in parallel':'Ghi song song JSON + PostgreSQL'}</small></span>
            </label>
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.json_fallback ? 'checked' : ''} onchange="adminDataSourceSetField('json_fallback', this.checked)">
              <span><strong>json_fallback</strong><br><small>${lang==='en'?'Fallback to JSON if PostgreSQL read fails':'Fallback về JSON nếu đọc PostgreSQL lỗi'}</small></span>
            </label>
          </div>
          <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber);line-height:1.6;font-size:13px">
            ${lang==='en'
              ? 'Frontend edits only non-secret parameters. Database passwords and external connector tokens remain in server environment variables.'
              : 'Frontend chỉ chỉnh các tham số không chứa bí mật. Mật khẩu database và token kết nối ngoài vẫn nằm trong biến môi trường của server.'}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px;display:grid;gap:12px">
          <div>
            <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Integration diagnostics':'Chẩn đoán tích hợp'}</div>
            <p style="margin:8px 0 0;color:#52667a;line-height:1.6">${lang==='en'
              ? 'Use these cards to judge whether manual mode is still necessary or whether Epicor / CNC links are healthy enough to rely on.'
              : 'Dùng các thẻ này để đánh giá xem có còn cần chế độ nhập tay hay không, hoặc Epicor / CNC đã đủ khỏe để dựa vào kết nối hay chưa.'}</p>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">Epicor</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${epicorHealth.configured ? (lang==='en'?'Configured':'Đã cấu hình') : (lang==='en'?'Not configured':'Chưa cấu hình')}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${epicorHealth.dry_run ? (lang==='en'?'Dry-run is active while transport is incomplete.':'Đang ở chế độ dry-run khi transport chưa cấu hình đủ.') : (lang==='en'?'Live transport is active.':'Transport thực đang hoạt động.')}</div>
            <div style="margin-top:8px;font-size:12px;color:#52667a">${lang==='en'?'Company':'Company'}: ${escapeHtml(String(epicorHealth.company || '-'))} · Plant: ${escapeHtml(String(epicorHealth.plant || '-'))}</div>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">${lang==='en'?'CNC connectors':'Kết nối CNC'}</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${escapeHtml(String(connectorKpis.connectors_healthy || 0))}/${escapeHtml(String(connectorKpis.connectors_total || 0))} ${lang==='en'?'healthy':'ổn định'}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${lang==='en'?'Manual bridges':'Manual bridge'}: ${escapeHtml(String(connectorKpis.manual_bridges || 0))} · ${lang==='en'?'Stale links':'Link stale'}: ${escapeHtml(String(connectorKpis.connectors_stale || 0))}</div>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">${lang==='en'?'Shadow observability':'Quan sát shadow'}</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${escapeHtml(String(shadowFailures))} ${lang==='en'?'failures':'lỗi'}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${lang==='en'?'JSON fallback reads':'Lượt fallback về JSON'}: ${escapeHtml(String(fallbackReads))}</div>
            <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'Last config update':'Lần lưu cấu hình gần nhất'}: ${escapeHtml(adminFormatRuntimeStamp((cfgRes.override_meta || {}).updated || ''))}</div>
          </div>
        </article>
      </section>

      <div class="admin-save-bar" id="admin-data-source-save-bar" style="${adminDataSourceState.dirty ? 'display:flex' : 'display:none'}">
        <span class="save-hint"><b>⚠ ${lang==='en'?'Unsaved data source changes':'Có thay đổi nguồn dữ liệu chưa lưu'}</b></span>
        <button class="btn-admin secondary" onclick="adminDataSourceResetDraft()">${lang==='en'?'Reset draft':'Khôi phục bản nháp'}</button>
        <button class="btn-admin primary" onclick="saveAdminDataSourceConfig()">${adminDataSourceState.loading ? (lang==='en'?'Saving...':'Đang lưu...') : (lang==='en'?'Save configuration':'Lưu cấu hình')}</button>
      </div>
    </div>`;
}

function renderAdminUsers(){
  const el = document.getElementById('admin-content');
  const deptMap = {};
  DEPARTMENTS.forEach(d=>deptMap[d.code]=d);
  
  const viewToggle = `<div class="admin-view-toggle" role="group" aria-label="${lang==='en'?'User view mode':'Chế độ hiển thị người dùng'}">
    <button type="button" class="admin-view-toggle-btn ${adminUserViewMode==='cards'?'is-active':''}" aria-pressed="${adminUserViewMode==='cards'?'true':'false'}" onclick="adminUserViewMode='cards';renderAdminUsers()" title="${lang==='en'?'Card view':'Xem dạng thẻ'}">&#9638;</button>
    <button type="button" class="admin-view-toggle-btn ${adminUserViewMode==='list'?'is-active':''}" aria-pressed="${adminUserViewMode==='list'?'true':'false'}" onclick="adminUserViewMode='list';renderAdminUsers()" title="${lang==='en'?'List view':'Xem dạng danh sách'}">☰</button>
  </div>`;

  let usersHtml = '';
  if(adminUserViewMode === 'list'){
    usersHtml = `<div class="admin-table-wrap"><table class="admin-table" id="user-list-table" style="width:100%;font-size:12px">
      <thead><tr style="background:var(--bg-surface-alt,#f8fafc)">
        <th style="padding:8px 10px;text-align:left;font-size:11px">#</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Status':'TT'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Name':'Họ tên'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">Username</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Department':'Phòng ban'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Title':'Chức danh'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Role':'Vai trò'}</th>
        <th style="padding:8px 10px;text-align:center;font-size:11px">${lang==='en'?'Actions':'Thao tác'}</th>
      </tr></thead>
      <tbody>
      ${USERS.map((u,idx) => {
        const r = ROLES[u.role];
        const dept = deptMap[u.dept];
        return `<tr class="user-list-row" data-name="${escapeHtml((u.name||'').toLowerCase())}" data-dept="${escapeHtml(u.dept||'')}" style="border-bottom:1px solid color-mix(in srgb, var(--border) 78%, transparent);${u.active===false?'opacity:.5;background:color-mix(in srgb, var(--red) 8%, var(--bg-surface,#fff))':''}">
          <td style="padding:6px 10px;color:var(--text-3)">${idx+1}</td>
          <td style="padding:6px 10px">${u.active!==false?'🟢':'🔴'}</td>
          <td style="padding:6px 10px;font-weight:600">${escapeHtml(u.name)}</td>
          <td style="padding:6px 10px;font-family:var(--mono);font-size:11px;color:var(--text-3)">@${escapeHtml(u.username)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${dept?dept.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${dept?dept.color:'var(--text-secondary,#666)'}">${u.dept}${dept?' '+(lang==='en'?dept.labelEn:dept.label):''}</span></td>
          <td style="padding:6px 10px;font-size:11px">${escapeHtml(u.title)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${r?r.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${r?r.color:'var(--text-secondary,#666)'}">${r?r.icon:''} ${r?r.label:u.role}</span></td>
          <td style="padding:6px 10px;text-align:center;white-space:nowrap">
            <button onclick="showUserModal('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">✏</button>
            <button onclick="editUserPerms('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">🔐</button>
            <button onclick="toggleUserActive('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">${u.active!==false?'⏸':'▶'}</button>
            <button onclick="deleteUserConfirm('${u.id}')" class="btn-admin danger sm" style="padding:3px 8px;font-size:10px">🗑</button>
          </td>
        </tr>`;
      }).join('')}
      </tbody>
    </table></div>`;
  } else {
    usersHtml = `<div class="user-cards-grid" id="user-cards-grid">
      ${USERS.map(u => {
        const r = ROLES[u.role];
        const dept = deptMap[u.dept];
        const colorBg = r ? r.color : '#94a3b8';
        const initials = (u.name||'?').split(' ').map(w=>w[0]).join('').substring(0,2).toUpperCase();
        return `<div class="user-card ${u.active===false?'inactive':''}" data-name="${escapeHtml((u.name||'').toLowerCase())}" data-dept="${escapeHtml(u.dept||'')}">
          <div class="uc-top">
            <div class="uc-avatar" style="background:${colorBg}">${initials}</div>
            <div class="uc-info">
              <div class="uc-name">${escapeHtml(u.name)}</div>
              <div class="uc-title">${escapeHtml(u.title)} · @${escapeHtml(u.username)}</div>
            </div>
            <span style="font-size:18px">${u.active!==false?'🟢':'🔴'}</span>
          </div>
          <div class="uc-meta">
            <span class="tag" style="background:${colorBg}15;color:${colorBg}">${r?r.icon:''} ${r?r.label:u.role}</span>
            <span class="tag" style="background:${dept?dept.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${dept?dept.color:'var(--text-secondary,#666)'}">${u.dept} ${dept?(lang==='en'?dept.labelEn:dept.label):''}</span>
          </div>
          <div class="uc-actions">
            <button onclick="showUserModal('${u.id}')">✏ ${T('admin_edit')}</button>
            <button onclick="editUserPerms('${u.id}')">🔐 Quyền</button>
            <button class="danger" onclick="toggleUserActive('${u.id}')">${u.active!==false?'⏸ Khóa':'▶ Mở'}</button>
            <button class="danger" onclick="deleteUserConfirm('${u.id}')">🗑</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  if(!USERS.length){
    usersHtml = `<div style="padding:18px 20px;border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:16px;background:color-mix(in srgb, var(--amber) 8%, var(--bg-surface,#fff));color:var(--text-secondary,#475569);line-height:1.7">
      <strong style="display:block;color:var(--amber-dark,#b45309)">${lang==='en'?'No authoritative user records loaded':'Chưa nạp được user authoritative'}</strong>
      ${lang==='en'
        ? 'This screen will stay empty until the runtime user store responds. Demo users are no longer injected into the admin workspace.'
        : 'Màn hình này sẽ để trống cho tới khi runtime user store phản hồi. Hệ thống không còn bơm demo user vào workspace quản trị nữa.'}
    </div>`;
  }

  const orgNotice = !ADMIN_AUTH_STATE.org.loaded ? `<div style="margin-bottom:12px;padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--amber-dark,#b45309)">
    ${ADMIN_AUTH_STATE.org.loading
      ? (lang==='en'
          ? 'Loading HCM organization catalog in the background. You can still inspect users now; changing department/title will unlock after the catalog finishes loading.'
          : 'Catalog tổ chức HCM đang tải nền. Anh vẫn xem được user ngay; thao tác đổi phòng ban/chức danh sẽ mở lại khi catalog tải xong.')
      : (lang==='en'
          ? 'HCM organization catalog is currently unavailable. Identity/contact edits still work, but changing department/title requires the runtime catalog to come back.'
          : 'Catalog tổ chức HCM hiện chưa sẵn sàng. Các chỉnh sửa thông tin định danh/liên hệ vẫn lưu được, nhưng đổi phòng ban/chức danh cần runtime catalog hoạt động lại.')}
    ${ADMIN_AUTH_STATE.org.error ? `<div style="margin-top:6px"><b>Runtime:</b> ${escapeHtml(ADMIN_AUTH_STATE.org.error)}</div>` : ''}
  </div>` : '';

  const headHtml = `
    <div class="admin-toolbar">
      <input type="text" placeholder="${lang==='en'?'Search users...':'Tìm người dùng...'}" oninput="filterAdminUserCards(this.value)" id="admin-user-search">
      <select id="admin-user-dept-filter" onchange="filterAdminUserCards(document.getElementById('admin-user-search').value)" style="min-width:140px">
        <option value="">${lang==='en'?'All departments':'Tất cả phòng ban'}</option>
        ${DEPARTMENTS.map(d=>`<option value="${d.code}">${d.code} — ${lang==='en'?d.labelEn:d.label}</option>`).join('')}
      </select>
      ${viewToggle}
      <button class="btn-admin primary" onclick="showUserModal()">+ ${T('admin_add_user')}</button>
      ${canExportUsersData() ? `
      <button class="btn-admin secondary" onclick="exportUsersExcel()" title="${lang==='en'?'Export to Excel':'Xuất Excel'}">📥 Excel</button>
      <label class="btn-admin secondary" style="cursor:pointer" title="${lang==='en'?'Import from Excel':'Nhập từ Excel'}">
        📤 ${lang==='en'?'Import':'Nhập'}
        <input type="file" accept=".xlsx,.xls,.csv" onchange="importUsersExcel(this)" style="display:none">
      </label>
      ` : ''}
    </div>
    ${orgNotice}`;

  el.innerHTML = adminScopedLayout(headHtml, usersHtml);
}

function filterAdminUserCards(q){
  const ql = (q||'').toLowerCase();
  const deptFilter = (document.getElementById('admin-user-dept-filter')||{}).value || '';
  // Support both card view and list view
  const cards = document.querySelectorAll('#user-cards-grid .user-card');
  const rows = document.querySelectorAll('#user-list-table .user-list-row');
  const elements = cards.length > 0 ? cards : rows;
  elements.forEach(el=>{
    const name = el.dataset.name||'';
    const dept = el.dataset.dept||'';
    const matchQ = !ql || name.includes(ql) || el.textContent.toLowerCase().includes(ql);
    const matchD = !deptFilter || dept === deptFilter;
    el.style.display = (matchQ && matchD) ? '' : 'none';
  });
}

// ═══════════════════════════════════════════════════
// EXCEL EXPORT / IMPORT USERS
// ═══════════════════════════════════════════════════
function exportUsersExcel(){
  if(!canExportUsersData()){
    showToast('🔒 '+(lang==='en'?'No permission to export user data':'Không có quyền xuất dữ liệu người dùng'));
    return;
  }
  // Build CSV with BOM for Excel compatibility (Vietnamese)
  const headers = ['ID','Username','Password','Họ tên / Name','CCCD / Citizen ID','Số ĐT / Phone','Email cá nhân / Personal Email','Phòng ban / Dept','Chức danh / Title','Vai trò / Role','Role Key','Trạng thái / Status','MFA'];
  let csv = headers.join(',') + '\n';
  USERS.forEach(u=>{
    const roleDef = ROLES[u.role] || {};
    csv += [
      '"'+(u.id||'')+'"',
      '"'+(u.username||'')+'"',
      '"'+(u.password||'')+'"',
      '"'+(u.name||'').replace(/"/g,'""')+'"',
      '"'+(u.cccd||'')+'"',
      '"'+(u.phone||'')+'"',
      '"'+(u.personal_email||'')+'"',
      '"'+(u.dept||'')+'"',
      '"'+(u.title||'').replace(/"/g,'""')+'"',
      '"'+(roleDef.label||u.role||'')+'"',
      '"'+(u.role||'')+'"',
      '"'+(u.active!==false?'Active':'Inactive')+'"',
      '"'+(u.mfa_enabled?'Yes':'No')+'"'
    ].join(',') + '\n';
  });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'HESEM_Users_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a); a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  showToast('✅ '+(lang==='en'?'Exported '+USERS.length+' users':'Đã xuất '+USERS.length+' người dùng'));
}

function importUsersExcel(input){
  if(!canExportUsersData()){
    showToast('🔒 '+(lang==='en'?'No permission to import user data':'Không có quyền nhập dữ liệu người dùng'));
    input.value='';
    return;
  }
  const file = input.files[0];
  if(!file){return;}
  input.value=''; // reset
  
  const reader = new FileReader();
  reader.onload = async function(e){
    try{
      let rows = [];
      const text = e.target.result;
      
      // Parse CSV
      const lines = text.split(/\r?\n/).filter(l=>l.trim());
      if(lines.length < 2){
        showToast('⚠ '+(lang==='en'?'File is empty or has no data rows':'File trống hoặc không có dữ liệu'));
        return;
      }
      
      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVRow(headerLine);
      
      // Find column indices (flexible matching)
      const colMap = {};
      headers.forEach((h,i)=>{
        const hl = h.toLowerCase().trim();
        if(hl.includes('username') || hl === 'tài khoản') colMap.username = i;
        else if(hl.includes('password') || hl.includes('mật khẩu')) colMap.password = i;
        else if(hl.includes('họ tên') || hl.includes('name') || hl === 'full name') colMap.name = i;
        else if(hl.includes('cccd') || hl.includes('citizen') || hl.includes('cmnd') || hl.includes('căn cước')) colMap.cccd = i;
        else if(hl.includes('số đt') || hl.includes('phone') || hl.includes('điện thoại') || hl.includes('sdt')) colMap.phone = i;
        else if(hl.includes('email cá nhân') || hl.includes('personal email') || hl.includes('personal_email')) colMap.personal_email = i;
        else if(hl.includes('phòng ban') || hl.includes('dept')) colMap.dept = i;
        else if(hl.includes('chức danh') || hl.includes('title')) colMap.title = i;
        else if(hl.includes('role key') || hl === 'vai trò key') colMap.role = i;
        else if((hl.includes('vai trò') || hl.includes('role')) && !colMap.role) colMap.roleLabel = i;
        else if(hl.includes('email') && !colMap.personal_email) colMap.email = i;
        else if(hl.includes('trạng thái') || hl.includes('status')) colMap.status = i;
      });
      
      if(!colMap.username && colMap.name === undefined){
        showToast('⚠ '+(lang==='en'?'Cannot find Username or Name column':'Không tìm thấy cột Username hoặc Họ tên'));
        return;
      }
      
      // Parse data rows
      let imported = 0, skipped = 0, errors = [];
      for(let i=1; i<lines.length; i++){
        const cols = parseCSVRow(lines[i]);
        if(cols.length < 2) continue;
        
        const username = (cols[colMap.username]||'').trim();
        const name = (cols[colMap.name]||'').trim();
        if(!username && !name){ skipped++; continue; }
        
        // Resolve role from key or label
        let role = (cols[colMap.role]||'').trim();
        if(!role && colMap.roleLabel !== undefined){
          const label = (cols[colMap.roleLabel]||'').trim();
          const found = Object.entries(ROLES).find(([k,v])=>v.label===label || v.labelEn===label);
          role = found ? found[0] : '';
        }
        if(!role || !ROLES[role]) role = 'trainee';
        
        const dept = (cols[colMap.dept]||'').trim();
        const title = (cols[colMap.title]||'').trim();
        const cccd = colMap.cccd !== undefined ? (cols[colMap.cccd]||'').trim() : '';
        const phone = colMap.phone !== undefined ? (cols[colMap.phone]||'').trim() : '';
        const personal_email = colMap.personal_email !== undefined ? (cols[colMap.personal_email]||'').trim() : '';
        const password = colMap.password !== undefined ? (cols[colMap.password]||'').trim() : '';
        const email = colMap.email !== undefined ? (cols[colMap.email]||'').trim() : '';
        const status = colMap.status !== undefined ? (cols[colMap.status]||'').trim() : 'Active';
        const active = !status.toLowerCase().includes('inactive');
        
        // Check if user exists
        const existing = USERS.find(u=> u.username === username);
        if(existing){
          // Update
          existing.name = name || existing.name;
          existing.dept = dept || existing.dept;
          existing.title = title || existing.title;
          existing.role = role;
          existing.cccd = cccd || existing.cccd || '';
          existing.phone = phone || existing.phone || '';
          existing.personal_email = personal_email || existing.personal_email || '';
          if(password) existing.password = password;
          existing.email = email || existing.email;
          existing.active = active;
        } else {
          // Add new
          const newId = USERS.length > 0 ? Math.max(...USERS.map(u=>parseInt(u.id)||0))+1 : 1;
          USERS.push({
            id: String(newId),
            username: username || name.toLowerCase().replace(/\s+/g,'.'),
            password: password || '',
            name: name, dept: dept, title: title, role: role,
            cccd: cccd, phone: phone, personal_email: personal_email,
            email: email, active: active, mfa_enabled: false
          });
        }
        imported++;
      }
      
      showToast('✅ '+(lang==='en'
        ?`Imported ${imported} users${skipped?' ('+skipped+' skipped)':''}`
        :`Đã nhập ${imported} người dùng${skipped?' ('+skipped+' bỏ qua)':''}`));
      
      markUnsaved();
      renderAdmin();
    }catch(err){
      console.error('Import error:', err);
      showToast('⚠ '+(lang==='en'?'Import failed: ':'Nhập thất bại: ')+err.message);
    }
  };
  reader.readAsText(file, 'UTF-8');
}

// CSV row parser handling quoted fields
function parseCSVRow(row){
  const result = [];
  let current = '';
  let inQuotes = false;
  for(let i=0; i<row.length; i++){
    const c = row[i];
    if(inQuotes){
      if(c === '"' && row[i+1] === '"'){ current += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else { current += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ result.push(current); current = ''; }
      else { current += c; }
    }
  }
  result.push(current);
  return result;
}

async function deleteUserConfirm(userId){
  const u = USERS.find(x=>String(x.id)===String(userId));
  if(!u) return;
  
  // Show modal with soft/hard delete options
  closeModal();
  const modal=document.createElement('div');
  modal.id='delete-user-modal';
  modal.className='modal-overlay';
  modal.innerHTML=`
    <div class="modal" style="max-width:480px">
      <div class="modal-header">
        <div class="modal-title">${lang==='en'?'Remove user':'Xóa người dùng'}: ${escapeHtml(u.name)}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">✕</button>
      </div>
      <div class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">@${escapeHtml(u.username)} · ${escapeHtml(u.dept)} · ${escapeHtml(u.title)}</div>
        <button onclick="doSoftDeleteUser('${u.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:10px;cursor:pointer;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='color-mix(in srgb, var(--amber) 28%, var(--border))'">
          <span style="font-size:22px">⏸</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--amber)">${lang==='en'?'Deactivate (Soft delete)':'Vô hiệu hóa (Xóa mềm)'}</div><div style="font-size:11px;color:color-mix(in srgb, var(--amber) 72%, var(--text-secondary));margin-top:2px">${lang==='en'?'User becomes inactive but data is preserved. Can be reactivated later.':'Người dùng bị khóa nhưng dữ liệu được giữ lại. Có thể kích hoạt lại sau.'}</div></div>
        </button>
        <button onclick="doHardDeleteUser('${u.id}','${escapeHtml(u.username)}','${escapeHtml(u.name)}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid color-mix(in srgb, var(--red) 28%, var(--border));border-radius:10px;cursor:pointer;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='var(--red)'" onmouseout="this.style.borderColor='color-mix(in srgb, var(--red) 28%, var(--border))'">
          <span style="font-size:22px">🗑</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--red)">${lang==='en'?'Delete permanently':'Xóa hoàn toàn'}</div><div style="font-size:11px;color:color-mix(in srgb, var(--red) 72%, var(--text-secondary));margin-top:2px">${lang==='en'?'Completely removes the user from the system. This action cannot be undone.':'Xóa hoàn toàn người dùng khỏi hệ thống. Hành động này không thể hoàn tác.'}</div></div>
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add('show'));
}

async function refreshAdminUserRuntimeProjection(){
  await loadUsersFromServerIfAdmin();
  await Promise.all([
    loadAuthoritativeRoleCatalog({force:true}),
    loadAuthoritativeOrgCatalog({force:true})
  ]);
  renderAdmin();
}

async function doSoftDeleteUser(userId){
  const u = USERS.find(x=>String(x.id)===String(userId));
  if(!u) return;
  closeModal();
  try{
    const res = await apiCall('admin_user_upsert', {
      username: u.username, name: u.name, dept: u.dept||'', title: u.title||'',
      role: u.role||'employee', active: false
    });
    if(res && res.ok){
      showToast(lang==='en'?'✅ Deactivated':'✅ Đã vô hiệu hóa');
      await refreshAdminUserRuntimeProjection();
    } else {
      showToast('\u26A0 '+((res&&res.error)?res.error:'error'));
    }
  }catch(e){ showToast('\u26A0 Server error'); }
}

async function doHardDeleteUser(userId,username,name){
  if(!confirm((lang==='en'?'⚠ PERMANENTLY DELETE ':'⚠ XÓA VĨNH VIỄN ')+name+'?\n\n'+(lang==='en'?'This will completely remove the user from the database. This action CANNOT be undone!':'Điều này sẽ xóa hoàn toàn người dùng khỏi cơ sở dữ liệu. Hành động này KHÔNG THỂ hoàn tác!'))) return;
  closeModal();
  try{
    const res = await apiCall('admin_user_delete', { username: username });
    if(res && res.ok){
      showToast(lang==='en'?'✅ User permanently deleted':'✅ Đã xóa hoàn toàn người dùng');
      await refreshAdminUserRuntimeProjection();
    } else {
      const errMsg = res&&res.error==='cannot_delete_self' ? (lang==='en'?'Cannot delete yourself':'Không thể xóa chính mình') : ((res&&res.error)?res.error:'error');
      showToast('\u26A0 '+errMsg);
    }
  }catch(e){ showToast('\u26A0 Server error'); }
}

function showUserModal(userId){
  const isEdit = !!userId;
  const seedUser = isEdit ? USERS.find(x=>String(x.id)===String(userId)) : {id:'',name:'',username:'',dept:'',title:'',role:'employee',active:true,mfa_enabled:false,cccd:'',phone:'',personal_email:'',hcm_org_unit_id:'',hcm_position_id:''};
  if(isEdit && !seedUser){
    showToast(lang==='en'?'⚠ User not found':'⚠ Không tìm thấy người dùng');
    return;
  }
  const assignment = resolveAuthoritativeUserAssignment(seedUser || {});
  const u0 = Object.assign({}, seedUser || {}, {
    hcm_org_unit_id: assignment.orgUnitId || String((seedUser && seedUser.hcm_org_unit_id) || ''),
    hcm_position_id: assignment.positionId || String((seedUser && seedUser.hcm_position_id) || ''),
    dept: assignment.deptCode || String((seedUser && seedUser.dept) || ''),
    title: assignment.positionTitle || String((seedUser && seedUser.title) || '')
  });

  closeModal();

  // Reset modal state
  window.__um_state = { tempPassword: '' };

  const roleOptions = userRoleOptionHtml(u0.role || '');
  
  const deptOptions = DEPARTMENTS.map(d=>`<option value="${d.code}" ${u0.dept===d.code?'selected':''}>${d.code} — ${lang==='en'?d.labelEn:d.label}</option>`).join('');
  
  const scopedTitles = titlesForDept(u0.dept)||[];
  const titleOptions = scopedTitles.map(t=>`<option value="${escapeHtml(t)}" ${u0.title===t?'selected':''}>${escapeHtml(t)}</option>`).join('');

  const modal=document.createElement('div');
  modal.id='user-modal';
  modal.className='modal-overlay';
  modal.innerHTML=`
    <div class="modal" style="max-width:760px">
      <div class="modal-header">
        <div class="modal-title">${lang==='en'?(isEdit?'Edit user':'Create user'):(isEdit?'Sửa người dùng':'Tạo người dùng')}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">✕</button>
      </div>

      <div class="modal-body">
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Full name':'Họ tên'}</label>
            <input id="um-name" type="text" value="${escapeHtml(u0.name||'')}" placeholder="${lang==='en'?'Full name':'Họ tên'}">
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Username':'Tên đăng nhập'}</label>
            <input id="um-username" type="text" value="${escapeHtml(u0.username||'')}" ${isEdit?'':''}  placeholder="ten.ho">
            ${isEdit?'<div class="help-text" style="color:#d97706;font-size:10px">'+( lang==='en'?'⚠ Changing username will create a new account':'⚠ Đổi username sẽ tạo tài khoản mới')+'</div>':''}
          </div>
        </div>

        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Department':'Phòng ban'} ▾</label>
            <select id="um-dept" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
              <option value="">— ${lang==='en'?'Select department':'Chọn phòng ban'} —</option>
              ${deptOptions}
            </select>
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Title':'Chức danh'} ▾</label>
            <select id="um-title" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
              <option value="">— ${lang==='en'?'Select title':'Chọn chức danh'} —</option>
              ${titleOptions}
            </select>
            ${!TITLES.includes(u0.title||'') && u0.title ? '<div class="help-text" style="font-size:10px;color:#d97706">⚠ "'+escapeHtml(u0.title)+'" '+( lang==='en'?'not in standard list — will be kept':'không có trong danh sách — sẽ được giữ lại')+'</div>':''}
          </div>
        </div>

        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Role':'Vai trò'} ▾</label>
            <select id="um-role">${roleOptions}</select>
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Status':'Trạng thái'}</label>
            <select id="um-active">
              <option value="1" ${u0.active!==false?'selected':''}>${lang==='en'?'Active':'Hoạt động'}</option>
              <option value="0" ${u0.active===false?'selected':''}>${lang==='en'?'Inactive':'Khóa'}</option>
            </select>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-light,#e2e8f0);margin:14px 0;padding-top:14px">
          <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:10px">📋 ${lang==='en'?'Personal Information':'Thông tin cá nhân'}</div>
          <div class="modal-grid-2">
            <div class="modal-field">
              <label>${lang==='en'?'Citizen ID (CCCD)':'Số CCCD / CMND'}</label>
              <input id="um-cccd" type="text" value="${escapeHtml(u0.cccd||'')}" placeholder="${lang==='en'?'e.g. 079123456789':'VD: 079123456789'}" maxlength="12">
            </div>
            <div class="modal-field">
              <label>${lang==='en'?'Phone number':'Số điện thoại'}</label>
              <input id="um-phone" type="tel" value="${escapeHtml(u0.phone||'')}" placeholder="${lang==='en'?'e.g. 0901234567':'VD: 0901234567'}">
            </div>
          </div>
          <div class="modal-field">
            <label>${lang==='en'?'Personal email':'Email cá nhân'}</label>
            <input id="um-personal-email" type="email" value="${escapeHtml(u0.personal_email||'')}" placeholder="name@gmail.com">
          </div>
        </div>

        <div class="modal-field">
          <label>${lang==='en'?'Password':'Mật khẩu'}</label>
          <input id="um-password" type="text" autocomplete="new-password"
            placeholder="${lang==='en'?'Set a new password (leave blank to keep unchanged)':'Tạo mật khẩu mới (để trống nếu không đổi)'}">
          <div class="help-text">
            ${lang==='en'
              ?'Reset will generate a temporary password and clear 2FA enrollment.'
              :'Reset sẽ tạo mật khẩu tạm thời và xoá đăng ký 2FA.'}
          </div>

          <div id="um-tempwrap" style="display:none;margin-top:10px;padding:10px;border:1px solid var(--ln2);border-radius:12px;background:#f9fbff">
            <div style="font-weight:700;margin-bottom:6px">${lang==='en'?'Temporary password':'Mật khẩu tạm thời'}</div>
            <div id="um-temppw" style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"></div>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          ${isEdit ? `<button class="btn-admin" onclick="resetPasswordFromModal('${escapeHtml(u0.username||'')}')">${lang==='en'?'Reset password':'Reset password'}</button>` : ''}
          <button class="btn-admin" onclick="copyLoginInfoFromModal()">${lang==='en'?'Copy login info':'Copy thông tin đăng nhập'}</button>
          <button class="btn-admin" onclick="downloadLoginInfoFromModal()">${lang==='en'?'Download .txt':'Tải .txt'}</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-admin" onclick="closeModal()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="saveUserFromModal(${isEdit?`'${escapeHtml(u0.id)}'`:"''"})">${lang==='en'?'Save':'Lưu'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  // Filter Title by Department + default Role = Title
  const deptSel = modal.querySelector('#um-dept');
  const titleSel = modal.querySelector('#um-title');
  const roleSel = modal.querySelector('#um-role');

  function rebuildTitleOptions(){
    const dept = (deptSel && deptSel.value) ? deptSel.value : '';
    const prev = titleSel ? titleSel.value : '';
    const list = (dept && titlesForDept(dept) && titlesForDept(dept).length) ? titlesForDept(dept) : [];
    if(!titleSel) return;
    titleSel.innerHTML = '<option value="">-- Chọn chức danh --</option>' + list.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
    // Restore if still valid
    if(prev && list.includes(prev)) titleSel.value = prev;
    else titleSel.value = '';
  }

  function autoRoleFromTitle(){
    if(!roleSel || !titleSel) return;
    const resolved = resolveAuthoritativeUserAssignment({
      dept: deptSel ? deptSel.value : '',
      title: titleSel.value
    });
    const k = roleCodeForUserTitle(titleSel.value, resolved.deptCode || (deptSel ? deptSel.value : ''), resolved.position);
    if(k) roleSel.value = k;
  }

  if(deptSel && titleSel){
    deptSel.addEventListener('change', ()=>{ rebuildTitleOptions(); autoRoleFromTitle(); });
    titleSel.addEventListener('change', ()=>{ autoRoleFromTitle(); });
    // initial
    rebuildTitleOptions();
    if(u0.title) titleSel.value = u0.title;
    autoRoleFromTitle();
  }

  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
}

async function saveUserFromModal(userId){
  try{
    const isEdit = !!userId;
    const existingUser = isEdit ? (USERS.find(x=>String(x.id)===String(userId)) || null) : null;
    const name = String(document.getElementById('um-name')?.value||'').trim();
    const username = String(document.getElementById('um-username')?.value||'').trim().toLowerCase();
    const dept = String(document.getElementById('um-dept')?.value||'').trim();
    const title = String(document.getElementById('um-title')?.value||'').trim();
    const role = String(document.getElementById('um-role')?.value||'employee').trim();
    const active = String(document.getElementById('um-active')?.value||'1') === '1';
    const password = String(document.getElementById('um-password')?.value||'').trim();
    const cccd = String(document.getElementById('um-cccd')?.value||'').trim();
    const phone = String(document.getElementById('um-phone')?.value||'').trim();
    const personal_email = String(document.getElementById('um-personal-email')?.value||'').trim();

    if(!username){
      showToast(lang==='en'?'⚠ Username is required':'⚠ Username là bắt buộc');
      return;
    }
    if(!name){
      showToast(lang==='en'?'⚠ Full name is required':'⚠ Họ tên là bắt buộc');
      return;
    }

    if(role && !roleCodeExistsInUserCatalog(role)){
      await loadAuthoritativeRoleCatalog({force:!!ADMIN_AUTH_STATE.roles.error});
      if(!roleCodeExistsInUserCatalog(role)){
        showToast(lang==='en'
          ?'⚠ Role must exist in core_system.roles before saving'
          :'⚠ Vai trò phải tồn tại trong core_system.roles trước khi lưu');
        return;
      }
    }

    const deptChanged = String(existingUser && existingUser.dept || '') !== dept;
    const titleChanged = String(existingUser && existingUser.title || '') !== title;
    const assignmentChanged = !isEdit ? !!(dept || title) : (deptChanged || titleChanged);
    const preserveExistingAssignment = existingUser ? {
      orgUnitId: String(existingUser.hcm_org_unit_id || ''),
      positionId: String(existingUser.hcm_position_id || ''),
      deptCode: dept || String(existingUser.dept || ''),
      positionTitle: title || String(existingUser.title || '')
    } : {orgUnitId:'', positionId:'', deptCode:dept, positionTitle:title};

    if(assignmentChanged && (dept || title) && !ADMIN_AUTH_STATE.org.loaded){
      await loadAuthoritativeOrgCatalog({force:!!ADMIN_AUTH_STATE.org.error});
    }

    let assignment = preserveExistingAssignment;
    if(ADMIN_AUTH_STATE.org.loaded){
      const resolvedAssignment = resolveAuthoritativeUserAssignment({
        dept,
        title,
        hcm_org_unit_id: preserveExistingAssignment.orgUnitId,
        hcm_position_id: preserveExistingAssignment.positionId
      });
      const mustEnforceOrg = !isEdit || deptChanged || !preserveExistingAssignment.orgUnitId;
      const mustEnforcePosition = !isEdit || titleChanged || !preserveExistingAssignment.positionId;
      if(dept && !resolvedAssignment.orgUnitId && mustEnforceOrg){
        showToast(lang==='en'?'⚠ Department must exist in the HCM organization catalog':'⚠ Phòng ban phải tồn tại trong danh mục HCM');
        return;
      }
      if(title && !resolvedAssignment.positionId && mustEnforcePosition){
        showToast(lang==='en'?'⚠ Title must map to an HCM position before saving':'⚠ Chức danh phải được khai báo trong vị trí HCM trước khi lưu');
        return;
      }
      assignment = {
        orgUnitId: resolvedAssignment.orgUnitId || preserveExistingAssignment.orgUnitId || '',
        positionId: resolvedAssignment.positionId || preserveExistingAssignment.positionId || '',
        deptCode: resolvedAssignment.deptCode || preserveExistingAssignment.deptCode || dept,
        positionTitle: resolvedAssignment.positionTitle || preserveExistingAssignment.positionTitle || title
      };
    }else if(assignmentChanged && (dept || title)){
      showToast(lang==='en'
        ?'⚠ Cannot change department/title while the HCM organization runtime is unavailable'
        :'⚠ Không thể đổi phòng ban/chức danh khi runtime tổ chức HCM chưa sẵn sàng');
      return;
    }

    const payload = {
      username,
      name,
      dept: assignment.deptCode || dept,
      title: assignment.positionTitle || title,
      role,
      active,
      cccd,
      phone,
      personal_email,
      hcm_org_unit_id: assignment.orgUnitId || '',
      hcm_position_id: assignment.positionId || ''
    };
    if(password) payload.password = password;

    const res = await apiCall('admin_user_upsert', payload);
    if(res && res.ok){
      if(res.temp_password){
        window.__um_state = window.__um_state || {};
        window.__um_state.tempPassword = res.temp_password;
        const wrap = document.getElementById('um-tempwrap');
        const out = document.getElementById('um-temppw');
        if(wrap && out){
          out.textContent = res.temp_password;
          wrap.style.display = 'block';
        }
      }
      showToast(lang==='en'?'✅ Saved':'✅ Đã lưu');
      closeModal();
      await refreshAdminUserRuntimeProjection();
    }else{
      const msg = (res && (res.message || res.error)) ? (': ' + (res.message || res.error)) : '';
      showToast((lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server') + msg);
    }
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
  }
}

async function resetPasswordFromModal(username){
  try{
    const u = String(username||'').trim();
    if(!u){ showToast(lang==='en'?'\u26A0 Username is required':'\u26A0 Thi\u1ebfu t\u00ean t\u00e0i kho\u1ea3n'); return; }
    const res = await apiCall('admin_user_reset_password', { username: u });
    if(res && res.ok){
      const temp = res.temp_password || '';
      window.__um_state = window.__um_state || {};
      window.__um_state.tempPassword = temp;

      const wrap = document.getElementById('um-tempwrap');
      const out = document.getElementById('um-temppw');
      if(wrap && out){
        out.textContent = temp;
        wrap.style.display = 'block';
      }
      // Also fill password box for easier copying (optional)
      const pw = document.getElementById('um-password');
      if(pw) pw.value = temp;

      showToast(lang==='en'?'✅ Password reset':'✅ Đã reset password');
    }else{
      const msg = (res && (res.message || res.error)) ? (': ' + (res.message || res.error)) : '';
      showToast((lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server') + msg);
    }
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
  }
}

function getPortalLoginUrl(){
  // Current page without hash/query
  const url = String(location.href||'').split('#')[0].split('?')[0];
  return url;
}

function composeLoginInfo(username, password){
  const link = getPortalLoginUrl();
  return (lang==='en'
    ? `HESEM MOM Login\n\nLink: ${link}\nUsername: ${username}\nPassword: ${password}\n`
    : `Thông tin đăng nhập HESEM MOM\n\nLink: ${link}\nTài khoản: ${username}\nMật khẩu: ${password}\n`);
}

async function copyLoginInfoFromModal(){
  try{
    const username = String(document.getElementById('um-username')?.value||'').trim();
    const passwordInput = String(document.getElementById('um-password')?.value||'').trim();
    const temp = (window.__um_state && window.__um_state.tempPassword) ? window.__um_state.tempPassword : '';
    const password = passwordInput || temp;

    if(!username || !password){
      showToast(lang==='en'?'⚠ Please set/reset a password first':'⚠ Hãy đặt/reset password trước');
      return;
    }

    const info = composeLoginInfo(username, password);
    await navigator.clipboard.writeText(info);
    showToast(lang==='en'?'✅ Copied':'✅ Đã copy');
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'⚠ Cannot copy':'⚠ Không copy được');
  }
}

function downloadLoginInfoFromModal(){
  const username = String(document.getElementById('um-username')?.value||'').trim();
  const passwordInput = String(document.getElementById('um-password')?.value||'').trim();
  const temp = (window.__um_state && window.__um_state.tempPassword) ? window.__um_state.tempPassword : '';
  const password = passwordInput || temp;

  if(!username || !password){
    showToast(lang==='en'?'⚠ Please set/reset a password first':'⚠ Hãy đặt/reset password trước');
    return;
  }

  const info = composeLoginInfo(username, password);
  const blob = new Blob([info], {type:'text/plain;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `login_${username}.txt`;
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{ URL.revokeObjectURL(a.href); a.remove(); }, 0);
}


function closeModal(){
  ['user-modal','perm-modal','create-doc-modal','dict-modal','delete-user-modal','git-sync-modal'].forEach(id=>{
    const m=document.getElementById(id);
    if(m) m.remove();
  });
}

function saveUser(existingId){
  const name=document.getElementById('mu-name').value.trim();
  const username=document.getElementById('mu-username').value.trim();
  const pin=document.getElementById('mu-pin').value;
  const title=document.getElementById('mu-title').value.trim();
  const role=document.getElementById('mu-role').value;
  const dept=document.getElementById('mu-dept').value;
  if(!name||!username){alert(lang==='en'?'Name and username required':'Cần nhập tên và username');return;}
  if(existingId){
    const u=USERS.find(x=>String(x.id)===String(existingId));
    if(u){Object.assign(u,{name,username,pin,title,role,dept});}
  } else {
    const newId='U'+String(USERS.length+1).padStart(3,'0');
    USERS.push({id:newId,name,username,pin,role,dept,title,avatar:'🧑',active:true});
  }
  saveUsersToStorage();
  closeModal();
  renderAdmin();
}

async function toggleUserActive(userId){
  const u = USERS.find(x=>String(x.id)===String(userId));
  if(!u) return;

  const newActive = !(u.active!==false);

  try{
    const res = await apiCall('admin_user_upsert', {
      username: u.username,
      name: u.name||u.username,
      dept: u.dept||'',
      title: u.title||'',
      role: u.role||'employee',
      active: newActive
    });

    if(res && res.ok){
      showToast(lang==='en'?'✅ Updated':'✅ Đã cập nhật');
      await refreshAdminUserRuntimeProjection();
    }else{
      showToast('\u26A0 '+((res&&res.error)?res.error:'server_error'));
    }
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
  }
}

async function lockUser(userId){
  const u = USERS.find(x=>String(x.id)===String(userId));
  if(!u) return;
  if(u.active===false){
    showToast(lang==='en'?'ℹ️ Already inactive':'ℹ️ Đã bị khóa');
    return;
  }
  try{
    const res = await apiCall('admin_user_upsert', {
      username: u.username,
      name: u.name||u.username,
      dept: u.dept||'',
      title: u.title||'',
      role: u.role||'employee',
      active: false
    });
    if(res && res.ok){
      showToast(lang==='en'?'✅ Locked':'✅ Đã khóa');
      await refreshAdminUserRuntimeProjection();
    }else{
      showToast('\u26A0 '+((res&&res.error)?res.error:'server_error'));
    }
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'\u26A0 Server error':'\u26A0 L\u1ed7i server');
  }
}

async function pauseUser(userId){
  return toggleUserActive(userId);
}



function editUserPerms(userId){
  const u=USERS.find(x=>String(x.id)===String(userId));
  if(!u)return;
  const overrideKey = userPermOverrideKey(u);
  const overrides=(overrideKey && PERM_OVERRIDES[overrideKey]) ? PERM_OVERRIDES[overrideKey] : {grant:[],deny:[]};
  const roleDocs=ROLE_DOCS[u.role];
  
  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.id='perm-modal';
  
  let catHtml='';
  const cats=[...new Set(DOCS.map(d=>d.cat))];
  cats.forEach(catId=>{
    const cat=CATEGORIES.find(c=>c.id===catId);
    const docsInCat=DOCS.filter(d=>d.cat===catId);
    catHtml+=`<div class="perm-cat-header">${cat?cat.icon:''} ${cat?catLabel(cat):catId} (${docsInCat.length})</div>`;
    docsInCat.forEach(d=>{
      const baseAccess=docMatchesRole(d.code,u.role);
      const granted=overrides.grant&&overrides.grant.includes(d.code);
      const denied=overrides.deny&&overrides.deny.includes(d.code);
      const checked=granted||(baseAccess&&!denied);
      const isOverride=granted||denied;
      catHtml+=`<div class="perm-doc-row">
        <label${isOverride?' style="font-weight:600"':''}>
          <input type="checkbox" data-doc="${d.code}" data-base="${baseAccess}" ${checked?'checked':''} onchange="handlePermChange(this,'${u.id}','${escapeHtml(overrideKey)}')">
          <span class="doc-code">${d.code}</span>
          ${d.title.substring(0,50)}${d.title.length>50?'...':''}
        </label>
        ${isOverride?'<span style="font-size:9px;color:#d97706;font-weight:700">OVERRIDE</span>':''}
      </div>`;
    });
  });
  
  modal.innerHTML=`<div class="modal" style="width:640px;max-height:85vh">
    <h3>🔐 ${lang==='en'?'Permissions for':'Phân quyền cho'}: ${u.name}</h3>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">
      ${lang==='en'?'Role':'Vai trò'}: <b>${ROLES[u.role]?ROLES[u.role].label:u.role}</b> |
      ${lang==='en'?'Base access':'Quyền mặc định'}: <b>${roleDocs==='ALL'?DOCS.length:DOCS.filter(d=>docMatchesRole(d.code,u.role)).length}</b>/${DOCS.length} |
      ${lang==='en'?'Check/uncheck to override role defaults':'Đánh dấu/bỏ đánh dấu để ghi đè quyền mặc định'}
    </div>
    <div style="max-height:55vh;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:8px 12px;background:var(--bg-surface,#fff)">
      ${catHtml}
    </div>
    <div class="modal-actions">
      <button class="btn-admin danger" onclick="resetUserPerms('${u.id}','${escapeHtml(overrideKey)}')">↩ Reset</button>
      <button class="btn-admin secondary" onclick="closeModal()">✕ ${T('admin_cancel')}</button>
      <button class="btn-admin primary" onclick="closeModal();renderAdmin()">✓ OK</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
}

async function handlePermChange(cb, userId, overrideKey){
  const docCode=cb.dataset.doc;
  const baseAccess=cb.dataset.base==='true';
  const key = String(overrideKey || '').trim().toLowerCase();
  if(!key){
    showToast('⚠ ' + (lang==='en' ? 'Missing user override key' : 'Thiếu khóa override người dùng'), 'error');
    cb.checked = !cb.checked;
    return;
  }
  const snapshot = JSON.stringify(PERM_OVERRIDES);
  if(!PERM_OVERRIDES[key])PERM_OVERRIDES[key]={grant:[],deny:[]};
  const ov=PERM_OVERRIDES[key];
  // Remove from both lists
  ov.grant=ov.grant.filter(c=>c!==docCode);
  ov.deny=ov.deny.filter(c=>c!==docCode);
  if(cb.checked && !baseAccess){
    ov.grant.push(docCode); // Grant override
  } else if(!cb.checked && baseAccess){
    ov.deny.push(docCode); // Deny override
  }
  // Clean empty overrides
  if(!ov.grant.length&&!ov.deny.length)delete PERM_OVERRIDES[key];

  try{
    const res = await saveUserDocOverridesToServer();
    if(!(res && res.ok)){
      PERM_OVERRIDES = normalizeUserDocOverridesMap(JSON.parse(snapshot || '{}'));
      cb.checked = !cb.checked;
      showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en' ? 'Save override failed' : 'Lưu override thất bại')), 'error');
      return;
    }
  }catch(e){
    PERM_OVERRIDES = normalizeUserDocOverridesMap(JSON.parse(snapshot || '{}'));
    cb.checked = !cb.checked;
    showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'Save override failed' : 'Lưu override thất bại')), 'error');
    return;
  }

  savePermOverrides();
  // Update override label
  const row=cb.closest('.perm-doc-row');
  const existing=row.querySelector('span[style*="OVERRIDE"]');
  const isOverride=(cb.checked&&!baseAccess)||(!cb.checked&&baseAccess);
  if(isOverride&&!existing){
    row.insertAdjacentHTML('beforeend','<span style="font-size:9px;color:#d97706;font-weight:700">OVERRIDE</span>');
    cb.closest('label').style.fontWeight='600';
  } else if(!isOverride&&existing){
    existing.remove();
    cb.closest('label').style.fontWeight='';
  }
}

async function resetUserPerms(userId, overrideKey){
  const key = String(overrideKey || '').trim().toLowerCase();
  if(!key) return;
  const snapshot = JSON.stringify(PERM_OVERRIDES);
  delete PERM_OVERRIDES[key];
  try{
    const res = await saveUserDocOverridesToServer();
    if(!(res && res.ok)){
      PERM_OVERRIDES = normalizeUserDocOverridesMap(JSON.parse(snapshot || '{}'));
      showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en' ? 'Reset override failed' : 'Reset override thất bại')), 'error');
      return;
    }
  }catch(e){
    PERM_OVERRIDES = normalizeUserDocOverridesMap(JSON.parse(snapshot || '{}'));
    showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en' ? 'Reset override failed' : 'Reset override thất bại')), 'error');
    return;
  }
  savePermOverrides();
  closeModal();
  renderAdmin();
}

function renderAdminPerms(){
  const el=document.getElementById('admin-content');
  const roleEntries=Object.entries(ROLES);
  const r=ROLES[adminEditRole];
  const perms=ROLE_DOCS[adminEditRole];
  const isFullAccess = perms==='ALL';
  
  let catHtml='';
  const cats=[...new Set(DOCS.map(d=>d.cat))];
  cats.forEach(catId=>{
    const cat=CATEGORIES.find(c=>c.id===catId);
    const docsInCat=DOCS.filter(d=>d.cat===catId);
    const accessCount=docsInCat.filter(d=>docMatchesRole(d.code,adminEditRole)).length;
    const allChecked = accessCount === docsInCat.length;
    catHtml+=`<div class="perm-cat-header">
      ${!isFullAccess ? '<input type="checkbox" ' + (allChecked?'checked':'') + ' onchange="toggleCatPerms(this,\''+catId+'\',\''+adminEditRole+'\')"> ' : ''}
      ${cat?cat.icon:''} ${cat?catLabel(cat):catId}
      <span style="font-weight:400;font-size:10px;color:var(--text-3)">${accessCount}/${docsInCat.length}</span>
    </div>`;

    // Use tree-based grouping from FOLDER_TREE
    const tree = buildDocFolderTree(docsInCat, catId);
    const hasChildren = tree.children && tree.children.length > 0;

    if(hasChildren){
      catHtml += renderFolderTreeHtml(tree, 'perms', {role:adminEditRole, isFullAccess, catId}, 0);
      // Render root-level docs (files directly in the category folder)
      if(tree.docs && tree.docs.length > 0){
        tree.docs.forEach(d=>{
          const has=docMatchesRole(d.code,adminEditRole);
          catHtml+=`<div class="perm-doc-row">
            <label>
              ${isFullAccess
                ? '<span style="color:#16a34a;font-weight:700;width:16px;display:inline-block">✓</span>'
                : '<input type="checkbox" data-doc="'+d.code+'" '+(has?'checked':'')+' onchange="toggleRoleDoc(this,\''+adminEditRole+'\')">'}
              <span class="doc-code">${d.code}</span>
              ${d.title.substring(0,55)}${d.title.length>55?'...':''}
            </label>
          </div>`;
        });
      }
    } else {
      docsInCat.forEach(d=>{
        const has=docMatchesRole(d.code,adminEditRole);
        catHtml+=`<div class="perm-doc-row">
          <label>
            ${isFullAccess
              ? '<span style="color:#16a34a;font-weight:700;width:16px;display:inline-block">✓</span>'
              : '<input type="checkbox" data-doc="'+d.code+'" '+(has?'checked':'')+' onchange="toggleRoleDoc(this,\''+adminEditRole+'\')">'}
            <span class="doc-code">${d.code}</span>
            ${d.title.substring(0,55)}${d.title.length>55?'...':''}
          </label>
        </div>`;
      });
    }
  });

  const bodyHtml = `
    <div class="perm-grid">
      <div class="pg-sidebar">
        <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--text-3);border-bottom:1px solid var(--border)">${lang==='en'?'SELECT ROLE':'CHỌN VAI TRÒ'}</div>
        ${roleEntries.map(([k,v])=>{
          const cnt=ROLE_DOCS[k]==='ALL'?DOCS.length:DOCS.filter(d=>docMatchesRole(d.code,k)).length;
          return `<div class="pg-role-item ${adminEditRole===k?'active':''}" onclick="adminEditRole='${k}';renderAdminPerms()">
            ${v.icon} ${v.label}
            <span class="count">${cnt}/${DOCS.length}</span>
          </div>`;
        }).join('')}
      </div>
      <div class="pg-content">
        <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:${r?r.color:'#333'}">${r?r.icon:''} ${r?r.label:adminEditRole}</div>
        <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">
          ${isFullAccess
            ?'<span style="color:#16a34a;font-weight:700">✅ FULL ACCESS — '+(lang==='en'?'All':'Tất cả')+' '+DOCS.length+' '+(lang==='en'?'documents':'tài liệu')+'</span>'
            :'<span>'+(lang==='en'?'Access':'Quyền')+': <b>'+DOCS.filter(d=>docMatchesRole(d.code,adminEditRole)).length+'</b>/'+DOCS.length+' '+(lang==='en'?'documents — check/uncheck to modify':'tài liệu — đánh dấu để thay đổi')+'</span>'}
        </div>
        ${catHtml}
      </div>
    </div>
    <div class="admin-save-bar" id="admin-save-bar" style="${adminUnsaved ? 'display:flex' : 'display:none'}">
      <span class="save-hint">${adminUnsaved?'<b>⚠ '+(lang==='en'?'Unsaved changes':'Có thay đổi chưa lưu')+'</b>':lang==='en'?'Edit permissions then click Save':'Chỉnh phân quyền rồi nhấn Lưu'}</span>
      <button class="btn-admin secondary" onclick="resetAuthoritativeRoleDocsEditor()">↩ Reset</button>
      <button class="btn-admin primary" onclick="adminSaveAll()">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
    </div>`;
  el.innerHTML = `
    <section class="admin-scroll-layout">
      <div class="admin-scroll-body perm-body">${bodyHtml}</div>
    </section>`;
}

// Toggle all docs in a specific subfolder (multi-level aware)
function toggleSubfolderPerms(cb, catId, subName, role){
  _toggleSubPerms(cb, catId, subName, role);
}

function toggleRoleDoc(cb, role){
  if(ROLE_DOCS[role]==='ALL') return;
  const doc=cb.dataset.doc;
  const idx=ROLE_DOCS[role].indexOf(doc);
  if(cb.checked && idx===-1){
    ROLE_DOCS[role].push(doc);
  } else if(!cb.checked && idx>-1){
    ROLE_DOCS[role].splice(idx,1);
  }
  // Also remove wildcard if unchecking a specific doc
  if(!cb.checked){
    // Check if was matched by wildcard
    ROLE_DOCS[role].forEach((p,i)=>{
      if((typeof docCodeMatchesPattern==='function' ? docCodeMatchesPattern(doc,p) : (p.endsWith('*') && doc.startsWith(p.slice(0,-1))))){
        const allInWild=(typeof expandPatternToDocCodes==='function' ? expandPatternToDocCodes(p,DOCS) : DOCS.filter(d=>p.endsWith('*') && d.code.startsWith(p.slice(0,-1))).map(d=>d.code));
        ROLE_DOCS[role].splice(i,1,...allInWild.filter(c=>c!==doc));
      }
    });
  }
  markUnsaved();
  // Update header count
  renderAdminPerms();
}

function toggleCatPerms(cb, catId, role){
  if(ROLE_DOCS[role]==='ALL') return;
  const docsInCat=DOCS.filter(d=>d.cat===catId);
  docsInCat.forEach(d=>{
    const has=ROLE_DOCS[role].some(p=>(typeof docCodeMatchesPattern==='function' ? docCodeMatchesPattern(d.code,p) : (p.endsWith('*') ? d.code.startsWith(p.slice(0,-1)) : p===d.code)));
    if(cb.checked && !has){
      ROLE_DOCS[role].push(d.code);
    } else if(!cb.checked && has){
      // Remove exact match
      const idx=ROLE_DOCS[role].indexOf(d.code);
      if(idx>-1) ROLE_DOCS[role].splice(idx,1);
      // Also expand/remove wildcards
      ROLE_DOCS[role]=ROLE_DOCS[role].filter(p=>(typeof docCodeMatchesPattern==='function' ? !docCodeMatchesPattern(d.code,p) : !(p.endsWith('*') && d.code.startsWith(p.slice(0,-1)))));
    }
  });
  markUnsaved();
  renderAdminPerms();
}

function saveRoleDocsToStorage(){
  try{ sessionStorage.removeItem('hesem_role_docs'); }catch(e){}
  return true;
}
function loadRoleDocsFromStorage(){
  try{ sessionStorage.removeItem('hesem_role_docs'); }catch(e){}
}

// ═══════════════════════════════════════════════════
// DOM HELPER: el(tag, attrs, children) — lightweight DOM builder
// ═══════════════════════════════════════════════════
function el(tag, attrs, children) {
  const node = document.createElement(tag);
  if (attrs) {
    Object.keys(attrs).forEach(k => {
      if (k === 'class') node.className = attrs[k];
      else if (k === 'onclick' || k === 'onchange' || k === 'oninput') node[k] = attrs[k];
      else if (k === 'style') node.setAttribute('style', attrs[k]);
      else if (k === 'open' && attrs[k]) node.setAttribute('open', '');
      else if (k === 'draggable') node.draggable = attrs[k];
      else node.setAttribute(k, attrs[k]);
    });
  }
  if (typeof children === 'string') {
    node.textContent = children;
  } else if (Array.isArray(children)) {
    children.forEach(c => { if (c) node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c); });
  } else if (children instanceof Node) {
    node.appendChild(children);
  }
  return node;
}
Object.defineProperty(window, 'adminPanel', { get: function() { return document.getElementById('admin-content'); } });

function renderAdminDeptTitleFallback(){
  const panel = document.getElementById('admin-content');
  if(!panel) return;
  const deptCards = (DEPARTMENTS || []).slice().sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''))).map(dept => {
    const titles = (titlesForDept(dept.code) || []).slice().sort((a,b)=>String(a).localeCompare(String(b)));
    const deptUsers = USERS.filter(user => String(user.dept || '') === String(dept.code || ''));
    return `<article style="border:1px solid var(--border);border-radius:14px;background:var(--bg-surface,#fff);padding:14px">
      <div style="display:flex;justify-content:space-between;gap:10px;flex-wrap:wrap">
        <div>
          <div style="font-weight:800;color:${escapeHtml(dept.color || defaultDepartmentColor(dept.code))}">${escapeHtml(String(dept.code || ''))}</div>
          <div style="font-size:14px;font-weight:700">${escapeHtml(String(lang==='en' ? (dept.labelEn || dept.label || dept.code) : (dept.label || dept.labelEn || dept.code)))}</div>
        </div>
        <div style="font-size:11px;color:var(--text-3)">${titles.length} ${lang==='en'?'titles':'chức danh'} • ${deptUsers.length} ${lang==='en'?'users':'user'}</div>
      </div>
      <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:6px">
        ${titles.length ? titles.map(title => {
          const count = USERS.filter(user => String(user.dept || '') === String(dept.code || '') && String(user.title || '') === String(title || '')).length;
          return `<span style="font-size:10px;padding:4px 8px;border-radius:999px;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--brand-2) 24%, var(--border));color:var(--brand-2)">${escapeHtml(String(title))} • ${count}</span>`;
        }).join('') : `<span class="muted">${lang==='en'?'No title in cached projection':'Chưa có chức danh trong projection hiện có'}</span>`}
      </div>
    </article>`;
  }).join('');

  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">🏢 ${lang==='en'?'Organization units and titles':'Phòng ban & Chức danh'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${lang==='en'
          ? 'HCM runtime is unavailable, so this tab is showing the current portal projection instead of blocking the screen.'
          : 'Runtime HCM hiện chưa sẵn sàng, nên tab này đang hiển thị projection hiện có của portal thay vì khóa trắng màn hình.'}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-admin secondary" onclick="loadAuthoritativeOrgCatalog({force:true})">🔄 ${lang==='en'?'Retry runtime':'Thử lại runtime'}</button>
      </div>
    </div>
    <div style="padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--amber-dark,#b45309)">
      ${ADMIN_AUTH_STATE.org.loading
        ? (lang==='en'?'Authoritative organization catalog is still loading in the background. Create/update actions will unlock after runtime responds.':'Catalog tổ chức authoritative vẫn đang tải nền. Các thao tác tạo/cập nhật sẽ mở lại sau khi runtime phản hồi.')
        : (lang==='en'?'Authoritative create/update actions are temporarily disabled until the HCM runtime responds.':'Các thao tác tạo/cập nhật authoritative đang tạm khóa cho tới khi runtime HCM phản hồi lại.')}
      ${ADMIN_AUTH_STATE.org.error ? `<div style="margin-top:6px"><b>Runtime:</b> ${escapeHtml(ADMIN_AUTH_STATE.org.error)}</div>` : ''}
    </div>`;
  const bodyHtml = `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:12px">
    ${deptCards || `<div class="hm-empty">${lang==='en'?'No department projection available.':'Chưa có projection phòng ban khả dụng.'}</div>`}
  </div>`;
  panel.innerHTML = adminScopedLayout(headHtml, bodyHtml);
}

function renderAdminOrgChartFallback(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  const blocks = (DEPARTMENTS || []).slice().sort((a,b)=>String(a.code||'').localeCompare(String(b.code||''))).map(dept => {
    const deptUsers = USERS.filter(user => String(user.dept || '') === String(dept.code || '') && user.active !== false);
    const titles = {};
    deptUsers.forEach(user => {
      const title = String(user.title || (lang==='en' ? 'Unassigned' : 'Chưa gán'));
      if(!titles[title]) titles[title] = [];
      titles[title].push(user);
    });
    const titleHtml = Object.keys(titles).sort((a,b)=>String(a).localeCompare(String(b))).map(title => {
      return `<div style="border:1px solid var(--border);border-radius:10px;padding:10px;background:var(--bg-surface,#fff)">
        <div style="font-weight:700">${escapeHtml(title)}</div>
        <div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px">${titles[title].map(user=>`<span style="font-size:10px;padding:3px 8px;border-radius:999px;background:color-mix(in srgb, var(--cyan) 10%, var(--bg-surface,#fff));color:var(--cyan-dark,#0f766e);border:1px solid color-mix(in srgb, var(--cyan) 22%, var(--border))">@${escapeHtml(String(user.username || ''))}</span>`).join('')}</div>
      </div>`;
    }).join('');
    return `<section style="border:1px solid var(--border);border-radius:14px;background:var(--bg-surface-alt,#fafbfc);overflow:hidden">
      <div style="padding:12px 14px;border-bottom:1px solid var(--border);background:linear-gradient(180deg,var(--bg-surface,#fff),var(--bg-surface-alt,#f8fafc))">
        <div style="font-weight:800;color:${escapeHtml(dept.color || defaultDepartmentColor(dept.code))}">${escapeHtml(String(dept.code || ''))}</div>
        <div style="font-size:14px;font-weight:700">${escapeHtml(String(lang==='en' ? (dept.labelEn || dept.label || dept.code) : (dept.label || dept.labelEn || dept.code)))}</div>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${deptUsers.length} ${lang==='en'?'active portal users':'user portal đang hoạt động'}</div>
      </div>
      <div style="padding:12px;display:grid;gap:8px">
        ${titleHtml || `<div class="muted">${lang==='en'?'No active portal user assigned to this department.':'Chưa có user portal hoạt động trong đơn vị này.'}</div>`}
      </div>
    </section>`;
  }).join('');
  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">🏗 ${lang==='en'?'Organization chart':'Sơ đồ tổ chức'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${lang==='en'
          ? 'Showing the current portal organization projection while HCM runtime is unavailable.'
          : 'Đang hiển thị projection tổ chức hiện có của portal trong lúc runtime HCM chưa sẵn sàng.'}</div>
      </div>
      <button class="btn-admin secondary" onclick="loadAuthoritativeOrgCatalog({force:true})">🔄 ${lang==='en'?'Retry runtime':'Thử lại runtime'}</button>
    </div>
    <div style="padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--amber-dark,#b45309)">
      ${ADMIN_AUTH_STATE.org.error ? escapeHtml(ADMIN_AUTH_STATE.org.error) : (lang==='en'?'The authoritative HCM org chart is still loading.':'Sơ đồ tổ chức HCM authoritative vẫn đang tải.')}
    </div>`;
  const bodyHtml = `<div style="display:grid;gap:12px">${blocks || `<div class="hm-empty">${lang==='en'?'No portal organization projection available.':'Chưa có projection tổ chức portal khả dụng.'}</div>`}</div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml);
}

function renderAdminRolesFallback(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  const rows = legacyRolesForAdminGrid();
  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">🛡 ${lang==='en'?'Role catalog':'Catalog vai trò'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${lang==='en'
          ? 'Showing the current portal role projection while core_system.roles is unavailable.'
          : 'Đang hiển thị projection vai trò hiện có của portal trong lúc core_system.roles chưa sẵn sàng.'}</div>
      </div>
      <button class="btn-admin secondary" onclick="loadAuthoritativeRoleCatalog({force:true})">🔄 ${lang==='en'?'Retry runtime':'Thử lại runtime'}</button>
    </div>
    <div style="padding:10px 12px;border-radius:10px;border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--amber-dark,#b45309)">
      ${lang==='en'
        ? 'The tab is available for inspection immediately. Authoritative create/update actions will re-enable automatically when the role runtime responds.'
        : 'Tab vẫn mở để kiểm tra ngay. Các thao tác tạo/cập nhật authoritative sẽ tự mở lại khi runtime vai trò phản hồi.'}
      ${ADMIN_AUTH_STATE.roles.error ? `<div style="margin-top:6px"><b>Runtime:</b> ${escapeHtml(ADMIN_AUTH_STATE.roles.error)}</div>` : ''}
    </div>`;
  const bodyHtml = `<div style="overflow-x:auto">
      <table class="admin-table">
        <thead><tr>
          <th></th><th>${lang==='en'?'Role':'Vai trò'}</th><th>Code</th><th>Dept</th><th>Level</th><th>${lang==='en'?'Members':'Thành viên'}</th><th>${lang==='en'?'Mode':'Chế độ'}</th>
        </tr></thead>
        <tbody>
          ${rows.map(row => {
            const code = String(row.role_code || '');
            const ui = roleRecordUi(code, row);
            const members = USERS.filter(user => String(user.role || '') === code && user.active !== false);
            return `<tr>
              <td style="font-size:16px">${escapeHtml(ui.icon || '👤')}</td>
              <td><b style="color:${escapeHtml(ui.color)}">${escapeHtml(ui.label || code)}</b><br><span style="font-size:10px;color:var(--text-3)">${escapeHtml(ui.labelEn || code)}</span></td>
              <td style="font-family:var(--mono);font-size:11px">${escapeHtml(code)}</td>
              <td>${escapeHtml(row.dept_code || ui.dept || '—')}</td>
              <td style="text-align:center">${escapeHtml(String(ui.level))}</td>
              <td style="font-size:11px">${members.length ? escapeHtml(members.map(user => user.name).slice(0,4).join(', ')) + (members.length > 4 ? `<div style="font-size:10px;color:var(--text-3)">+${members.length - 4} khác</div>` : '') : `<span style="color:var(--text-3)">${lang==='en'?'No active member':'Chưa có thành viên hoạt động'}</span>`}</td>
              <td><span style="font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff));color:var(--amber-dark,#b45309)">${lang==='en'?'Fallback read-only':'Fallback chỉ xem'}</span></td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml, 'has-x-scroll');
}

function renderAdminActivityFallback(){
  const el = document.getElementById('admin-content');
  if(!el) return;
  const auditEvents = legacyAuditEventsForAdmin();
  const uniqueUsers = [...new Set(auditEvents.map(item => item.actor_name).filter(Boolean))];
  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px">
      <h3 style="font-size:14px;font-weight:700;margin:0">📊 ${lang==='en'?'Activity fallback view':'Kiểm soát hành vi (fallback)'}</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="activity-user-filter" class="hm-input hm-select" onchange="filterActivityLog()" style="width:auto;min-width:160px">
          <option value="">${lang==='en'?'All actors':'Tất cả actor'}</option>
          ${uniqueUsers.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('')}
        </select>
        <button class="btn-admin secondary" onclick="loadAuthoritativeAuditTrail({force:true})">🔄 ${lang==='en'?'Retry runtime':'Thử lại runtime'}</button>
        <button class="btn-admin secondary" onclick="exportActivityCSV()">📥 CSV</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--amber-dark,#b45309);padding:10px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:8px">
      ${lang==='en'
        ? 'Server-side audit trail is temporarily unavailable. This tab is showing browser-side session telemetry so you can still investigate recent activity.'
        : 'Audit trail phía server đang tạm unavailable. Tab này đang hiển thị telemetry phiên trên trình duyệt để anh vẫn kiểm tra được hoạt động gần đây.'}
      ${ADMIN_AUTH_STATE.audit.error ? `<div style="margin-top:6px"><b>Runtime:</b> ${escapeHtml(ADMIN_AUTH_STATE.audit.error)}</div>` : ''}
    </div>`;
  const bodyHtml = `<div id="activity-sessions-list">
      ${auditEvents.length === 0
        ? `<div style="text-align:center;padding:40px;color:var(--text-3)">${lang==='en'?'No local session telemetry recorded yet':'Chưa có telemetry phiên cục bộ nào được ghi lại'}</div>`
        : auditEvents.map((event, idx) => {
          const recorded = event.recorded_at ? new Date(event.recorded_at) : null;
          const dateStr = recorded && !Number.isNaN(recorded.getTime())
            ? recorded.toLocaleDateString('vi-VN') + ' ' + recorded.toLocaleTimeString('vi-VN')
            : '—';
          const contextText = escapeHtml(JSON.stringify(event.payload || {}, null, 2));
          return `<div class="al-session" data-user="${escapeHtml(event.actor_name || '')}" data-idx="${idx}">
            <div class="al-header">
              <div style="display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap">
                <span style="font-weight:700;font-size:12px;color:var(--text)">${escapeHtml(event.actor_name || 'user')}</span>
                <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff));color:var(--amber-dark,#b45309)">${escapeHtml(event.event_type || 'event')}</span>
                <span style="font-size:10px;color:var(--text-2)">🕐 ${dateStr}</span>
              </div>
              <button class="btn-admin secondary sm" onclick="this.parentElement.parentElement.querySelector('.al-detail').style.display=this.parentElement.parentElement.querySelector('.al-detail').style.display==='none'?'':'none';this.textContent=this.textContent.includes('▾')?'▴ Thu gọn':'▾ Chi tiết'">
                ▾ ${lang==='en'?'Detail':'Chi tiết'}
              </button>
            </div>
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--text-3);margin:6px 0;padding:8px;background:var(--bg-surface-alt,#f8fafc);border-radius:6px">
              <span>🧩 <b>Aggregate:</b> ${escapeHtml(event.aggregate_type || 'browser_session')}</span>
              <span>🔑 <b>ID:</b> ${escapeHtml(event.aggregate_id || '—')}</span>
              <span>🌐 <b>IP:</b> ${escapeHtml(event.ip_address || '—')}</span>
            </div>
            <div class="al-detail" style="display:none">
              <pre style="margin:0;padding:10px;border-radius:8px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border);font-size:10px;line-height:1.45;white-space:pre-wrap;word-break:break-word">${contextText}</pre>
            </div>
          </div>`;
        }).join('')}
    </div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml);
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: DEPARTMENTS & TITLES
// ═══════════════════════════════════════════════════
function renderAdminDeptTitle(){
  const panel = document.getElementById('admin-content');
  if(!panel) return;
  panel.innerHTML='';
  if(!ADMIN_AUTH_STATE.org.loaded){
    if(!ADMIN_AUTH_STATE.org.loading && !ADMIN_AUTH_STATE.org.error){
      loadAuthoritativeOrgCatalog({silent:true});
    }
    if((DEPARTMENTS && DEPARTMENTS.length) || (DEPT_TITLES && Object.keys(DEPT_TITLES).length)){
      renderAdminDeptTitleFallback();
      return;
    }
    panel.innerHTML = authoritativeLoadSummaryHtml('org');
    return;
  }

  const filters = adminFilterState('dept_title');
  const orgUnits = (ADMIN_AUTH_STATE.org.orgUnits || []).slice().sort((a,b)=>{
    const typeCmp = orgUnitTypeWeight(String(a.org_unit_type||'')) - orgUnitTypeWeight(String(b.org_unit_type||''));
    if(typeCmp !== 0) return typeCmp;
    return String(a.org_unit_code||'').localeCompare(String(b.org_unit_code||''));
  });
  const positions = (ADMIN_AUTH_STATE.org.positions || []).slice();
  const positionsByUnit = {};
  const usersByDeptTitle = {};
  USERS.forEach(u=>{
    const dept = String(u.dept||'');
    const title = String(u.title||'');
    const key = `${dept}__${title}`;
    usersByDeptTitle[key] = (usersByDeptTitle[key] || 0) + 1;
  });
  positions.forEach(position=>{
    const unitId = String(position.hcm_org_unit_id || '');
    if(!positionsByUnit[unitId]) positionsByUnit[unitId] = [];
    positionsByUnit[unitId].push(position);
  });
  Object.keys(positionsByUnit).forEach(unitId=>{
    positionsByUnit[unitId].sort((a,b)=>String(a.position_title||'').localeCompare(String(b.position_title||'')));
  });

  const totalPositions = positions.length;
  const activeUnits = orgUnits.filter(unit => String(unit.status || 'active') !== 'inactive').length;
  const activePositions = positions.filter(position => String(position.status || 'active') !== 'inactive').length;
  const filteredUnits = orgUnits.filter(unit=>{
    const active = String(unit.status || 'active') !== 'inactive';
    if(filters.status === 'active' && !active) return false;
    if(filters.status === 'inactive' && active) return false;
    const unitPositions = positionsByUnit[String(unit.hcm_org_unit_id || '')] || [];
    return adminContainsNeedle(filters.search, [
      unit.org_unit_code,
      unit.org_unit_name,
      unit.org_unit_type,
      ...unitPositions.map(position=>position.position_title),
      ...unitPositions.map(position=>position.position_code)
    ]);
  });

  const cards = filteredUnits.map(unit=>{
    const deptColor = defaultDepartmentColor(unit.org_unit_code);
    const unitPositions = positionsByUnit[String(unit.hcm_org_unit_id || '')] || [];
    const assignedUsers = USERS.filter(u=>String(u.dept||'') === String(unit.org_unit_code||'')).length;
    const active = String(unit.status || 'active') !== 'inactive';
    return `<article class="admin-authority-card" style="border-color:color-mix(in srgb, ${deptColor} 24%, var(--border))">
      <div class="admin-authority-card-head">
        <div>
          <div style="font-weight:800;color:${escapeHtml(deptColor)}">${escapeHtml(String(unit.org_unit_code || ''))}</div>
          <div style="font-size:16px;font-weight:800;margin-top:4px">${escapeHtml(String(unit.org_unit_name || unit.org_unit_code || ''))}</div>
          <div class="muted" style="margin-top:4px;font-size:11px">${escapeHtml(String(unit.org_unit_type || 'department'))} • ${unitPositions.length} vị trí • ${assignedUsers} user portal</div>
        </div>
        <div class="admin-authority-chip-row">
          <span class="admin-inline-badge ${active ? 'is-active' : 'is-inactive'}">${active ? 'active' : 'inactive'}</span>
          <button class="btn-admin secondary sm" onclick="promptCreateAuthoritativePosition('${escapeHtml(String(unit.hcm_org_unit_id || ''))}')">Thêm vị trí</button>
          <button class="btn-admin secondary sm" onclick="promptEditAuthoritativeOrgUnit('${escapeHtml(String(unit.hcm_org_unit_id || ''))}')">Sửa</button>
          <button class="btn-admin secondary sm" onclick="setAuthoritativeOrgUnitActive('${escapeHtml(String(unit.hcm_org_unit_id || ''))}', ${active ? 'false' : 'true'})">${active ? 'Ngừng dùng' : 'Kích hoạt'}</button>
        </div>
      </div>
      <div class="admin-pill-cloud" style="margin-top:12px">
        ${unitPositions.length ? unitPositions.map(position=>{
          const activePosition = String(position.status || 'active') !== 'inactive';
          const count = usersByDeptTitle[`${unit.org_unit_code}__${position.position_title}`] || 0;
          return `<div class="admin-position-chip ${activePosition ? '' : 'is-inactive'}">
            <div>
              <div style="font-weight:700">${escapeHtml(String(position.position_title || ''))}</div>
              <div class="muted" style="font-size:10px;margin-top:2px">${escapeHtml(String(position.position_code || 'NO-CODE'))} • HC ${escapeHtml(String(position.required_headcount || 1))} • ${escapeHtml(String(position.employment_type || 'full_time'))}</div>
            </div>
            <div class="admin-authority-chip-row">
              <span class="admin-inline-badge">${count} user</span>
              <button class="btn-admin secondary sm" onclick="promptEditAuthoritativePosition('${escapeHtml(String(position.hcm_position_id || ''))}')">Sửa</button>
              <button class="btn-admin secondary sm" onclick="setAuthoritativePositionActive('${escapeHtml(String(position.hcm_position_id || ''))}', ${activePosition ? 'false' : 'true'})">${activePosition ? 'Ngừng dùng' : 'Kích hoạt'}</button>
            </div>
          </div>`;
        }).join('') : `<div class="hm-empty" style="margin:0">Chưa có vị trí trong đơn vị này.</div>`}
      </div>
    </article>`;
  }).join('');

  const headHtml = `
    <section class="admin-authority-section">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:12px;flex-wrap:wrap">
        <div>
          <h3 style="font-size:16px;font-weight:800;margin:0">Cơ cấu tổ chức & vị trí công việc</h3>
          <div class="muted" style="margin-top:4px">Nguồn authoritative của tab này là HCM runtime: <code>hcm_org_units</code> và <code>hcm_positions</code>. Mọi thay đổi được ghi trực tiếp vào hệ thống.</div>
        </div>
        <div class="muted" style="font-size:12px">${activeUnits}/${orgUnits.length} đơn vị hoạt động • ${activePositions}/${totalPositions} vị trí hoạt động</div>
      </div>
      <div class="admin-toolbar" style="margin-top:14px">
        <input type="search" placeholder="Tìm đơn vị, mã vị trí, chức danh..." value="${escapeHtml(filters.search || '')}" oninput="setAdminFilter('dept_title','search',this.value)">
        <select onchange="setAdminFilter('dept_title','status',this.value)">
          <option value="all"${filters.status === 'all' ? ' selected' : ''}>Tất cả trạng thái</option>
          <option value="active"${filters.status === 'active' ? ' selected' : ''}>Đang hoạt động</option>
          <option value="inactive"${filters.status === 'inactive' ? ' selected' : ''}>Ngừng dùng</option>
        </select>
        <button class="btn-admin secondary" onclick="resetAdminFilters('dept_title')">↺ Reset filter</button>
        <button class="btn-admin secondary" onclick="loadAuthoritativeOrgCatalog({force:true})">🔄 Làm mới</button>
        <button class="btn-admin primary" onclick="promptCreateAuthoritativeOrgUnit()">＋ Thêm đơn vị</button>
        <button class="btn-admin secondary" onclick="(function(){const code=(prompt('Nhập mã đơn vị để thêm vị trí:','')||'').trim().toUpperCase();if(!code)return;const unit=(ADMIN_AUTH_STATE.org.orgUnits||[]).find(x=>String(x.org_unit_code||'').toUpperCase()===code);if(!unit){showToast('⚠ Không tìm thấy đơn vị','error');return;}promptCreateAuthoritativePosition(unit.hcm_org_unit_id);})();">＋ Thêm vị trí</button>
      </div>
    </section>`;
  const bodyHtml = `<div class="admin-authority-grid">
    ${cards || `<div class="hm-empty">Không có đơn vị nào khớp bộ lọc hiện tại.</div>`}
  </div>`;
  panel.innerHTML = adminScopedLayout(headHtml, bodyHtml);
}

async function promptCreateAuthoritativeOrgUnit(){
  const code = (prompt('Mã đơn vị tổ chức (ví dụ QA, PRO, ENG):','') || '').trim().toUpperCase();
  if(!code) return;
  const name = (prompt('Tên đơn vị:','') || '').trim();
  if(!name) return;
  const typeRaw = (prompt('Loại đơn vị: company / division / department / section / team','department') || '').trim().toLowerCase();
  const orgUnitType = ['company','division','department','section','team'].includes(typeRaw) ? typeRaw : 'department';
  const parentCode = (prompt('Mã đơn vị cha (để trống nếu là cấp gốc):','') || '').trim().toUpperCase();
  const parentUnit = parentCode
    ? (ADMIN_AUTH_STATE.org.orgUnits || []).find(unit => String(unit.org_unit_code||'').toUpperCase() === parentCode)
    : null;
  const res = await runtimeCreate('hcm_workforce', 'hcm_org_units', {
    org_unit_code: code,
    org_unit_name: name,
    org_unit_type: orgUnitType,
    parent_org_unit_id: parentUnit ? parentUnit.hcm_org_unit_id : null,
    status: 'active',
    metadata: {color: defaultDepartmentColor(code)}
  });
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Create org unit failed':'Tạo đơn vị thất bại'), 'error');
    return;
  }
  showToast('✅ Đã tạo đơn vị tổ chức');
  await loadAuthoritativeOrgCatalog({force:true});
}

async function promptEditAuthoritativeOrgUnit(orgUnitId){
  const unit = (ADMIN_AUTH_STATE.org.orgUnits || []).find(item => String(item.hcm_org_unit_id||'') === String(orgUnitId||''));
  if(!unit) return;
  const nextName = (prompt(`Tên mới cho ${unit.org_unit_code}:`, unit.org_unit_name || '') || '').trim();
  if(!nextName) return;
  const nextTypeRaw = (prompt('Loại đơn vị: company / division / department / section / team', unit.org_unit_type || 'department') || '').trim().toLowerCase();
  const nextType = ['company','division','department','section','team'].includes(nextTypeRaw) ? nextTypeRaw : (unit.org_unit_type || 'department');
  const nextParentCode = (prompt('Mã đơn vị cha mới (để trống nếu giữ/cấp gốc):', (() => {
    const parent = (ADMIN_AUTH_STATE.org.orgUnits || []).find(item => String(item.hcm_org_unit_id||'') === String(unit.parent_org_unit_id||''));
    return parent ? parent.org_unit_code : '';
  })()) || '').trim().toUpperCase();
  const nextParent = nextParentCode
    ? (ADMIN_AUTH_STATE.org.orgUnits || []).find(item => String(item.org_unit_code||'').toUpperCase() === nextParentCode)
    : null;
  const metadata = Object.assign({}, safeJsonObject(unit.metadata), {color: defaultDepartmentColor(unit.org_unit_code)});
  const res = await runtimeUpdate('hcm_workforce', 'hcm_org_units', unit.hcm_org_unit_id, {
    org_unit_name: nextName,
    org_unit_type: nextType,
    parent_org_unit_id: nextParent ? nextParent.hcm_org_unit_id : null,
    metadata
  }, unit.row_version || null);
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Update org unit failed':'Cập nhật đơn vị thất bại'), 'error');
    return;
  }
  showToast('✅ Đã cập nhật đơn vị tổ chức');
  await loadAuthoritativeOrgCatalog({force:true});
}

async function setAuthoritativeOrgUnitActive(orgUnitId, active){
  const unit = (ADMIN_AUTH_STATE.org.orgUnits || []).find(item => String(item.hcm_org_unit_id||'') === String(orgUnitId||''));
  if(!unit) return;
  const confirmed = confirm(active ? `Kích hoạt lại đơn vị ${unit.org_unit_code}?` : `Ngừng sử dụng đơn vị ${unit.org_unit_code}?`);
  if(!confirmed) return;
  const res = await runtimeUpdate('hcm_workforce', 'hcm_org_units', unit.hcm_org_unit_id, {
    status: active ? 'active' : 'inactive',
    metadata: Object.assign({}, safeJsonObject(unit.metadata), {color: defaultDepartmentColor(unit.org_unit_code)})
  }, unit.row_version || null);
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Org unit status update failed':'Cập nhật trạng thái đơn vị thất bại'), 'error');
    return;
  }
  showToast(active ? '✅ Đã kích hoạt lại đơn vị' : '✅ Đã ngừng dùng đơn vị');
  await loadAuthoritativeOrgCatalog({force:true});
}

async function promptCreateAuthoritativePosition(orgUnitId){
  const unit = (ADMIN_AUTH_STATE.org.orgUnits || []).find(item => String(item.hcm_org_unit_id||'') === String(orgUnitId||''));
  if(!unit) return;
  const code = (prompt(`Mã vị trí cho ${unit.org_unit_code}:`,'') || '').trim().toUpperCase();
  if(!code) return;
  const title = (prompt('Tên vị trí:','') || '').trim();
  if(!title) return;
  const headcountRaw = (prompt('Headcount yêu cầu:', '1') || '').trim();
  const headcount = Math.max(1, Number(headcountRaw) || 1);
  const employmentTypeRaw = (prompt('Loại việc làm: full_time / part_time / contractor / intern','full_time') || '').trim().toLowerCase();
  const employmentType = ['full_time','part_time','contractor','intern'].includes(employmentTypeRaw) ? employmentTypeRaw : 'full_time';
  const reportsToCode = (prompt('Mã vị trí báo cáo lên (để trống nếu không có):','') || '').trim().toUpperCase();
  const reportsTo = reportsToCode
    ? (ADMIN_AUTH_STATE.org.positions || []).find(position => String(position.position_code||'').toUpperCase() === reportsToCode)
    : null;
  const res = await runtimeCreate('hcm_workforce', 'hcm_positions', {
    position_code: code,
    position_title: title,
    hcm_org_unit_id: unit.hcm_org_unit_id,
    required_headcount: headcount,
    employment_type: employmentType,
    reports_to_position_id: reportsTo ? reportsTo.hcm_position_id : null,
    status: 'active'
  });
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Create position failed':'Tạo vị trí thất bại'), 'error');
    return;
  }
  showToast('✅ Đã tạo vị trí');
  await loadAuthoritativeOrgCatalog({force:true});
}

async function promptEditAuthoritativePosition(positionId){
  const position = (ADMIN_AUTH_STATE.org.positions || []).find(item => String(item.hcm_position_id||'') === String(positionId||''));
  if(!position) return;
  const nextTitle = (prompt('Tên vị trí:', position.position_title || '') || '').trim();
  if(!nextTitle) return;
  const headcountRaw = (prompt('Headcount yêu cầu:', String(position.required_headcount || 1)) || '').trim();
  const nextHeadcount = Math.max(1, Number(headcountRaw) || Number(position.required_headcount || 1) || 1);
  const nextEmploymentTypeRaw = (prompt('Loại việc làm: full_time / part_time / contractor / intern', position.employment_type || 'full_time') || '').trim().toLowerCase();
  const nextEmploymentType = ['full_time','part_time','contractor','intern'].includes(nextEmploymentTypeRaw) ? nextEmploymentTypeRaw : (position.employment_type || 'full_time');
  const nextReportsToCode = (prompt('Mã vị trí báo cáo lên:', (() => {
    const parent = (ADMIN_AUTH_STATE.org.positions || []).find(item => String(item.hcm_position_id||'') === String(position.reports_to_position_id||''));
    return parent ? parent.position_code : '';
  })()) || '').trim().toUpperCase();
  const nextReportsTo = nextReportsToCode
    ? (ADMIN_AUTH_STATE.org.positions || []).find(item => String(item.position_code||'').toUpperCase() === nextReportsToCode)
    : null;
  const res = await runtimeUpdate('hcm_workforce', 'hcm_positions', position.hcm_position_id, {
    position_title: nextTitle,
    required_headcount: nextHeadcount,
    employment_type: nextEmploymentType,
    reports_to_position_id: nextReportsTo ? nextReportsTo.hcm_position_id : null
  }, position.row_version || null);
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Update position failed':'Cập nhật vị trí thất bại'), 'error');
    return;
  }
  showToast('✅ Đã cập nhật vị trí');
  await loadAuthoritativeOrgCatalog({force:true});
}

async function setAuthoritativePositionActive(positionId, active){
  const position = (ADMIN_AUTH_STATE.org.positions || []).find(item => String(item.hcm_position_id||'') === String(positionId||''));
  if(!position) return;
  const confirmed = confirm(active ? `Kích hoạt lại vị trí ${position.position_code}?` : `Ngừng sử dụng vị trí ${position.position_code}?`);
  if(!confirmed) return;
  const res = await runtimeUpdate('hcm_workforce', 'hcm_positions', position.hcm_position_id, {
    status: active ? 'active' : 'inactive'
  }, position.row_version || null);
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Position status update failed':'Cập nhật trạng thái vị trí thất bại'), 'error');
    return;
  }
  showToast(active ? '✅ Đã kích hoạt lại vị trí' : '✅ Đã ngừng dùng vị trí');
  await loadAuthoritativeOrgCatalog({force:true});
}

function addDept(){
  const code = (document.getElementById('new-dept-code').value||'').trim().toUpperCase();
  const label = (document.getElementById('new-dept-label').value||'').trim();
  const color = document.getElementById('new-dept-color').value||'#1565c0';
  if(!code||!label){showToast('⚠ Nhập mã và tên phòng ban');return;}
  if(DEPARTMENTS.find(d=>d.code===code)){showToast('⚠ Mã đã tồn tại');return;}
  DEPARTMENTS.push({code, label, labelEn:label, color});
  saveDepartments();
  showToast('✅ Đã thêm phòng ban '+code);
  renderAdminDeptTitle();
}

function editDept(idx){
  const d = DEPARTMENTS[idx];
  if(!d) return;
  const newLabel = prompt((lang==='en'?'Edit name for ':'Sửa tên cho ')+d.code+':', lang==='en'?d.labelEn:d.label);
  if(newLabel !== null && newLabel.trim()){
    d.label = newLabel.trim();
    d.labelEn = newLabel.trim();
    saveDepartments();
    renderAdminDeptTitle();
  }
}

function deleteDept(idx){
  const d = DEPARTMENTS[idx];
  if(!d) return;
  const usersInDept = USERS.filter(u=>u.dept===d.code).length;
  if(usersInDept > 0){
    showToast('⚠ '+d.code+' '+(lang==='en'?'has':'có')+' '+usersInDept+' '+(lang==='en'?'users — reassign first':'người dùng — hãy chuyển trước'));
    return;
  }
  if(!confirm((lang==='en'?'Delete department ':'Xóa phòng ban ')+d.code+'?')) return;
  DEPARTMENTS.splice(idx,1);
  saveDepartments();
  showToast('✅ Đã xóa');
  renderAdminDeptTitle();
}

function addTitle(){
  const name = (document.getElementById('new-title-name').value||'').trim();
  if(!name){showToast('⚠ Nhập chức danh');return;}
  if(TITLES.includes(name)){showToast('⚠ Đã tồn tại');return;}
  TITLES.push(name);
  saveTitles();
  showToast('✅ Đã thêm: '+name);
  renderAdminDeptTitle();
}

function editTitle(idx){
  const old = TITLES[idx];
  const newName = prompt((lang==='en'?'Edit title':'Sửa chức danh')+':', old);
  if(newName !== null && newName.trim() && newName.trim() !== old){
    TITLES[idx] = newName.trim();
    saveTitles();
    renderAdminDeptTitle();
  }
}

function deleteTitle(idx){
  const t = TITLES[idx];
  if(!confirm((lang==='en'?'Delete title: ':'Xóa chức danh: ')+t+'?')) return;
  TITLES.splice(idx,1);
  saveTitles();
  renderAdminDeptTitle();
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: ORG CHART
// ═══════════════════════════════════════════════════
function renderAdminOrgChart(){
  const el = document.getElementById('admin-content');
  if(!ADMIN_AUTH_STATE.org.loaded){
    if(!ADMIN_AUTH_STATE.org.loading && !ADMIN_AUTH_STATE.org.error){
      loadAuthoritativeOrgCatalog({silent:true});
    }
    if((DEPARTMENTS && DEPARTMENTS.length) || USERS.length){
      renderAdminOrgChartFallback();
      return;
    }
    el.innerHTML = authoritativeLoadSummaryHtml('org');
    return;
  }

  const orgUnits = (ADMIN_AUTH_STATE.org.orgUnits || []).slice().sort((a,b)=>{
    const typeCmp = orgUnitTypeWeight(String(a.org_unit_type||'')) - orgUnitTypeWeight(String(b.org_unit_type||''));
    if(typeCmp !== 0) return typeCmp;
    return String(a.org_unit_code||'').localeCompare(String(b.org_unit_code||''));
  });
  const positions = (ADMIN_AUTH_STATE.org.positions || []).slice();
  const hcmEmployees = (ADMIN_AUTH_STATE.org.employees || []).slice();
  const filters = adminFilterState('orgchart');
  const childrenByParent = {};
  const positionsByUnit = {};
  const employeesByPosition = {};
  const employeesByEmployeeId = {};
  const portalUsersByPosition = {};
  const portalUsersByUnit = {};
  const portalUsersByEmployeeId = {};
  const unitById = {};

  orgUnits.forEach(unit=>{
    const parentId = String(unit.parent_org_unit_id || '');
    if(!childrenByParent[parentId]) childrenByParent[parentId] = [];
    childrenByParent[parentId].push(unit);
    unitById[String(unit.hcm_org_unit_id || '')] = unit;
  });
  positions.forEach(position=>{
    const unitId = String(position.hcm_org_unit_id || '');
    if(!positionsByUnit[unitId]) positionsByUnit[unitId] = [];
    positionsByUnit[unitId].push(position);
  });
  hcmEmployees.forEach(employee=>{
    const employeeId = String(employee.employee_id || '').trim();
    if(employeeId) employeesByEmployeeId[employeeId] = employee;
    const positionId = String(employee.hcm_position_id || '');
    if(!employeesByPosition[positionId]) employeesByPosition[positionId] = [];
    employeesByPosition[positionId].push(employee);
  });
  USERS.filter(u=>u.active!==false).forEach(user=>{
    const resolved = resolveAuthoritativeUserAssignment({
      dept: user.dept,
      title: user.title,
      hcm_org_unit_id: user.hcm_org_unit_id,
      hcm_position_id: user.hcm_position_id
    });
    const unitId = String(resolved.orgUnitId || user.hcm_org_unit_id || '');
    const positionId = String(resolved.positionId || user.hcm_position_id || '');
    const employeeId = String(user.employee_id || '').trim();
    if(employeeId){
      if(!portalUsersByEmployeeId[employeeId]) portalUsersByEmployeeId[employeeId] = [];
      portalUsersByEmployeeId[employeeId].push(user);
    }
    if(unitId){
      if(!portalUsersByUnit[unitId]) portalUsersByUnit[unitId] = [];
      portalUsersByUnit[unitId].push(user);
    }
    if(positionId){
      if(!portalUsersByPosition[positionId]) portalUsersByPosition[positionId] = [];
      portalUsersByPosition[positionId].push(user);
    }
  });

  const unitMatchesFilter = {};
  function employeeDisplayLabel(employee, linkedUsers){
    const employeeMeta = safeJsonObject(employee && employee.metadata);
    const userList = Array.isArray(linkedUsers) ? linkedUsers : [];
    const preferredUser = userList.find(user=>String(user.name || '').trim()) || userList[0] || null;
    const baseLabel = String(
      (preferredUser && preferredUser.name)
      || (employee && employee.employee_lookup_name)
      || (employee && employee.employee_name)
      || employeeMeta.employee_name
      || employeeMeta.full_name
      || (employee && employee.employee_id)
      || 'employee'
    ).trim();
    const username = String((preferredUser && preferredUser.username) || '').trim();
    if(baseLabel && username && baseLabel.toLowerCase() !== username.toLowerCase()){
      return `${baseLabel} @${username}`;
    }
    if(baseLabel) return baseLabel;
    return username ? `@${username}` : 'employee';
  }
  function portalUserDisplayLabel(user){
    const name = String(user.name || '').trim();
    const username = String(user.username || '').trim();
    if(name && username && name.toLowerCase() !== username.toLowerCase()){
      return `${name} @${username}`;
    }
    return name || (username ? `@${username}` : 'portal user');
  }
  function managerDisplayLabel(employeeId){
    const normalizedEmployeeId = String(employeeId || '').trim();
    if(!normalizedEmployeeId) return '—';
    const linkedUsers = portalUsersByEmployeeId[normalizedEmployeeId] || [];
    const employee = employeesByEmployeeId[normalizedEmployeeId] || {employee_id: normalizedEmployeeId};
    const label = employeeDisplayLabel(employee, linkedUsers);
    if(!label || label === normalizedEmployeeId) return normalizedEmployeeId;
    return `${label} (${normalizedEmployeeId})`;
  }
  function positionPeople(positionId){
    const assignedEmployees = employeesByPosition[positionId] || [];
    const portalUsers = portalUsersByPosition[positionId] || [];
    const linkedPortalUsernames = new Set();
    const assignedEmployeeIds = new Set(
      assignedEmployees
        .map(employee => String(employee.employee_id || '').trim())
        .filter(Boolean)
    );
    const people = [];

    assignedEmployees.forEach((employee, index)=>{
      const employeeId = String(employee.employee_id || '').trim();
      const linkedUsers = employeeId
        ? portalUsers.filter(user => String(user.employee_id || '').trim() === employeeId)
        : [];
      linkedUsers.forEach(user=>{
        const usernameKey = String(user.username || '').trim().toLowerCase();
        if(usernameKey) linkedPortalUsernames.add(usernameKey);
      });
      const fallbackUsers = employeeId ? (portalUsersByEmployeeId[employeeId] || []) : [];
      people.push({
        key: `employee:${employeeId || index}`,
        label: employeeDisplayLabel(employee, linkedUsers.length ? linkedUsers : fallbackUsers),
        tone: 'is-active',
        title: [employeeId, ...linkedUsers.map(user=>`@${String(user.username || '').trim()}`).filter(Boolean)].join(' · ')
      });
    });

    portalUsers.forEach((user, index)=>{
      const username = String(user.username || '').trim();
      const usernameKey = username.toLowerCase();
      const employeeId = String(user.employee_id || '').trim();
      if(usernameKey && linkedPortalUsernames.has(usernameKey)) return;
      if(employeeId && assignedEmployeeIds.has(employeeId)) return;
      people.push({
        key: `portal:${usernameKey || employeeId || index}`,
        label: portalUserDisplayLabel(user),
        tone: '',
        title: [username ? `@${username}` : '', employeeId].filter(Boolean).join(' · ')
      });
    });

    return people;
  }
  function matchesUnitSearch(unit){
    const unitId = String(unit.hcm_org_unit_id || '');
    const unitPositions = positionsByUnit[unitId] || [];
    const deptUsers = portalUsersByUnit[unitId] || [];
    return adminContainsNeedle(filters.search, [
      unit.org_unit_code,
      unit.org_unit_name,
      unit.org_unit_type,
      unit.manager_employee_id,
      ...unitPositions.map(position=>position.position_title),
      ...unitPositions.map(position=>position.position_code),
      ...unitPositions.map(position=>position.reports_to_position_title),
      ...unitPositions.flatMap(position=>{
        const positionId = String(position.hcm_position_id || '');
        return (employeesByPosition[positionId] || []).map(employee=>{
          const employeeId = String(employee.employee_id || '').trim();
          return employeeDisplayLabel(employee, employeeId ? (portalUsersByEmployeeId[employeeId] || []) : []);
        });
      }),
      ...deptUsers.map(user=>user.name),
      ...deptUsers.map(user=>user.username)
    ]);
  }
  function isUnitVisible(unitId){
    if(Object.prototype.hasOwnProperty.call(unitMatchesFilter, unitId)){
      return unitMatchesFilter[unitId];
    }
    const unit = unitById[unitId];
    if(!unit){
      unitMatchesFilter[unitId] = false;
      return false;
    }
    const active = String(unit.status || 'active') !== 'inactive';
    const statusMatch = filters.status === 'all'
      ? true
      : (filters.status === 'active' ? active : !active);
    const childVisible = (childrenByParent[unitId] || []).some(child => isUnitVisible(String(child.hcm_org_unit_id || '')));
    const selfVisible = statusMatch && matchesUnitSearch(unit);
    unitMatchesFilter[unitId] = selfVisible || childVisible;
    return unitMatchesFilter[unitId];
  }

  function renderPositionCard(position){
    const positionId = String(position.hcm_position_id || '');
    const activePosition = String(position.status || 'active') !== 'inactive';
    const assignedEmployees = employeesByPosition[positionId] || [];
    const portalUsers = portalUsersByPosition[positionId] || [];
    const people = positionPeople(positionId);
    const badges = [
      `<span class="admin-inline-badge ${activePosition ? 'is-active' : 'is-inactive'}">${activePosition ? 'active' : 'inactive'}</span>`,
      `<span class="admin-inline-badge">HC ${escapeHtml(String(position.required_headcount || 1))}</span>`,
      `<span class="admin-inline-badge">HCM ${assignedEmployees.length}</span>`,
      `<span class="admin-inline-badge">Portal ${portalUsers.length}</span>`,
      people.length !== (assignedEmployees.length + portalUsers.length) ? `<span class="admin-inline-badge">People ${people.length}</span>` : ''
    ].filter(Boolean).join('');
    const personCloud = people.map(person=>`<span class="admin-inline-badge ${person.tone}"${person.title ? ` title="${escapeHtml(person.title)}"` : ''}>${escapeHtml(person.label)}</span>`).join('');

    return `<article class="admin-org-position ${activePosition ? '' : 'is-inactive'}">
      <div class="admin-org-position-head">
        <div>
          <div class="admin-org-position-title">${escapeHtml(String(position.position_title || ''))}</div>
          <div class="admin-org-position-meta">${escapeHtml(String(position.position_code || ''))} • reports-to ${escapeHtml(String(position.reports_to_position_title || '—'))}</div>
        </div>
        <div class="admin-authority-chip-row">${badges}</div>
      </div>
      ${personCloud
        ? `<div class="admin-authority-chip-row" style="margin-top:8px">${personCloud}</div>`
        : `<div class="muted" style="margin-top:8px;font-size:11px">Chưa có gán nhân sự cho vị trí này.</div>`}
    </article>`;
  }

  function renderOrgUnitNode(unit, depth){
    const color = defaultDepartmentColor(unit.org_unit_code);
    const unitId = String(unit.hcm_org_unit_id || '');
    const unitPositions = (positionsByUnit[unitId] || []).slice().sort((a,b)=>String(a.position_title||'').localeCompare(String(b.position_title||'')));
    const childUnits = (childrenByParent[unitId] || [])
      .filter(child => isUnitVisible(String(child.hcm_org_unit_id || '')))
      .slice()
      .sort((a,b)=>String(a.org_unit_code||'').localeCompare(String(b.org_unit_code||'')));
    const active = String(unit.status || 'active') !== 'inactive';
    const unitUsers = portalUsersByUnit[unitId] || [];
    const positionHtml = unitPositions.map(position => renderPositionCard(position)).join('');
    const childHtml = childUnits.map(child => renderOrgUnitNode(child, depth + 1)).join('');
    return `
      <section class="admin-org-node" style="--org-accent:${color};--org-indent:${depth * 24}px">
        <div class="admin-org-node-shell${active ? '' : ' is-inactive'}">
          <div class="admin-org-node-head">
            <div>
              <div class="admin-org-node-title">
                <span class="admin-org-node-code">${escapeHtml(String(unit.org_unit_code||''))}</span>
                <span class="admin-org-node-name">${escapeHtml(String(unit.org_unit_name||''))}</span>
                <span class="admin-org-node-kind">${escapeHtml(String(unit.org_unit_type||'department'))}</span>
              </div>
              <div class="admin-org-node-summary">${unitPositions.length} vị trí • ${unitUsers.length} user portal • ${childUnits.length} đơn vị con</div>
            </div>
            <div class="admin-org-node-manager">Manager employee: <b>${escapeHtml(managerDisplayLabel(unit.manager_employee_id))}</b></div>
          </div>
          <div class="admin-org-node-body">
            ${positionHtml || '<div class="admin-org-placeholder">Đơn vị này chưa có vị trí nào trong HCM runtime.</div>'}
          </div>
        </div>
        ${childHtml ? `<div class="admin-org-node-children">${childHtml}</div>` : ''}
      </section>
    `;
  }

  const roots = (childrenByParent[''] || []).length ? (childrenByParent[''] || []) : orgUnits.filter(unit => !unit.parent_org_unit_id);
  const visibleRoots = roots.filter(root => isUnitVisible(String(root.hcm_org_unit_id || '')));
  const html = visibleRoots.map(root => renderOrgUnitNode(root, 0)).join('');

  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:8px;flex-wrap:wrap">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">🏗 ${lang==='en'?'Organization chart':'Sơ đồ tổ chức authoritative'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${lang==='en'
          ?'Authoritative projection from HCM org units, positions and mapped portal users.'
          :'Projection authoritative từ HCM org units, positions và user portal đã map.'}</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn-admin secondary" onclick="loadAuthoritativeOrgCatalog({force:true})">🔄 ${lang==='en'?'Refresh':'Làm mới'}</button>
        <button class="btn-admin secondary" onclick="window.print()">🖨 ${lang==='en'?'Print':'In'}</button>
      </div>
    </div>
    <div class="admin-toolbar">
      <input type="search" placeholder="Tìm đơn vị, vị trí, nhân sự portal..." value="${escapeHtml(filters.search || '')}" oninput="setAdminFilter('orgchart','search',this.value)">
      <select onchange="setAdminFilter('orgchart','status',this.value)">
        <option value="all"${filters.status === 'all' ? ' selected' : ''}>Tất cả trạng thái</option>
        <option value="active"${filters.status === 'active' ? ' selected' : ''}>Đang hoạt động</option>
        <option value="inactive"${filters.status === 'inactive' ? ' selected' : ''}>Ngừng dùng</option>
      </select>
      <button class="btn-admin secondary" onclick="resetAdminFilters('orgchart')">↺ Reset filter</button>
    </div>
    <div class="admin-authority-meta-strip">
      <span>${visibleRoots.length} / ${roots.length} cây gốc hiển thị</span>
      <span>${orgUnits.length} org unit • ${positions.length} position • ${hcmEmployees.length} HCM employee</span>
    </div>`;
  const bodyHtml = `<div class="admin-org-tree">
    ${html || '<div class="hm-empty">Không có org unit nào khớp bộ lọc hiện tại.</div>'}
  </div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml);
}

function exportOrgChartSVG(){
  showToast(lang==='en'?'💡 Use Print (Ctrl+P) to save as PDF':'💡 Dùng In (Ctrl+P) để lưu PDF');
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: ACTIVITY LOG (User Behavior)
// ═══════════════════════════════════════════════════
function renderAdminActivity(){
  const el = document.getElementById('admin-content');
  if(!canViewActivityLog()){
    el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-3)">⛔ '+(lang==='en'?'You do not have permission to view this tab. Contact the General Manager (EXE-01).':'Bạn không có quyền xem tab này. Liên hệ General Manager (EXE-01).')+'</div>';
    return;
  }

  if(!ADMIN_AUTH_STATE.audit.loaded){
    if(!ADMIN_AUTH_STATE.audit.loading && !ADMIN_AUTH_STATE.audit.error){
      loadAuthoritativeAuditTrail({silent:true});
    }
    renderAdminActivityFallback();
    return;
  }

  const auditEvents = (ADMIN_AUTH_STATE.audit.events || []).slice().sort((a,b)=>String(b.recorded_at||'').localeCompare(String(a.recorded_at||'')));
  const filters = adminFilterState('activity');
  const uniqueUsers = [...new Set(auditEvents.map(item => item.actor_name).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const uniqueEventTypes = [...new Set(auditEvents.map(item => item.event_type).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const uniqueAggregates = [...new Set(auditEvents.map(item => item.aggregate_type).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const filteredEvents = auditEvents.filter(event=>{
    if(filters.actor && String(event.actor_name || '') !== String(filters.actor)) return false;
    if(filters.eventType && String(event.event_type || '') !== String(filters.eventType)) return false;
    if(filters.aggregateType && String(event.aggregate_type || '') !== String(filters.aggregateType)) return false;
    return adminContainsNeedle(filters.search, [
      event.actor_name,
      event.event_type,
      event.aggregate_type,
      event.aggregate_id,
      event.ip_address,
      JSON.stringify(event.payload || {}),
      JSON.stringify(event.metadata || {})
    ]);
  });

  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:8px">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">📊 ${lang==='en'?'Administrative audit trail':'Kiểm soát hành vi & audit trail'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${filteredEvents.length} / ${auditEvents.length} event hiển thị</div>
      </div>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="btn-admin secondary" onclick="document.getElementById('ds-panel').style.display=document.getElementById('ds-panel').style.display==='none'?'':'none'">⚙️ ${lang==='en'?'Settings':'Cài đặt'}</button>
        <button class="btn-admin secondary" onclick="loadAuthoritativeAuditTrail({force:true})">🔄 ${lang==='en'?'Refresh':'Làm mới'}</button>
        <button class="btn-admin secondary" onclick="resetAdminFilters('activity')">↺ Reset filter</button>
        <button class="btn-admin secondary" onclick="exportActivityCSV()">📥 CSV</button>
      </div>
    </div>
    <div class="admin-toolbar">
      <input type="search" placeholder="Tìm actor, event, aggregate, payload..." value="${escapeHtml(filters.search || '')}" oninput="setAdminFilter('activity','search',this.value)">
      <select onchange="setAdminFilter('activity','actor',this.value)">
        <option value="">${lang==='en'?'All actors':'Tất cả actor'}</option>
        ${uniqueUsers.map(u=>`<option value="${escapeHtml(u)}"${filters.actor === u ? ' selected' : ''}>${escapeHtml(u)}</option>`).join('')}
      </select>
      <select onchange="setAdminFilter('activity','eventType',this.value)">
        <option value="">Tất cả event</option>
        ${uniqueEventTypes.map(eventType=>`<option value="${escapeHtml(eventType)}"${filters.eventType === eventType ? ' selected' : ''}>${escapeHtml(eventType)}</option>`).join('')}
      </select>
      <select onchange="setAdminFilter('activity','aggregateType',this.value)">
        <option value="">Tất cả aggregate</option>
        ${uniqueAggregates.map(aggregateType=>`<option value="${escapeHtml(aggregateType)}"${filters.aggregateType === aggregateType ? ' selected' : ''}>${escapeHtml(aggregateType)}</option>`).join('')}
      </select>
    </div>
    <div id="ds-panel" style="display:none;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg-surface,#fff)">
      <div style="padding:12px 16px;font-weight:700;font-size:13px;background:var(--bg-surface-alt,#f8fafc);border-bottom:1px solid var(--border)">⚙️ ${lang==='en'?'Data Collection Settings':'Cài đặt Thu thập Dữ liệu'}</div>
      ${(function(){
        const items=[
          {k:'collect_gps',i:'📍',v:'Tọa độ GPS',e:'GPS',dv:'Nếu tắt, người dùng không cần cho phép vị trí khi đăng nhập.',de:'If OFF, users skip location permission on login.'},
          {k:'collect_ip',i:'🌐',v:'Địa chỉ IP',e:'IP Address',dv:'Ghi nhận IP công khai.',de:'Record public IP.'},
          {k:'collect_device',i:'📱',v:'Thiết bị',e:'Device',dv:'User-Agent, OS, trình duyệt, màn hình.',de:'User-Agent, OS, browser, screen.'},
          {k:'collect_navigation',i:'📄',v:'Lịch sử trang',e:'Navigation',dv:'Ghi lại trang truy cập, thời điểm, thời lượng.',de:'Track page views with timestamps.'},
          {k:'collect_connection',i:'📶',v:'Kết nối',e:'Network',dv:'Loại kết nối, múi giờ.',de:'Connection type, timezone.'},
          {k:'require_consent',i:'📋',v:'Yêu cầu đồng ý',e:'Consent',dv:'Nếu tắt, đăng nhập không cần đồng ý điều khoản.',de:'If OFF, login skips consent dialog.'},
        ];
        const src = DATA_SETTINGS_DRAFT || DATA_SETTINGS;
        return items.map(it=>{
          const on=src[it.k];
          const lb=lang==='en'?it.e:it.v;
          const dc=lang==='en'?it.de:it.dv;
          return `<div data-ds-key="${it.k}" style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-bottom:1px solid color-mix(in srgb, var(--border) 78%, transparent)">
            <label style="position:relative;display:inline-block;width:44px;min-width:44px;height:24px;cursor:pointer">
              <input type="checkbox" ${on?"checked":""} onchange="toggleDataSetting('${it.k}',this.checked)" style="opacity:0;width:0;height:0;position:absolute">
              <span class="ds-track" style="position:absolute;top:0;left:0;right:0;bottom:0;background:${on?"var(--green)":"var(--border)"};border-radius:24px;transition:.3s"></span>
              <span class="ds-knob" style="position:absolute;height:18px;width:18px;left:${on?"22px":"3px"};bottom:3px;background:var(--bg-surface,#fff);border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
            </label>
            <div style="flex:1"><div style="font-weight:700;font-size:13px">${it.i} ${lb}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${dc}</div></div>
          </div>`;
        }).join('');
      })()}
      <div id="ds-action-bar" style="display:${DATA_SETTINGS_DRAFT?'flex':'none'};padding:10px 14px;gap:8px;justify-content:flex-end;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border-top:1px solid color-mix(in srgb, var(--amber) 28%, var(--border))">
        <button class="btn-admin secondary" onclick="cancelDataSettingsDraft()" style="padding:6px 16px;font-size:12px">↩ ${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="saveDataSettingsDraft()" style="padding:6px 16px;font-size:12px">💾 ${lang==='en'?'Save':'Lưu'}</button>
      </div>
      <div style="padding:10px 14px;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--brand-2)">💡 ${lang==='en'?'Toggle options then click Save. Changes take effect on next login.':'Bật/tắt tùy chọn rồi nhấn Lưu. Thay đổi có hiệu lực từ lần đăng nhập kế.'}</div>
    </div>
    <div style="font-size:11px;color:var(--text-3);padding:10px;background:color-mix(in srgb, var(--green) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--green) 28%, var(--border));border-radius:8px">
      🛡 <b>${lang==='en'?'Authoritative audit trail':'Audit trail authoritative'}:</b> 
      ${lang==='en'
        ?'Server-side administrative actions are sourced from the system audit layer. This tab no longer relies on browser-local telemetry for governance decisions.'
        :'Các hành động quản trị phía server được lấy từ lớp audit hệ thống. Tab này không còn dựa vào telemetry cục bộ của trình duyệt cho quyết định quản trị.'}
    </div>`;
  const bodyHtml = `<div class="activity-log-scroller">
      ${filteredEvents.length === 0
        ? '<div style="text-align:center;padding:40px;color:var(--text-3)">'+( lang==='en'?'No authoritative audit event recorded yet':'Chưa có audit event authoritative nào')+'</div>'
        : `<table class="activity-log-table">
            <thead>
              <tr>
                <th style="min-width:140px">Thời điểm</th>
                <th style="min-width:140px">Actor</th>
                <th style="min-width:150px">Event</th>
                <th style="min-width:150px">Aggregate</th>
                <th style="min-width:120px">ID</th>
                <th style="min-width:130px">IP</th>
                <th>Ngữ cảnh</th>
              </tr>
            </thead>
            <tbody>
              ${filteredEvents.map((event,idx)=>{
          const recorded = event.recorded_at ? new Date(event.recorded_at) : null;
          const dateStr = recorded && !Number.isNaN(recorded.getTime())
            ? recorded.toLocaleDateString('vi-VN') + ' ' + recorded.toLocaleTimeString('vi-VN')
            : '—';
          const detailRecord = {
            recorded_at: event.recorded_at || '',
            actor_name: event.actor_name || '',
            event_type: event.event_type || '',
            aggregate_type: event.aggregate_type || '',
            aggregate_id: event.aggregate_id || '',
            ip_address: event.ip_address || '',
            payload: (event.payload && typeof event.payload === 'object') ? event.payload : {},
            metadata: (event.metadata && typeof event.metadata === 'object') ? event.metadata : {}
          };
          const contextText = escapeHtml(JSON.stringify(detailRecord, null, 2));
          return `<tr data-user="${escapeHtml(event.actor_name || '')}" data-idx="${idx}">
                <td>${escapeHtml(dateStr)}</td>
                <td><b>${escapeHtml(event.actor_name || 'system')}</b></td>
                <td><span class="admin-inline-badge">${escapeHtml(event.event_type || 'event')}</span></td>
                <td>${escapeHtml(event.aggregate_type || 'api_action')}</td>
                <td style="font-family:var(--mono);font-size:10px">${escapeHtml(event.aggregate_id || '—')}</td>
                <td>${escapeHtml(event.ip_address || '—')}</td>
                <td>
                  <details class="activity-detail-panel">
                    <summary>Xem payload</summary>
                    <pre>${contextText}</pre>
                  </details>
                </td>
              </tr>`;
        }).join('')}
            </tbody>
          </table>`
      }
    </div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml, 'has-x-scroll');

}

function filterActivityLog(){
  renderAdminActivity();
}

function exportActivityCSV(){
  const filters = adminFilterState('activity');
  const events = (ADMIN_AUTH_STATE.audit.loaded ? (ADMIN_AUTH_STATE.audit.events || []) : legacyAuditEventsForAdmin()).filter(event=>{
    if(filters.actor && String(event.actor_name || '') !== String(filters.actor)) return false;
    if(filters.eventType && String(event.event_type || '') !== String(filters.eventType)) return false;
    if(filters.aggregateType && String(event.aggregate_type || '') !== String(filters.aggregateType)) return false;
    return adminContainsNeedle(filters.search, [
      event.actor_name,
      event.event_type,
      event.aggregate_type,
      event.aggregate_id,
      event.ip_address,
      JSON.stringify(event.payload || {}),
      JSON.stringify(event.metadata || {})
    ]);
  });
  let csv = 'Recorded At,Actor,Event Type,Aggregate Type,Aggregate ID,IP,Payload,Metadata\n';
  events.forEach(event=>{
    const payload = JSON.stringify(event.payload || {}).replace(/"/g, '\'');
    const metadata = JSON.stringify(event.metadata || {}).replace(/"/g, '\'');
    csv += `"${event.recorded_at||''}","${event.actor_name||''}","${event.event_type||''}","${event.aggregate_type||''}","${event.aggregate_id||''}","${event.ip_address||''}","${payload}","${metadata}"\n`;
  });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hesem_audit_trail_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  showToast('✅ '+(lang==='en'?'Exported':'Đã xuất'));
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: ROLES (original, kept)
// ═══════════════════════════════════════════════════
function renderAdminRoles(){
  const el=document.getElementById('admin-content');
  if(!ADMIN_AUTH_STATE.roles.loaded){
    if(!ADMIN_AUTH_STATE.roles.loading && !ADMIN_AUTH_STATE.roles.error){
      loadAuthoritativeRoleCatalog({silent:true});
    }
    if(Object.keys(ROLES || {}).length){
      renderAdminRolesFallback();
      return;
    }
    el.innerHTML = authoritativeLoadSummaryHtml('roles');
    return;
  }
  const filters = adminFilterState('roles');
  const rows = rolesForAdminGrid();
  const deptOptions = [...new Set(rows.map(row => String(row.dept_code || roleRecordUi(String(row.role_code || ''), row).dept || '')).filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b)));
  const filteredRows = rows.filter(row=>{
    const code = String(row.role_code || '');
    const ui = roleRecordUi(code, row);
    const members = USERS.filter(user => String(user.role||'') === code && user.active !== false);
    const active = row.is_active !== false;
    if(filters.dept && String(row.dept_code || ui.dept || '') !== String(filters.dept)) return false;
    if(filters.status === 'active' && !active) return false;
    if(filters.status === 'inactive' && active) return false;
    return adminContainsNeedle(filters.search, [
      code,
      ui.label,
      ui.labelEn,
      row.dept_code,
      ...members.map(user=>user.name),
      ...members.map(user=>user.username)
    ]);
  });
  const headHtml = `
    <div style="display:flex;justify-content:space-between;align-items:center;gap:8px;flex-wrap:wrap">
      <div>
        <h3 style="font-size:14px;font-weight:700;margin:0">🛡 ${lang==='en'?'Authoritative role catalog':'Catalog vai trò authoritative'}</h3>
        <div style="font-size:11px;color:var(--text-3);margin-top:4px">${lang==='en'
          ?'Role definitions are sourced from core_system.roles. Backend admin status remains immutable and is not governed by this grid.'
          :'Định nghĩa vai trò lấy từ core_system.roles. Trạng thái admin backend là bất biến và không bị chỉnh trong bảng này.'}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button class="btn-admin secondary" onclick="loadAuthoritativeRoleCatalog({force:true})">🔄 ${lang==='en'?'Refresh':'Làm mới'}</button>
        <button class="btn-admin secondary" onclick="resetAdminFilters('roles')">↺ Reset filter</button>
        <button class="btn-admin primary" onclick="promptCreateSystemRole()">＋ ${lang==='en'?'Create role':'Tạo vai trò'}</button>
      </div>
    </div>
    <div class="admin-toolbar">
      <input type="search" placeholder="Tìm vai trò, code, thành viên..." value="${escapeHtml(filters.search || '')}" oninput="setAdminFilter('roles','search',this.value)">
      <select onchange="setAdminFilter('roles','dept',this.value)">
        <option value="">Tất cả phòng ban</option>
        ${deptOptions.map(dept=>`<option value="${escapeHtml(dept)}"${filters.dept === dept ? ' selected' : ''}>${escapeHtml(dept)}</option>`).join('')}
      </select>
      <select onchange="setAdminFilter('roles','status',this.value)">
        <option value="all"${filters.status === 'all' ? ' selected' : ''}>Tất cả trạng thái</option>
        <option value="active"${filters.status === 'active' ? ' selected' : ''}>Đang hoạt động</option>
        <option value="inactive"${filters.status === 'inactive' ? ' selected' : ''}>Ngừng dùng</option>
      </select>
    </div>
    <div class="admin-authority-meta-strip">
      <span>${filteredRows.length} / ${rows.length} vai trò hiển thị</span>
      <span>${deptOptions.length} phòng ban có role authoritative</span>
    </div>`;
  const bodyHtml = `<div style="overflow-x:auto">
      <table class="admin-table">
        <thead><tr>
          <th></th>
          <th>${lang==='en'?'Role':'Vai trò'}</th>
          <th>Code</th>
          <th>Dept</th>
          <th>Level</th>
          <th>${lang==='en'?'Edit docs':'Sửa tài liệu'}</th>
          <th>${lang==='en'?'Create docs':'Tạo tài liệu'}</th>
          <th>${lang==='en'?'Approve':'Duyệt'}</th>
          <th>${lang==='en'?'Activity':'Hành vi'}</th>
          <th>Excel</th>
          <th>${lang==='en'?'Backend admin':'Admin backend'}</th>
          <th>${lang==='en'?'Members':'Thành viên'}</th>
          <th>${lang==='en'?'Status':'Trạng thái'}</th>
          <th>${lang==='en'?'Actions':'Thao tác'}</th>
        </tr></thead>
        <tbody>
          ${filteredRows.map(row=>{
            const code = String(row.role_code || '');
            const codeJs = JSON.stringify(code);
            const ui = roleRecordUi(code, row);
            const members = USERS.filter(user => String(user.role||'') === code && user.active !== false);
            const active = row.is_active !== false;
            return `<tr>
              <td style="font-size:16px">${escapeHtml(ui.icon || '👤')}</td>
              <td>
                <b style="color:${escapeHtml(ui.color)}">${escapeHtml(ui.label || code)}</b><br>
                <span style="font-size:10px;color:var(--text-3)">${escapeHtml(ui.labelEn || row.role_label || code)}</span>
                ${row.description ? `<div style="font-size:10px;color:var(--text-3);margin-top:4px">${escapeHtml(row.description)}</div>` : ''}
              </td>
              <td style="font-family:var(--mono);font-size:11px">${escapeHtml(code)}</td>
              <td>${escapeHtml(row.dept_code || ui.dept || '—')}</td>
              <td style="text-align:center">${escapeHtml(String(ui.level))}</td>
              <td style="text-align:center"><input type="checkbox" ${ui.canEditDocs?'checked':''} onchange="toggleSystemRoleFlag(${codeJs},'canEditDocs',this.checked)"></td>
              <td style="text-align:center"><input type="checkbox" ${ui.canCreateDocs?'checked':''} onchange="toggleSystemRoleFlag(${codeJs},'canCreateDocs',this.checked)"></td>
              <td style="text-align:center"><input type="checkbox" ${ui.approve?'checked':''} onchange="toggleSystemRoleFlag(${codeJs},'approve',this.checked)"></td>
              <td style="text-align:center"><input type="checkbox" ${ui.canViewActivity?'checked':''} onchange="toggleSystemRoleFlag(${codeJs},'canViewActivity',this.checked)"></td>
              <td style="text-align:center"><input type="checkbox" ${ui.canExportUsers?'checked':''} onchange="toggleSystemRoleFlag(${codeJs},'canExportUsers',this.checked)"></td>
              <td style="text-align:center">${ROLES[code] && ROLES[code].admin ? '<span title="Immutable backend admin flag">🔒</span>' : '<span style="color:var(--text-3)">—</span>'}</td>
              <td style="min-width:140px">
                ${members.length
                  ? members.slice(0,4).map(user=>`<div style="font-size:10px;padding:2px 0">${escapeHtml(user.name)}</div>`).join('') + (members.length > 4 ? `<div style="font-size:10px;color:var(--text-3)">+${members.length - 4} khác</div>` : '')
                  : `<span style="font-size:10px;color:var(--text-3);font-style:italic">${lang==='en'?'No portal users':'Chưa có user portal'}</span>`}
              </td>
              <td style="text-align:center">
                <span style="font-size:10px;padding:2px 8px;border-radius:999px;border:1px solid var(--border);background:${active?'color-mix(in srgb, var(--green) 12%, var(--bg-surface,#fff))':'color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff))'};color:${active?'var(--green-dark,#15803d)':'var(--amber-dark,#b45309)'}">${active?'active':'inactive'}</span>
              </td>
              <td>
                <div style="display:flex;gap:6px;flex-wrap:wrap">
                  <button class="btn-admin secondary sm" onclick="promptEditSystemRole(${codeJs})">${lang==='en'?'Edit':'Sửa'}</button>
                  <button class="btn-admin secondary sm" onclick="setSystemRoleActive(${codeJs}, ${active?'false':'true'})">${active?(lang==='en'?'Deactivate':'Ngừng dùng'):(lang==='en'?'Activate':'Kích hoạt')}</button>
                </div>
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
      <div style="margin-top:16px;font-size:11px;color:var(--text-3);padding:10px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:8px">
      ${lang==='en'
        ?'User-to-role assignment should be managed in the user account workflow, not by directly mutating the role catalog grid.'
        :'Gán user vào role cần được quản lý trong quy trình tài khoản người dùng, không nên sửa trực tiếp trong grid catalog vai trò.'}
    </div>`;
  el.innerHTML = adminScopedLayout(headHtml, bodyHtml, 'has-x-scroll');
}

async function toggleSystemRoleFlag(roleCode, key, value){
  const patch = {};
  patch[key] = value;
  const saved = await upsertAuthoritativeRole(roleCode, patch);
  if(saved){
    showToast('✅ ' + (lang==='en' ? 'Role updated' : 'Đã cập nhật vai trò'));
    renderAdminRoles();
  }
}

async function promptCreateSystemRole(){
  const code = (prompt('Mã vai trò (ví dụ qa_manager, process_engineer):','') || '').trim();
  if(!code) return;
  const labelVi = (prompt('Tên vai trò (VI):','') || '').trim();
  if(!labelVi) return;
  const labelEn = (prompt('Tên vai trò (EN):', labelVi) || '').trim() || labelVi;
  const deptCode = (prompt('Dept code (để trống nếu không gắn):','') || '').trim().toUpperCase();
  const description = (prompt('Mô tả vai trò:','') || '').trim();
  const level = Math.max(0, Number((prompt('Level vai trò:', '4') || '').trim()) || 4);
  const res = await runtimeCreate('core_system', 'roles', {
    role_code: code,
    role_label: labelEn,
    role_label_vi: labelVi,
    dept_code: deptCode || null,
    description,
    is_active: true,
    permissions: {
      level,
      approve: false,
      canEditDocs: false,
      canCreateDocs: false,
      canViewActivity: false,
      canExportUsers: false,
      icon: '👤',
      color: defaultDepartmentColor(deptCode || code)
    }
  });
  if(!(res && res.ok && res.record)){
    showToast('⚠ ' + runtimeErrorMessage(res, lang==='en'?'Create role failed':'Tạo vai trò thất bại'), 'error');
    return;
  }
  await loadAuthoritativeRoleCatalog({force:true});
  showToast('✅ ' + (lang==='en' ? 'Role created' : 'Đã tạo vai trò'));
}

async function promptEditSystemRole(roleCode){
  const row = ADMIN_AUTH_STATE.roles.byCode[roleCode];
  if(!row) return;
  const ui = roleRecordUi(roleCode, row);
  const labelVi = (prompt('Tên vai trò (VI):', row.role_label_vi || ui.label || '') || '').trim();
  if(!labelVi) return;
  const labelEn = (prompt('Tên vai trò (EN):', row.role_label || ui.labelEn || '') || '').trim() || labelVi;
  const deptCode = (prompt('Dept code:', row.dept_code || ui.dept || '') || '').trim().toUpperCase();
  const description = (prompt('Mô tả vai trò:', row.description || '') || '').trim();
  const level = Math.max(0, Number((prompt('Level vai trò:', String(ui.level || 4)) || '').trim()) || ui.level || 4);
  const icon = (prompt('Biểu tượng role:', ui.icon || '👤') || '').trim() || (ui.icon || '👤');
  const color = (prompt('Màu role (hex hoặc token CSS):', ui.color || defaultDepartmentColor(deptCode || roleCode)) || '').trim() || (ui.color || defaultDepartmentColor(deptCode || roleCode));
  const saved = await upsertAuthoritativeRole(roleCode, {
    role_label_vi: labelVi,
    role_label: labelEn,
    dept_code: deptCode || null,
    description,
    level,
    icon,
    color
  });
  if(saved){
    showToast('✅ ' + (lang==='en' ? 'Role updated' : 'Đã cập nhật vai trò'));
    renderAdminRoles();
  }
}

async function setSystemRoleActive(roleCode, active){
  const row = ADMIN_AUTH_STATE.roles.byCode[roleCode];
  if(!row) return;
  const confirmed = confirm(active ? `Kích hoạt lại vai trò ${roleCode}?` : `Ngừng sử dụng vai trò ${roleCode}?`);
  if(!confirmed) return;
  const saved = await upsertAuthoritativeRole(roleCode, {is_active: active});
  if(saved){
    showToast(active ? '✅ Đã kích hoạt vai trò' : '✅ Đã ngừng dùng vai trò');
    renderAdminRoles();
  }
}

function reassignUserRole(){
  const userId=document.getElementById('role-reassign-user').value;
  const newRole=document.getElementById('role-reassign-role').value;
  const u=USERS.find(x=>String(x.id)===String(userId));
  if(u){
    u.role=newRole;
    u.title=ROLES[newRole]?ROLES[newRole].label:newRole;
    saveUsersToStorage();
    markUnsaved();
    showToast(lang==='en'?'✅ Role changed for '+u.name:'✅ Đã đổi vai trò cho '+u.name);
    renderAdminRoles();
  }
}


// ═══════════════════════════════════════════════════
