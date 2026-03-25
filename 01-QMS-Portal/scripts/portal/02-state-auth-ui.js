// APP STATE
// ═══════════════════════════════════════════════════
let currentUser = null;
let currentPage = 'dashboard';
let currentFilter = 'ALL';
let searchQuery = '';
let currentFolderPath = []; // Hierarchical navigation: ['08-Organization','03-Job-Descriptions','01-JD-EXE']
let folderEditMode = false; // Toggle for file manager edit mode
let docHeaderMetaCollapsed = true;
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
let pendingAuthTimer = null;

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
  currentUser = null;
  csrfToken = null;
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
        showToast('⚠ ' + ((res && res.error) ? res.error : (lang==='en'?'display_config_load_failed':'Khong tai duoc cau hinh hien thi portal')));
      }
    }catch(e){
      if(!options.silent){
        showToast('⚠ ' + ((e && e.message) ? e.message : (lang==='en'?'display_config_load_failed':'Khong tai duoc cau hinh hien thi portal')));
      }
    }finally{
      portalDisplayConfigLoadPromise = null;
    }
    return PORTAL_DISPLAY_CONFIG;
  })();
  return portalDisplayConfigLoadPromise;
}

function portalSidebarCoreItems(){
  return [
    {id:'dashboard', icon:'🏠', label:lang==='en'?'Dashboard':'Dashboard'},
    {id:'documents', icon:'📁', label:lang==='en'?'All documents':'Tất cả tài liệu'},
    {id:'search', icon:'🔍', label:lang==='en'?'Search':'Tìm kiếm'},
    {id:'dictionary', icon:'📖', label:lang==='en'?'Dictionary':'Từ điển thuật ngữ'},
    {id:'deploy', icon:'🚀', label:lang==='en'?'Operations deploy':'Triển khai vận hành'},
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

function isPortalSidebarSectionVisible(id){
  const key = String(id||'').toLowerCase();
  return !((PORTAL_DISPLAY_CONFIG?.sidebar?.hidden_sections || []).includes(key));
}

function isPortalSidebarCategoryVisible(id){
  const key = String(id||'').toUpperCase();
  return !((PORTAL_DISPLAY_CONFIG?.sidebar?.hidden_categories || []).includes(key));
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
    const res = await apiCall('doc_versions_list', {code, base_path: doc?doc.path:''});
    if(res && res.ok){
      if(res.state) SERVER_DOC_STATE[code]=res.state;
      SERVER_DOC_VERSIONS[code]=Array.isArray(res.versions)?res.versions:[];
      return res;
    }
  }catch(e){ /* ignore */ }
  return null;
}

async function loadRolePermsFromServer(){
  try{
    const res = await apiCall('role_perms_get', null, 'GET');
    if(res && res.ok && res.perms){
      Object.keys(res.perms).forEach(r=>{
        if(!ROLES[r]) return;
        if(res.perms[r] && typeof res.perms[r].canCreateDocs!=='undefined'){
          ROLES[r].canCreateDocs = !!res.perms[r].canCreateDocs;
        }
      });
    }
  }catch(e){ /* ignore */ }
}

async function saveRolePermsToServer(){
  const perms={};
  Object.keys(ROLES).forEach(r=>{
    perms[r]={ canCreateDocs: !!ROLES[r].canCreateDocs };
  });
  return await apiCall('admin_role_perms_save',{perms});
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
  const url = 'api.php?action=' + encodeURIComponent(action);
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const opts = {method, credentials:'include', headers:{}};
  if(controller) opts.signal = controller.signal;
  if(method !== 'GET') opts.headers['Content-Type'] = 'application/json';
  if(csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  if(payload && method !== 'GET') opts.body = JSON.stringify(payload);

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
  }
}

async function apiCallFormData(action, formData, timeoutMs=120000){
  const url = 'api.php?action=' + encodeURIComponent(action);
  const controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
  const opts = {method:'POST', credentials:'include', headers:{}};
  if(controller) opts.signal = controller.signal;
  if(csrfToken) opts.headers['X-CSRF-Token'] = csrfToken;
  opts.body = formData;
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
  }
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

async function doLogin(){
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pin').value;
  const otp = (document.getElementById('inp-otp')?.value || '').trim();
  const recovery = (document.getElementById('inp-recovery')?.value || '').trim();

  try{
    if(loginStage === 'password'){
      if(!u || !p){ showLoginError(lang==='en' ? 'Please enter username and password' : 'Vui lòng nhập tài khoản và mật khẩu'); return; }

      const res = await apiCall('auth_login', {username:u, password:p});
      if(!res.ok){
        showLoginError(res.error || T('login_error'));
        return;
      }
      if(res.enroll_required){
        enrollInfo = res;
        document.getElementById('enroll-issuer').textContent = res.issuer || '';
        document.getElementById('enroll-username').textContent = res.username || u;
        document.getElementById('enroll-secret').textContent = res.secret || '';
        document.getElementById('enroll-otpauth').textContent = res.otpauth_url || '';
        renderEnrollQR(res.otpauth_url || '');
        setLoginStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số');
        return;
      }
      if(res.mfa_required){
        setLoginStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator');
        return;
      }
      if(res.logged_in){
        await onLoggedIn(res);
        return;
      }
      showLoginError(res.error || T('login_error'));
      return;
    }

    if(loginStage === 'enroll'){
      if(!otp){ showLoginError(lang==='en' ? 'Enter 6-digit code to confirm' : 'Nhập mã 6 số để xác nhận'); return; }
      const res = await apiCall('auth_enroll_verify', {code: otp});
      if(!res.ok){
        if(res.error === 'unauthorized') showLoginError(lang==='en' ? 'Login session expired. Please sign in again.' : 'Phiên đăng nhập bị mất. Vui lòng thử đăng nhập lại.');
        else showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mã'));
        return;
      }
      if(res.recovery_codes && Array.isArray(res.recovery_codes)){
        showRecoveryCodes(res.recovery_codes);
      }
      await onLoggedIn(res);
      return;
    }

    if(loginStage === 'mfa'){
      if(!otp && !recovery){ showLoginError(lang==='en' ? 'Enter authenticator code or recovery code' : 'Nhập mã xác thực hoặc mã dự phòng'); return; }
      const res = await apiCall('auth_mfa_verify', {username:u, password:p, code: otp, recovery: recovery});
      if(!res.ok){ showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mã')); return; }
      await onLoggedIn(res);
      return;
    }
  }catch(err){
    console.error(err);
    showLoginError(lang==='en' ? 'Cannot connect to server. Please try again.' : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
}

async function onLoggedIn(res){
  csrfToken = res.csrf_token || csrfToken;
  currentUser = res.user || currentUser;

  if(!currentUser){
    // fallback: check status
    try{
      const s = await apiCall('status', null, 'GET');
      if(s.logged_in){ currentUser = s.user; csrfToken = s.csrf_token || csrfToken; }
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
      currentUser = null; csrfToken = null;
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
      currentUser = null; csrfToken = null;
      try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}
      setLoginStage('password');
      return;
    }
  }

  // Start activity tracking
  startActivityTracking(geo);

  showApp();
}

async function doLogout(){
  try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}

  csrfToken = null;
  currentUser = null;
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

function setLoginChecking(isChecking, msg){
  const user = document.getElementById('inp-user');
  const pass = document.getElementById('inp-pin');
  const btn = document.getElementById('btn-login');
  if(user) user.disabled = !!isChecking;
  if(pass) pass.disabled = !!isChecking;
  if(btn) btn.disabled = !!isChecking;
  const stageMsg = document.getElementById('login-stage-msg');
  if(stageMsg){
    stageMsg.textContent = msg || '';
    stageMsg.style.display = msg ? 'block' : 'none';
  }
}

async function checkSession(){
  // Avoid "false logout" on hard refresh when the server is busy or a session file is locked.
  // We temporarily disable the login form and retry a few times.
  setLoginChecking(true, lang==='en' ? 'Checking session…' : 'Đang kiểm tra phiên đăng nhập…');

  const delays = [0, 350, 900, 1600];
  for(let i=0;i<delays.length;i++){
    if(delays[i]) await new Promise(r=>setTimeout(r, delays[i]));
    try{
      const s = await apiCall('status', null, 'GET', 8000);
      if(s && s.logged_in){
        csrfToken = s.csrf_token || null;
        currentUser = s.user;
        setLoginChecking(false, '');
        // Resume tracking with geolocation
        const geo = await requireGeolocation().catch(()=>({ok:false}));
        startActivityTracking(geo);
        showApp();
        return;
      }
      if(s && s.enroll_pending){
        csrfToken = s.csrf_token || null;
        enrollInfo = s;
        document.getElementById('enroll-issuer').textContent = s.issuer || '';
        document.getElementById('enroll-username').textContent = s.username || '';
        document.getElementById('enroll-secret').textContent = s.secret || '';
        document.getElementById('enroll-otpauth').textContent = s.otpauth_url || '';
        renderEnrollQR(s.otpauth_url || '');
        setLoginChecking(false, '');
        setLoginStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số');
        return;
      }
      if(s && s.mfa_pending){
        csrfToken = s.csrf_token || null;
        setLoginChecking(false, '');
        setLoginStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator');
        return;
      }
      // Not logged in
      break;
    }catch(e){
      // try again
    }
  }

  setLoginChecking(false, '');
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
// e.g., "10-Training-Academy/02-Course-Modules/C01.html" → "Modules"
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
  const uid = currentUser.id;
  if(PERM_OVERRIDES[uid]){
    if(PERM_OVERRIDES[uid].grant && PERM_OVERRIDES[uid].grant.includes(docCode)) return true;
    if(PERM_OVERRIDES[uid].deny && PERM_OVERRIDES[uid].deny.includes(docCode)) return false;
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
async function showApp(){
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  const r = ROLES[currentUser.role] || {label: currentUser.title||currentUser.role, labelEn: currentUser.title||currentUser.role};
  document.getElementById('hdr-name').textContent = currentUser.name;
  document.getElementById('hdr-title').textContent = (lang==='en' ? (r.labelEn||r.label||currentUser.title||'') : (r.label||currentUser.title||''));
  // Avatar removed
  // Set avatar text (tricky with dropdown child)
  document.getElementById('dd-name').textContent = currentUser.name;
  document.getElementById('dd-title').textContent = (lang==='en'?(r.labelEn||currentUser.title):currentUser.title) + ' · ' + currentUser.dept;
  document.getElementById('dd-access').textContent = lang==='en'?(r.labelEn||r.label):r.label;
  // Load server-backed settings/lists before initial render
  await loadDocsFromServer(); // ★ LIVE: scan filesystem for documents
  await loadFolderDescriptions(); // ★ Load folder descriptions
  await loadRolePermsFromServer();
  await loadCustomDocsFromServer();
  await loadDocVisibilityFromServer();
  await refreshAllDocStatesFromServer();

  renderSidebar();
  syncSidebarToggleState();
  navigateTo('dashboard');
  loadUsersFromServerIfAdmin();
  try{ if(typeof startLiveDocsSync==='function') startLiveDocsSync(); }catch(e){}
}

// Auth flow hardening override:
// - keep MFA/enroll pending on the login screen only
// - expire pending OTP/enroll sessions cleanly
// - never render an "empty portal" when auth is incomplete
async function doLogin(){
  const u = document.getElementById('inp-user').value.trim();
  const p = document.getElementById('inp-pin').value;
  const otp = (document.getElementById('inp-otp')?.value || '').trim();
  const recovery = (document.getElementById('inp-recovery')?.value || '').trim();

  try{
    if(loginStage === 'password'){
      if(!u || !p){ showLoginError(lang==='en' ? 'Please enter username and password' : 'Vui lòng nhập tài khoản và mật khẩu'); return; }

      const res = await apiCall('auth_login', {username:u, password:p});
      if(!res.ok){
        showLoginError(res.error || T('login_error'));
        return;
      }
      if(res.enroll_required){
        enrollInfo = res;
        csrfToken = res.csrf_token || csrfToken;
        document.getElementById('enroll-issuer').textContent = res.issuer || '';
        document.getElementById('enroll-username').textContent = res.username || u;
        document.getElementById('enroll-secret').textContent = res.secret || '';
        document.getElementById('enroll-otpauth').textContent = res.otpauth_url || '';
        renderEnrollQR(res.otpauth_url || '');
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'Bước 2: Bật 2FA và nhập mã 6 số', res.pending_expires_in);
        return;
      }
      if(res.mfa_required){
        csrfToken = res.csrf_token || csrfToken;
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nhập mã xác thực 6 số từ Authenticator', res.pending_expires_in);
        return;
      }
      if(res.logged_in){
        await onLoggedIn(res);
        return;
      }
      showLoginError(res.error || T('login_error'));
      return;
    }

    if(loginStage === 'enroll'){
      if(!otp){ showLoginError(lang==='en' ? 'Enter 6-digit code to confirm' : 'Nhập mã 6 số để xác nhận'); return; }
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
      await onLoggedIn(res);
      return;
    }

    if(loginStage === 'mfa'){
      if(!otp && !recovery){ showLoginError(lang==='en' ? 'Enter authenticator code or recovery code' : 'Nhập mã xác thực hoặc mã dự phòng'); return; }
      const res = await apiCall('auth_mfa_verify', {username:u, password:p, code: otp, recovery: recovery});
      if(!res.ok){
        if(res.error === 'mfa_expired' || res.error === 'unauthorized'){
          resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Authenticator verification timed out. Please sign in again.' : 'Phiên xác thực OTP đã hết hạn. Vui lòng đăng nhập lại.'});
        } else {
          showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mã'));
        }
        return;
      }
      await onLoggedIn(res);
      return;
    }
  }catch(err){
    console.error(err);
    showLoginError(lang==='en' ? 'Cannot connect to server. Please try again.' : 'Không thể kết nối máy chủ. Vui lòng thử lại.');
  }
}

async function doLogout(){
  clearPendingAuthTimer();
  try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}

  csrfToken = null;
  currentUser = null;

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
  const delays = [0, 350, 900, 1600];
  for(let i=0;i<delays.length;i++){
    if(delays[i]) await new Promise(r=>setTimeout(r, delays[i]));
    try{
      const s = await apiCall('status', null, 'GET', 8000);
      lastStatus = s;
      if(s && s.logged_in){
        clearPendingAuthTimer();
        csrfToken = s.csrf_token || null;
        currentUser = s.user;
        setLoginChecking(false, '');
        const geo = await requireGeolocation().catch(()=>({ok:false}));
        startActivityTracking(geo);
        showApp();
        return;
      }
      if(s && s.enroll_pending){
        csrfToken = s.csrf_token || null;
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
        csrfToken = s.csrf_token || null;
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
        csrfToken = status.csrf_token || null;
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
        csrfToken = status.csrf_token || null;
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
  await loadCustomDocsFromServer();
  await loadDocVisibilityFromServer();
  await refreshAllDocStatesFromServer();

  renderSidebar();
  syncSidebarToggleState();
  navigateTo('dashboard');
  loadUsersFromServerIfAdmin();
}

function renderSidebar(){
  const nav = document.getElementById('sidebar-nav');
  const VDOCS = getVisibleDocs();

  const SIDEBAR_SECTIONS = portalSidebarSections();
  const coreButtons = [];

  if(isPortalSidebarCoreVisible('dashboard')){
    coreButtons.push(`<button class="nav-item ${currentPage==='dashboard'?'active':''}" onclick="navigateTo('dashboard')"><span class="icon">🏠</span><span>${T('dashboard')}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('documents')){
    coreButtons.push(`<button class="nav-item ${currentPage==='documents'?'active':''}" onclick="navigateTo('documents')"><span class="icon">📁</span><span>${T('all_docs')}</span><span class="badge">${VDOCS.length}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('search')){
    coreButtons.push(`<button class="nav-item ${currentPage==='search'?'active':''}" onclick="navigateTo('search')"><span class="icon">🔍</span><span>${T('search')}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('dictionary')){
    coreButtons.push(`<button class="nav-item ${currentPage==='dictionary'?'active':''}" onclick="navigateTo('dictionary')"><span class="icon">📖</span><span>${T('dictionary')}</span><span class="badge" id="dict-badge">${dictData ? dictData.length.toLocaleString() : '...'}</span></button>`);
  }

  let html = coreButtons.length ? `<div class="nav-section">${coreButtons.join('')}</div>` : '';

  if(isPortalSidebarCoreVisible('deploy')){
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'DEPLOYMENT':'TRIỂN KHAI VẬN HÀNH'}</div>
      <button class="nav-item ${currentPage==='deploy'?'active':''}" onclick="navigateTo('deploy')"><span class="icon">🚀</span><span>${lang==='en'?'Operations Deploy':'Triển khai vận hành'}</span></button>
    </div>`;
  }
  if(isAdmin() && isPortalSidebarCoreVisible('admin')){
    html += `<div class="nav-section"><div class="nav-section-title">ADMIN</div><button class="nav-item ${currentPage==='admin'?'active':''}" onclick="navigateTo('admin')"><span class="icon">⚙</span><span>${T('admin_panel')}</span></button></div>`;
  }

  SIDEBAR_SECTIONS.forEach(sec => {
    if(!isPortalSidebarSectionVisible(sec.id)) return;
    const catsInSec = CATEGORIES.filter(c => !c.hidden && isPortalSidebarCategoryVisible(c.id) && c.section === sec.id && VDOCS.some(d => d.cat === c.id));
    if(catsInSec.length === 0) return;
    html += `<div class="nav-section"><div class="nav-section-title">${sec.label}</div>`;
    catsInSec.forEach(cat => {
      const cnt = VDOCS.filter(d=>d.cat===cat.id).length;
      if(cnt === 0) return;
      const locked = !VDOCS.filter(d=>d.cat===cat.id).some(d=>canAccessDoc(d.code));
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
function navigateTo(page, filter){
  // Auto-close sidebar on mobile
  if(window.innerWidth <= 900) closeMobileSidebar();
  currentPage = page;
  if(page==='admin') loadUsersFromServerIfAdmin();
  if(filter !== undefined) currentFilter = filter;
  if(page==='documents' && filter !== undefined) currentFolderPath = []; // Reset folder path on category change
  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  document.getElementById('doc-viewer').classList.remove('active');
  document.getElementById('user-dropdown').classList.remove('show');
  
  // Track page view for activity log
  const pageTitles = {dashboard:'Tổng quan',documents:'Danh sách tài liệu',search:'Tìm kiếm',dictionary:'Từ điển thuật ngữ',access:'Ma trận truy cập',admin:'Quản trị hệ thống',deploy:'Triển khai vận hành'};
  trackPageView(page + (filter ? '/'+filter : ''), (pageTitles[page]||page) + (filter ? ' — '+filter : ''));
  
  const titles = {dashboard:T('bc_dashboard'),documents:T('bc_documents'),search:T('bc_search'),dictionary:T('bc_dictionary'),access:T('bc_access')};
  // Reset header breadcrumb for non-documents pages
  if(page !== 'documents'){
    const bcEl = document.getElementById('header-breadcrumb');
    if(bcEl) bcEl.innerHTML = `<span>HESEM QMS</span><span style="margin:0 4px">›</span><span class="current">${titles[page]||page}</span>`;
  }
  
  setDocHeaderToolbar('');
  if(page==='dashboard') renderDashboard();
  if(page==='documents') renderDocuments();
  if(page==='search') renderSearch();
  if(page==='dictionary') renderDictionary();
  if(page==='access') renderAccessMatrix();
  if(page==='deploy') renderDeployDashboard();
  if(page==='admin'){ if(!isAdmin()){navigateTo('dashboard');return;} renderAdmin(); }
  
  document.getElementById('page-'+page).classList.add('active');
  renderSidebar();
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
        openDoc(linkedDoc.code);
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
  triggerDownloadUrl(buildDocStreamUrl(doc, true));
}

function downloadCurrentDoc(code){
  const doc = DOCS.find(d=>d.code===code);
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

function versionHasAccess(doc, version){
  return !!getVersionAccessUrl(doc, version);
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

  const doc = DOCS.find(d=>d.code===code);
  if(!doc) return;

  // Block access to hidden documents for non-admins
  if(isDocHidden(doc.code) && !isAdmin()){
    showToast(lang==='en' ? 'This document is currently hidden by Admin.' : 'Tài liệu này hiện đang bị ẩn bởi Admin.');
    return;
  }
  if(!canAccessDoc(doc.code)) return;

  // ── Unsaved Changes Guard ──
  if(editMode && editingDoc && editingDoc !== code){
    let hasUnsaved=true;
    try{
      hasUnsaved=(typeof edHasUnsavedChanges==='function')
        ? edHasUnsavedChanges(editingDoc)
        : (!!getEditedHtml(editingDoc) || !!edModified);
    }catch(e){ hasUnsaved=true; }
    if(hasUnsaved){
      showUnsavedDialog(editingDoc, code);
      return;
    }
    try{ cancelEdit(); }catch(e){
      editMode=false;
      editingDoc=null;
    }
  }

  // Track document view
  const displayTitle = getDocDisplayTitle(doc);
  trackPageView('doc/'+code, (isDownloadOnlyDoc(doc)?'📊 ':'📄 ')+code+' — '+displayTitle.substring(0,60));
  editMode=false;
  editingDoc=null;
  currentDoc=code;
  setDocHeaderMetaCollapsed(true);
  try{ if(typeof resetDocViewerZoom==='function') resetDocViewerZoom(); }catch(e){}
  edFullscreen=false;
  const _ec=document.getElementById('editor-container');
  if(_ec){ _ec.style.display='none'; _ec.classList.remove('ed-fullscreen'); }

  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  const viewer = document.getElementById('doc-viewer');
  if(viewer) viewer.classList.add('active');

  const bc = document.getElementById('header-breadcrumb');
  if(bc){
    let bcHtml = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];navigateTo('documents')">🏠</span>`;
    // Add category if we came from one
    if(currentFilter && currentFilter !== 'ALL'){
      const cat = CATEGORIES.find(c=>c.id===currentFilter);
      bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
      bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];navigateTo('documents','${currentFilter}')">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    }
    // Add folder path
    for(let i=0; i<currentFolderPath.length; i++){
      const seg = currentFolderPath[i];
      const label = getSubfolderLabel(seg);
      bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span>`;
      bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});navigateTo('documents')">${label}</span>`;
    }
    bcHtml += `<span style="color:var(--text-3);margin:0 4px">›</span><span style="font-weight:700">${doc.code}</span>`;
    bc.innerHTML = bcHtml;
    bc.style.display = 'flex';
    bc.style.alignItems = 'center';
    bc.style.flex = '1';
  }

  // Render UI immediately (do NOT block on server-side version scan)
  updateDocViewerHeader(doc);
  renderWorkflowPanel(doc);
  renderVersionHistory(doc);

  // Load current document HTML immediately
  loadDocContent(code);

  // Background: refresh server-backed state + versions, then re-render once
  try{
    refreshDocFromServer(code).then(()=>{
      try{
        updateDocViewerHeader(doc);
        renderWorkflowPanel(doc);
        renderVersionHistory(doc);
        // Re-load iframe in case the resolved view file changed (draft / inreview / archive)
        loadDocContent(code);
      }catch(e){}
    }).catch(()=>{});
  }catch(e){}
}

// Refresh the currently-open document preview (header, workflow, DCR record, iframe)
// without navigating away. This is used after server-side state changes (approve/new revision).
async function openDocPreview(code){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    // Pull the latest server state/versions to keep folder-sync accurate
    try{ await refreshDocFromServer(code); }catch(e){}

    // Ensure doc viewer is active
    currentDoc = code;
    setDocHeaderMetaCollapsed(true);
    const viewer = document.getElementById('doc-viewer');
    if(viewer) viewer.classList.add('active');

    // Re-render UI blocks
    updateDocViewerHeader(doc);
    renderWorkflowPanel(doc);
    renderVersionHistory(doc);
    loadDocContent(code);
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
  setDocHeaderMetaCollapsed(true);
  try{ if(typeof resetDocViewerZoom==='function') resetDocViewerZoom(); }catch(e){}
  // Clean up iframe state to prevent stale content
  var iframe=document.getElementById('doc-iframe');
  iframe.onload=null;
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
    const activeDraft=versions.find(v=>v && v.status==='draft' && (v.download_url || v.file) && String(v.version||'').replace(/^v/i,'')===String(getDocRevision(doc)||''));
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

function updateDocViewerHeader(doc){
  if(!doc) return;
  const cat = getCatForDoc(doc);
  const status = getDocStatus(doc);
  const rev = getDocRevision(doc);
  const state = getDocState(doc.code);
  const viewFile = getDocViewFile(doc) || doc.path;
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
  const displayTitle = getDocDisplayTitle(doc);
  const displayDesc = getDocDisplayDescription(doc);
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
  const ownerEditButton = canEdit(doc)
    ? '<button class="dv-meta-edit" onclick="event.stopPropagation();editDocMeta(\''+doc.code+'\',\'owner\')" title="'+(lang==='en'?'Edit owner':'Chỉnh chủ sở hữu')+'">'+(lang==='en'?'Edit':'Sửa')+'</button>'
    : '';
  const approverEditButton = canEdit(doc)
    ? '<button class="dv-meta-edit" onclick="event.stopPropagation();editDocMeta(\''+doc.code+'\',\'approver\')" title="'+(lang==='en'?'Edit approver':'Chỉnh người duyệt')+'">'+(lang==='en'?'Edit':'Sửa')+'</button>'
    : '';
  const activityNotes = [submittedMeta, lastEditMeta, approvedMeta].filter(Boolean).join('');
  const navActionsHtml = isWorkbook
    ? `<div class="dv-action-group dv-nav-actions">
          ${detailToggleHtml}
          ${renderDocHeaderButton(T('back'), 'back', 'neutral', 'closeDocViewer()')}
          ${renderDocHeaderButton(lang==='en'?'Download':'Tải về', 'download', 'neutral', `downloadCurrentDoc('${doc.code}')`)}
       </div>`
    : `<div class="dv-action-group dv-nav-actions">
          ${detailToggleHtml}
          ${renderDocHeaderButton(T('back'), 'back', 'neutral', 'closeDocViewer()')}
          ${renderDocHeaderButton(T('open_tab'), 'external', 'neutral', `window.open('../${viewFile}','_blank')`)}
       </div>`;

  const headerEl = document.getElementById('doc-viewer-header');
  setDocHeaderToolbar(`
    <div class="doc-toolbar-shell">
      ${headerActionsHtml}
      ${navActionsHtml}
    </div>
  `);
  headerEl.innerHTML = `
    <div class="dv-top">
      <div class="dv-title-area">
        <div class="dv-code" style="color:${cat.color}">${doc.code} <span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;background:${statusColor(status)}18;color:${statusColor(status)}">${statusLabel(status)}</span></div>
        <div class="dv-name">${displayTitle}</div>
        ${displayDesc ? `<div class="dv-desc">${displayDesc}</div>` : ''}
      </div>
    </div>
    <div class="dv-meta${docHeaderMetaCollapsed ? ' is-collapsed' : ''}">
      <div class="dv-meta-grid">
        <div class="dv-meta-item"><span class="dv-meta-label">${T('code_label')}</span><div class="dv-meta-value"><b>${doc.code}</b></div></div>
        <div class="dv-meta-item"><span class="dv-meta-label">${T('revision_label')}</span><div class="dv-meta-value"><b style="color:${statusColor(status)}">v${rev}</b></div></div>
        <div class="dv-meta-item"><span class="dv-meta-label">${T('type')}</span><div class="dv-meta-value"><b>${catLabel(cat)}</b></div></div>
        <div class="dv-meta-item"><span class="dv-meta-label">${T('owner')}</span><div class="dv-meta-value"><b>${(state&&state.owner)?state.owner:doc.owner}</b>${ownerEditButton}</div></div>
        <div class="dv-meta-item"><span class="dv-meta-label">${T('approver')}</span><div class="dv-meta-value"><b>${(state&&state.approver)?state.approver:T('gd')}</b>${approverEditButton}</div></div>
        <div class="dv-meta-item"><span class="dv-meta-label">${T('status')}</span><div class="dv-meta-value"><b style="color:${statusColor(status)}">${statusLabel(status)}</b></div></div>
      </div>
      ${activityNotes ? `<div class="dv-meta-notes">${activityNotes}</div>` : ''}
    </div>`;
  syncDocViewerDetailVisibility();
}

// ═══════════════════════════════════════════════════
// RENDER PAGES
// ═══════════════════════════════════════════════════

// Edit doc metadata (owner, approver) - synced to server state
async function editDocMeta(code, field){
  try{
    const doc = DOCS.find(d=>d.code===code);
    if(!doc) return;
    const state = getDocState(code) || {};
    
    // Build options for the field
    let currentVal = '';
    let title = '';
    let options = [];
    
    if(field === 'owner'){
      currentVal = (state.owner || doc.owner || '');
      title = lang==='en'?'Edit Document Owner':'Chỉnh sửa Chủ sở hữu';
      // Build department list from CATEGORIES or known departments
      options = ['QA/QMS','Production','Engineering','Sales','Purchasing','HR/Admin','IT','Finance','Warehouse','Planning','Quality','Maintenance','Management'];
    } else if(field === 'approver'){
      currentVal = (state.approver || (lang==='en'?'General Director':'Tổng Giám Đốc'));
      title = lang==='en'?'Edit Approver':'Chỉnh sửa Người phê duyệt';
      options = [lang==='en'?'General Director':'Tổng Giám Đốc', 'QMR', 'QA Manager', 'Production Manager', 'Engineering Manager'];
      // Add admin users if available
      try{
        if(typeof adminUsers !== 'undefined' && Array.isArray(adminUsers)){
          adminUsers.forEach(u=>{ if(u.name && !options.includes(u.name)) options.push(u.name); });
        }
      }catch(e){}
    }
    
    const newVal = prompt(title + '\n\n' + (lang==='en'?'Current':'Hiện tại') + ': ' + currentVal + '\n\n' + (lang==='en'?'Options':'Tùy chọn') + ': ' + options.join(', ') + '\n\n' + (lang==='en'?'Enter new value:':'Nhập giá trị mới:'), currentVal);
    if(newVal === null || newVal.trim() === '' || newVal.trim() === currentVal) return;
    
    // Update state
    state[field] = newVal.trim();
    setDocState(code, state);
    
    // Sync to server
    try{
      await apiCall('doc_update_meta', {code, base_path: doc.path, field, value: newVal.trim()});
    }catch(e){ console.warn('doc_update_meta sync error:', e); }
    
    // Refresh header
    updateDocViewerHeader(doc);
    showToast((lang==='en'?'Updated ':'Đã cập nhật ') + field);
  }catch(err){
    console.error('editDocMeta error:', err);
  }
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

  // High-impact execution shortcuts (RFQ → Cash, G0–G6)
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
      <h3 style="margin-bottom:8px">🏭 ${lang==='en'?'Job Order Lifecycle — G0 → G6 (7 Gates)':'Vòng đời đơn hàng — G0 → G6 (7 cổng)'}</h3>
      <div style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px">
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #4CAF50;background:#f8fdf8"><div style="font-weight:700;font-size:12px;color:#2e7d32;margin-bottom:4px">G0 — Contract</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'RFQ, order entry':'Xem xét RFQ, nhập đơn'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-201');return false" style="color:#0369a1">SOP-201</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #795548;background:#faf6f3"><div style="font-weight:700;font-size:12px;color:#4e342e;margin-bottom:4px">G1 — IQC</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Receiving, incoming QC':'Nhận hàng, kiểm tra đầu vào'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('WI-701');return false" style="color:#0369a1">WI-701</a> · <a href="#" onclick="openDoc('SOP-402');return false" style="color:#0369a1">SOP-402</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #2196F3;background:#f5f9ff"><div style="font-weight:700;font-size:12px;color:#1565c0;margin-bottom:4px">G2 — Setup</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Program, machine setup':'Phát hành CT, setup máy'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-303');return false" style="color:#0369a1">SOP-303</a> · <a href="#" onclick="openDoc('SOP-504');return false" style="color:#0369a1">SOP-504</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #FF9800;background:#fffbf0"><div style="font-weight:700;font-size:12px;color:#e65100;margin-bottom:4px">G3 — FAI</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'First article inspection':'Kiểm tra bài đầu tiên'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-302');return false" style="color:#0369a1">SOP-302</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #9C27B0;background:#fdf5ff"><div style="font-weight:700;font-size:12px;color:#7b1fa2;margin-bottom:4px">G4 — IPQC</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'In-process QC, SPC':'Kiểm soát trong quá trình'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-502');return false" style="color:#0369a1">SOP-502</a> · <a href="#" onclick="openDoc('SOP-604');return false" style="color:#0369a1">SOP-604</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #00BCD4;background:#f0fdff"><div style="font-weight:700;font-size:12px;color:#00838f;margin-bottom:4px">G5 — Final QC</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Final inspection, packing':'Kiểm tra cuối, đóng gói'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a> · <a href="#" onclick="openDoc('SOP-701');return false" style="color:#0369a1">SOP-701</a></div></div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:125px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #F44336;background:#fff5f5"><div style="font-weight:700;font-size:12px;color:#c62828;margin-bottom:4px">G6 — Ship</div><div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Shipment release, CoC':'Giao hàng, hoàn tất hồ sơ'}</div><div style="font-size:10px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a></div></div>
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
      <h3>📊 ${lang==='en'?'Operational KPIs — ISO 9001:2015 §9.1':'KPI vận hành — ISO 9001:2015 §9.1'}</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px;font-size:12px">
        <div style="padding:12px;border:1px solid #dcfce7;border-radius:8px;background:#f0fdf4;text-align:center"><div style="font-size:10px;color:#166534;font-weight:600;text-transform:uppercase">OTD</div><div style="font-size:20px;font-weight:700;color:#16a34a;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'On-Time Delivery':'Giao hàng đúng hạn'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 95%</div></div>
        <div style="padding:12px;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;text-align:center"><div style="font-size:10px;color:#1e40af;font-weight:600;text-transform:uppercase">FPY</div><div style="font-size:20px;font-weight:700;color:#2563eb;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'First Pass Yield':'Tỷ lệ đạt lần đầu'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 98%</div></div>
        <div style="padding:12px;border:1px solid #fef3c7;border-radius:8px;background:#fffbeb;text-align:center"><div style="font-size:10px;color:#92400e;font-weight:600;text-transform:uppercase">COPQ</div><div style="font-size:20px;font-weight:700;color:#d97706;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'Cost of Poor Quality':'Chi phí CL kém'}</div><div style="font-size:9px;color:#999;margin-top:2px">≤ 2%</div></div>
        <div style="padding:12px;border:1px solid #fee2e2;border-radius:8px;background:#fef2f2;text-align:center"><div style="font-size:10px;color:#991b1b;font-weight:600;text-transform:uppercase">NCR</div><div style="font-size:20px;font-weight:700;color:#dc2626;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'Open NCRs':'NCR đang mở'}</div><div style="font-size:9px;color:#999;margin-top:2px">= 0</div></div>
        <div style="padding:12px;border:1px solid #f3e8ff;border-radius:8px;background:#faf5ff;text-align:center"><div style="font-size:10px;color:#6b21a8;font-weight:600;text-transform:uppercase">IQC Pass</div><div style="font-size:20px;font-weight:700;color:#7c3aed;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'IQC Pass Rate':'Tỷ lệ đạt IQC'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 99%</div></div>
        <div style="padding:12px;border:1px solid #e0f2fe;border-radius:8px;background:#f0f9ff;text-align:center"><div style="font-size:10px;color:#075985;font-weight:600;text-transform:uppercase">OEE</div><div style="font-size:20px;font-weight:700;color:#0284c7;margin:4px 0">—</div><div style="font-size:10px;color:#666">${lang==='en'?'Equipment Effectiveness':'Hiệu suất thiết bị'}</div><div style="font-size:9px;color:#999;margin-top:2px">≥ 85%</div></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text-3);text-align:right"><a href="#" onclick="openDoc('ANNEX-122');return false" style="color:#0369a1">${lang==='en'?'Full KPI Dictionary':'Từ điển KPI đầy đủ'} → ANNEX-122</a> · <a href="#" onclick="openDoc('WI-901');return false" style="color:#0369a1">${lang==='en'?'Dashboard Guide':'Hướng dẫn Dashboard'} → WI-901</a></div>
    </div>
    `;
/* OLD DASHBOARD SECTIONS REMOVED (welcome-banner, quick-access grid, system-overview)
   Replaced with: stats-row, gate-flow G0-G6, role-cards, key-docs, KPI panel
   <div class="welcome-banner">
        <img src="data:image/svg+xml;base64,PD94bWwgdmVyc2lvbj0iMS4wIiBlbmNvZGluZz0iVVRGLTgiPz4NCjwhRE9DVFlQRSBzdmcgUFVCTElDICItLy9XM0MvL0RURCBTVkcgMS4xLy9FTiIgImh0dHA6Ly93d3cudzMub3JnL0dyYXBoaWNzL1NWRy8xLjEvRFREL3N2ZzExLmR0ZCI+DQo8IS0tIENyZWF0b3I6IENvcmVsRFJBVyAyMDIxICg2NC1CaXQpIC0tPg0KPHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHhtbDpzcGFjZT0icHJlc2VydmUiIHdpZHRoPSIyODkzcHgiIGhlaWdodD0iMjg1MXB4IiB2ZXJzaW9uPSIxLjEiIHN0eWxlPSJzaGFwZS1yZW5kZXJpbmc6Z2VvbWV0cmljUHJlY2lzaW9uOyB0ZXh0LXJlbmRlcmluZzpnZW9tZXRyaWNQcmVjaXNpb247IGltYWdlLXJlbmRlcmluZzpvcHRpbWl6ZVF1YWxpdHk7IGZpbGwtcnVsZTpldmVub2RkOyBjbGlwLXJ1bGU6ZXZlbm9kZCINCnZpZXdCb3g9IjAgMCA4NDkgODM3Ig0KIHhtbG5zOnhsaW5rPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5L3hsaW5rIg0KIHhtbG5zOnhvZG09Imh0dHA6Ly93d3cuY29yZWwuY29tL2NvcmVsZHJhdy9vZG0vMjAwMyI+DQogPGRlZnM+DQogIDxzdHlsZSB0eXBlPSJ0ZXh0L2NzcyI+DQogICA8IVtDREFUQVsNCiAgICAuZmlsMCB7ZmlsbDojMjA5OUQ1O2ZpbGwtcnVsZTpub256ZXJvfQ0KICAgXV0+DQogIDwvc3R5bGU+DQogPC9kZWZzPg0KIDxnIGlkPSJMYXllcl94MDAyMF8xIj4NCiAgPG1ldGFkYXRhIGlkPSJDb3JlbENvcnBJRF8wQ29yZWwtTGF5ZXIiLz4NCiAgPHBhdGggY2xhc3M9ImZpbDAiIGQ9Ik03OTQgMzI1Yy0yOCwtMTYgLTYwLC0xOCAtODgsLTlsLTM2IC02MiAtOTYgLTE2NiAtMTkxIDAgLTcyIDBjLTEwLC00OSAtNTQsLTg2IC0xMDcsLTg2IC02MCwwIC0xMDksNDkgLTEwOSwxMDkgMCwzMiAxNCw2MSAzNiw4MWwtMzYgNjIgLTk2IDE2NiA5NiAxNjYgMzYgNjJjLTM3LDM0IC00OCw5MCAtMjEsMTM1IDMwLDUyIDk3LDcwIDE0OSw0MCAyOCwtMTYgNDYsLTQyIDUyLC03Mmw3MiAwIDE5MSAwIDk2IC0xNjYgMzYgLTYyYzQ4LDE2IDEwMiwtNCAxMjgsLTQ5IDMwLC01MiAxMiwtMTE5IC00MCwtMTQ5em0tNTUyIDMwMWMtMjMsLTggLTQ4LC05IC03MiwtMWwtMTE5IC0yMDYgMTE5IC0yMDZjMTEsNCAyMyw2IDM1LDYgMTMsMCAyNiwtMiAzNywtNmw0NiA4MGMtMTcsMTIgLTMxLDI4IC00Miw0NyAtNDAsNzAgLTIxLDE1OCA0MiwyMDZsLTQ2IDgwem0zMDcgODFsLTIzNyAwYy0yLC0xMSAtNiwtMjIgLTEzLC0zMyAtNiwtMTEgLTE1LC0yMSAtMjQsLTI5bDQ2IC04MGM3MywzMSAxNTksNCAxOTksLTY3IDExLC0xOSAxOCwtMzkgMjAsLTYwbDkyIDBjNCwyNCAxNiw0NiAzNSw2M2wtMTE5IDIwNnptOTYgLTM0MmMtNywxMSAtMTEsMjMgLTEzLDM1bC05MiAwYy02LC00OCAtMzMsLTkyIC03OCwtMTE4IC00NSwtMjYgLTk3LC0yNyAtMTQxLC05bC00NiAtODBjMTksLTE2IDMyLC0zNyAzNywtNjJsMjM3IDAgMTE5IDIwNmMtOSw4IC0xNiwxNyAtMjIsMjd6bTEyNSAtMzY1YzEzLDAgMjYsMyAzOSwxMCAxMyw3IDIyLDE2IDMwLDI5IDcsMTMgMTAsMjYgMTAsNDAgMCwxMyAtMywyNyAtMTAsMzkgLTcsMTIgLTE2LDIyIC0yOSwyOSAtMTIsNyAtMjUsMTAgLTM5LDEwIC0xNCwwIC0yNywtMyAtMzksLTEwIC0xMiwtNyAtMjIsLTE3IC0yOSwtMjkgLTcsLTEzIC0xMCwtMjYgLTEwLC0zOSAwLC0xNCA0LC0yNyAxMSwtNDAgNywtMTMgMTcsLTIyIDMwLC0yOSAxMywtNyAyNSwtMTAgMzksLTEwem0wIDEzYy0xMSwwIC0yMiwzIC0zMiw5IC0xMCw2IC0xOSwxNCAtMjUsMjQgLTYsMTAgLTksMjEgLTksMzMgMCwxMSAzLDIyIDksMzMgNiwxMCAxNCwxOSAyNCwyNCAxMCw2IDIxLDkgMzMsOSAxMSwwIDIyLC0zIDMzLC05IDEwLC02IDE5LC0xNCAyNCwtMjQgNiwtMTAgOSwtMjEgOSwtMzMgMCwtMTIgLTMsLTIyIC05LC0zMyAtNiwtMTEgLTE0LC0xOSAtMjUsLTI0IC0xMCwtNiAtMjEsLTkgLTMyLC05em0tMzUgMTA5bDAgLTg1IDI5IDBjMTAsMCAxNywxIDIyLDIgNSwyIDgsNCAxMSw4IDMsNCA0LDggNCwxMiAwLDYgLTIsMTIgLTcsMTYgLTQsNCAtMTAsNyAtMTgsOCAzLDEgNiwzIDcsNCAzLDMgOCw5IDEzLDE3bDEwIDE3IC0xNyAwIC03IC0xM2MtNiwtMTEgLTExLC0xNyAtMTQsLTIwIC0zLC0yIC02LC0zIC0xMSwtM2wtOCAwIDAgMzYgLTE0IDB6bTE0IC00OGwxNyAwYzgsMCAxMywtMSAxNiwtNCAzLC0yIDQsLTUgNCwtOSAwLC0zIC0xLC01IC0yLC03IC0xLC0yIC0zLC0zIC02LC00IC0yLC0xIC03LC0yIC0xNCwtMmwtMTYgMCAwIDI1eiIvPg0KIDwvZz4NCjwvc3ZnPg0K" style="width:72px;height:auto;opacity:.2;flex-shrink:0">
        <div>
          <h2 style="margin:0">${T('hello')}, ${currentUser.name.split(' ').pop()}! ${currentUser.avatar||''}</h2>
          <p style="margin:6px 0 0">${ROLE_DOCS[currentUser.role]==='ALL'?T('full_access')+' '+VDOCS.length+' '+T('docs_word')+'.':T('partial_access')+' '+accessibleDocs.length+T('of')+VDOCS.length+' '+T('docs_word')+'.'}</p>
        </div>
      </div>
    </div>
    <div class="stats-row">
      <div class="stat-card" style="cursor:pointer;border-left:3px solid #059669" onclick="showFilteredDocs('recent')"><div class="value" style="color:#059669">${ruCount}</div><div class="label">${lang==='en'?'Updated (30d)':'Cập nhật (30d)'}</div><div class="sub">${lang==='en'?'Last 30 days':'30 ngày qua'}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('approved')"><div class="value" style="color:#2e7d32">${approvedCount}</div><div class="label">${T('approved')}</div><div class="sub">${T('effective')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('draft')"><div class="value" style="color:#f57f17">${draftCount}</div><div class="label">${T('draft')}</div><div class="sub">${T('editing')}</div></div>
      <div class="stat-card" style="cursor:pointer;${r.approve&&reviewCount>0?'border:2px solid #f59e0b':''}" onclick="showFilteredDocs('review')"><div class="value" style="color:#d97706">${reviewCount}</div><div class="label">${T('in_review_label')}</div><div class="sub">${r.approve&&reviewCount>0?T('click_review'):T('pending_waiting')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('accessible')"><div class="value" style="color:#6366f1">${accessibleDocs.length}</div><div class="label">${T('accessible')}</div><div class="sub">${T('by_role')} ${lang==='en'?(r.labelEn||r.label):r.label}</div></div>
    </div>
    <div id="dash-pending">${pendingHtml}${draftsHtml}</div>

    <div class="card" style="margin-top:18px">
      <h3>🏭 ${lang==='en'?'Job Order Lifecycle — G0 → G6 (7 Gates)':'Vòng đời đơn hàng — G0 → G6 (7 cổng)'}</h3>
      <p style="margin:-8px 0 12px;color:var(--text-3);font-size:12px">${lang==='en'?'Quick access to SOPs, WIs and Forms for each quality gate. Material must PASS G1-IQC before production.':'Truy cập nhanh SOP, WI và biểu mẫu theo từng cổng kiểm soát. Vật liệu phải PASS G1-IQC trước khi đưa vào sản xuất.'}</p>
      <div style="display:flex;gap:6px;overflow-x:auto;padding:4px 0 8px">
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #4CAF50;background:#f8fdf8">
          <div style="font-weight:700;font-size:12px;color:#2e7d32;margin-bottom:4px">G0 — Contract</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'RFQ, order entry':'Xem xét RFQ, nhập đơn'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-SAL-001');return false" style="color:#0369a1">SOP-201</a> · <a href="#" onclick="navigateTo('documents','FRM');return false" style="color:#d97706">FRM-201</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #795548;background:#faf6f3">
          <div style="font-weight:700;font-size:12px;color:#4e342e;margin-bottom:4px">G1 — IQC</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Receiving, incoming QC':'Nhận hàng, kiểm tra đầu vào'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('WI-OPS-012');return false" style="color:#0369a1">WI-701</a> · <a href="#" onclick="openDoc('SOP-PUR-002');return false" style="color:#0369a1">SOP-402</a> · <a href="#" onclick="navigateTo('documents','FRM');return false" style="color:#d97706">FRM-701</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #2196F3;background:#f5f9ff">
          <div style="font-weight:700;font-size:12px;color:#1565c0;margin-bottom:4px">G2 — Setup</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Program, machine setup':'Phát hành CT, setup máy'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-ENG-001');return false" style="color:#0369a1">SOP-303</a> · <a href="#" onclick="openDoc('SOP-OPS-004');return false" style="color:#0369a1">SOP-504</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #FF9800;background:#fffbf0">
          <div style="font-weight:700;font-size:12px;color:#e65100;margin-bottom:4px">G3 — FAI</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'First article inspection':'Kiểm tra bài đầu tiên'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-ENG-002');return false" style="color:#0369a1">SOP-302</a> · <a href="#" onclick="navigateTo('documents','FRM');return false" style="color:#d97706">FRM-302</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #9C27B0;background:#fdf5ff">
          <div style="font-weight:700;font-size:12px;color:#7b1fa2;margin-bottom:4px">G4 — IPQC</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'In-process QC, SPC':'Kiểm soát trong quá trình'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-OPS-002');return false" style="color:#0369a1">SOP-502</a> · <a href="#" onclick="openDoc('SOP-QA-004');return false" style="color:#0369a1">SOP-604</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #00BCD4;background:#f0fdff">
          <div style="font-weight:700;font-size:12px;color:#00838f;margin-bottom:4px">G5 — Final QC</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Final inspection, packing':'Kiểm tra cuối, đóng gói'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-QA-005');return false" style="color:#0369a1">SOP-605</a> · <a href="#" onclick="openDoc('SOP-WHS-001');return false" style="color:#0369a1">SOP-701</a></div>
        </div>
        <div style="display:flex;align-items:center;color:#cbd5e1;font-size:18px;flex-shrink:0">→</div>
        <div style="flex:0 0 auto;min-width:130px;border:1px solid #e5e7eb;border-radius:8px;padding:10px;border-top:3px solid #F44336;background:#fff5f5">
          <div style="font-weight:700;font-size:12px;color:#c62828;margin-bottom:4px">G6 — Ship</div>
          <div style="font-size:10px;color:#666;margin-bottom:6px">${lang==='en'?'Shipment release, CoC':'Giao hàng, hoàn tất hồ sơ'}</div>
          <div style="font-size:10px"><a href="#" onclick="openDoc('SOP-QA-005');return false" style="color:#0369a1">SOP-605</a> · <a href="#" onclick="navigateTo('documents','FRM');return false" style="color:#d97706">FRM-705</a></div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="card">
        <h3>${T('quick_access')}</h3>
        <div class="quick-grid">
          ${CATEGORIES.filter(c=>!c.hidden&&VDOCS.some(d=>d.cat===c.id)).map(cat => {
            const cnt = VDOCS.filter(d=>d.cat===cat.id).length;
            const locked = !VDOCS.filter(d=>d.cat===cat.id).some(d=>canAccessDoc(d.code));
            return `<button class="quick-btn" style="border-left-color:${cat.color}" onclick="navigateTo('documents','${cat.id}')">
              <span class="q-icon">${cat.icon}</span>
              <div><div class="q-label">${catLabel(cat)}</div><div class="q-count">${cnt} ${T('docs_unit')}</div></div>
              ${locked?'<span class="lock">🔒</span>':''}
            </button>`;
          }).join('')}
        </div>
      </div>
      <div class="card">
        <h3>👤 ${lang==='en'?'By Role':'Theo vai trò'}</h3>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:12px">
          <div style="padding:8px 10px;border-left:3px solid #2196F3;border-radius:4px;background:#f5f9ff;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>CNC Operator</b> — SOP-502, SOP-504, WI-519</div>
          <div style="padding:8px 10px;border-left:3px solid #4CAF50;border-radius:4px;background:#f8fdf8;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>QC Inspector</b> — SOP-302, SOP-603, SOP-604, SOP-601</div>
          <div style="padding:8px 10px;border-left:3px solid #FF9800;border-radius:4px;background:#fffbf0;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>Team Leader / Foreman</b> — WI-202, SOP-501, Authority Matrix</div>
          <div style="padding:8px 10px;border-left:3px solid #9C27B0;border-radius:4px;background:#fdf5ff;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>Planner / Engineer</b> — SOP-501, SOP-303, ANNEX-115</div>
          <div style="padding:8px 10px;border-left:3px solid #0C2D48;border-radius:4px;background:#f0f4f8;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>Manager / Director</b> — SOP-902, WI-901, KPI Dictionary</div>
          <div style="padding:8px 10px;border-left:3px solid #00BCD4;border-radius:4px;background:#f0fdff;cursor:pointer" onclick="navigateTo('documents','SOP')"><b>IT / QMS Admin</b> — SOP-101, SOP-104, ANNEX-101</div>
        </div>
      </div>
    </div>

    <div class="grid-2" style="margin-top:18px">
      <div class="card">
        <h3>📊 ${T('system_overview')}</h3>
        <div style="font-size:12px;color:var(--text-2)">
          <div style="padding:10px 0;border-bottom:1px solid #f1f3f5"><b>Epicor Kinetic</b> — System of Record (transactions)<br><span style="color:var(--text-3)">Job, Dispatch, Time Entry, PO, Inventory</span></div>
          <div style="padding:10px 0;border-bottom:1px solid #f1f3f5"><b>M365 / SharePoint</b> — SSOT (evidence/records)<br><span style="color:var(--text-3)">${T('controlled_docs')}</span></div>
          <div style="padding:10px 0;border-bottom:1px solid #f1f3f5"><b>Quality Gates</b> — G0 → G6<br><span style="color:var(--text-3)">Hold/Release ${T('at_each_gate')}</span></div>
          <div style="padding:10px 0"><b>${T('standards')}</b> — ISO 9001:2015 • revision-ready<br><span style="color:var(--text-3)">CNC Semiconductor Grade</span></div>
        </div>
      </div>
      <div class="card">
        <h3>⚠️ ${lang==='en'?'System & Emergency':'Hệ thống & Khẩn cấp'}</h3>
        <div style="display:grid;gap:8px;font-size:12px">
          <div style="padding:10px 12px;border:1px solid #fee2e2;border-left:3px solid #ef4444;border-radius:6px;background:#fff5f5;cursor:pointer" onclick="openDoc('ANNEX-118')"><b>ANNEX-118</b> — Offline Fallback Kit<br><span style="color:#666">${lang==='en'?'Use when portal/ERP is down':'Dùng khi portal/ERP gián đoạn'}</span></div>
          <div style="padding:10px 12px;border:1px solid #fef3c7;border-left:3px solid #f59e0b;border-radius:6px;background:#fffbeb;cursor:pointer" onclick="openDoc('SOP-QMS-008')"><b>SOP-108</b> — Contingency Plan<br><span style="color:#666">${lang==='en'?'Operational contingency procedures':'Quy trình vận hành dự phòng'}</span></div>
          <div style="padding:10px 12px;border:1px solid #e5e7eb;border-left:3px solid #6366f1;border-radius:6px;background:#fafbff;cursor:pointer" onclick="openDoc('ANNEX-123')"><b>ANNEX-123</b> — Deputy / Backup Matrix<br><span style="color:#666">${lang==='en'?'Who replaces whom when absent':'Người thay thế khi vắng mặt'}</span></div>
        </div>
      </div>
    </div>`;
END OF OLD CODE — this block is inside a comment and never executes */
}

function renderDocuments(){
  const el = document.getElementById('page-documents');
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
  const treeNode = currentFilter !== 'ALL' ? getBestTreeNodeForCategory(currentFilter, catDocs) : null;
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
      ${CATEGORIES.filter(c=>!c.hidden&&VDOCS.some(d=>d.cat===c.id)).map(cat =>
        `<button class="filter-chip ${currentFilter===cat.id?'active':''}" onclick="currentFilter='${cat.id}';currentFolderPath=[];renderDocuments();renderSidebar()">${cat.icon} ${catLabel(cat).split('(')[0].trim()} (${VDOCS.filter(d=>d.cat===cat.id).length})</button>`
      ).join('')}
    </div>
    <input class="search-box" type="text" placeholder="${T('search_docs_ph')}" value="${searchQuery}" oninput="searchQuery=this.value;renderDocuments()">`;
}

// Render ALL docs view as category folder cards
function renderDocCategoryGrid(VDOCS){
  let html = `<div class="fm-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:16px;padding:16px 0">`;
  CATEGORIES.filter(c=>!c.hidden&&VDOCS.some(d=>d.cat===c.id)).forEach(cat => {
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
      <div class="fm-file-row ${locked?'locked':''}" ${locked?'':`onclick="openDoc('${doc.code}')"`} ${dragAttr} oncontextmenu="event.preventDefault();event.stopPropagation();openDocEditMenu(event,'${escapeHtml(doc.code)}','${escapeHtml(doc.title)}')" data-doc-code="${doc.code}">
        <div class="fm-file-icon" style="border-color:${cat?cat.color:'#a5b4fc'}">${getDocIcon(doc.code)}</div>
        <div class="fm-file-name">
          <span style="color:${cat?cat.color:'#64748b'}">${doc.code}</span>
          <small>${displayTitle}</small>
          ${displayDesc?`<small class="fm-doc-desc">${displayDesc}</small>`:''}
        </div>
        <div class="fm-file-rev">v${getDocRevision(doc)}</div>
        <div class="fm-file-status"><span style="padding:2px 8px;border-radius:8px;font-size:10px;font-weight:600;background:${statusColor(getDocStatus(doc))}15;color:${statusColor(getDocStatus(doc))}">${statusLabel(getDocStatus(doc))}</span></div>
        <div class="fm-file-access">${locked?'<span style="color:var(--red)">🔒</span>':'<span style="color:var(--green)">✓</span>'}</div>
        ${folderEditMode&&canCreateNewDoc()?`<div class="fm-file-del"><button class="fm-del-btn-row" onclick="event.stopPropagation();confirmDeleteDoc('${escapeHtml(doc.code)}','${escapeHtml(doc.title)}')" title="${lang==='en'?'Delete':'Xóa'}">🗑️</button></div>`:''}
      </div>`;
  });
  html += `</div>`;
  return html;
}

// ═══ EDIT MODE: Folder creation dialog ═══
function openCreateFolderDialog(){
  // Auto-compute next folder number
  const treeNode = getBestTreeNodeForCategory(currentFilter, DOCS.filter(d=>d.cat===currentFilter));
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, DOCS.filter(d=>d.cat===currentFilter));
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
  const treeNode = getBestTreeNodeForCategory(currentFilter, DOCS.filter(d=>d.cat===currentFilter));
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, DOCS.filter(d=>d.cat===currentFilter));
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
  const treeNode = getBestTreeNodeForCategory(currentFilter, DOCS.filter(d=>d.cat===currentFilter));
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, DOCS.filter(d=>d.cat===currentFilter));
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
        <label>${lang==='en'?'Title':'Tiêu đề'}</label>
        <input id="qc-title" type="text" placeholder="${lang==='en'?'Document title':'Tên tài liệu'}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px">
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
  try {
    const res = await apiCall('doc_create', {code, title, cat, owner, folder, revision:'0.0'});
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

function openDocEditMenu(event, code, title){
  event.stopPropagation();
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const menu = document.createElement('div');
  menu.className = 'fm-context-menu';
  menu.style.cssText = `position:fixed;top:${event.clientY}px;left:${event.clientX}px;z-index:9999;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:6px 0;min-width:180px`;
  const vi=lang!=='en';
  menu.innerHTML = `
    <div class="ctx-item" onclick="openDoc('${escapeHtml(code)}')">📄 ${vi?'Mở tài liệu':'Open document'}</div>
    <div class="ctx-item" onclick="openDocEditDialog('${escapeHtml(code)}','${escapeHtml(title)}')">✏️ ${vi?'Chỉnh sửa thông tin':'Edit info'}</div>
    ${canCreateNewDoc()?`<div style="border-top:1px solid #f1f3f5;margin:4px 0"></div><div class="ctx-item ctx-danger" onclick="confirmDeleteDoc('${escapeHtml(code)}','${escapeHtml(title)}')">🗑️ ${vi?'Xóa tài liệu':'Delete document'}</div>`:''}
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
function openDocEditDialog(code, title){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const desc = getDocDesc(code);
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
          <label>${lang==='en'?'Standard title / file name':'Tên file / tiêu đề chuẩn'}</label>
          <input id="de-title" type="text" value="${escapeHtml(title)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'Vietnamese description':'Mô tả tiếng Việt'}</label>
          <textarea id="de-desc" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;font-size:13px" placeholder="${lang==='en'?'Brief Vietnamese description':'Mô tả ngắn bằng tiếng Việt'}">${escapeHtml(desc)}</textarea>
        </div>

        <div style="margin-top:8px;font-size:10px;color:var(--text-3)">⚠️ ${lang==='en'?'Portal layout follows Code → English standard title → Vietnamese description. Renaming updates all cross-references automatically.':'Portal hiển thị theo thứ tự Mã tài liệu → tên file chuẩn tiếng Anh → mô tả tiếng Việt. Đổi mã/tiêu đề sẽ cập nhật tất cả tham chiếu chéo tự động.'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" onclick="document.getElementById('doc-edit-modal')?.remove()">${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="doSaveDocEdit('${escapeHtml(code)}')">💾 ${lang==='en'?'Save':'Lưu'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

async function doSaveDocEdit(oldCode){
  const newCode = (document.getElementById('de-code')?.value||'').trim();
  const newTitle = (document.getElementById('de-title')?.value||'').trim();
  const desc = (document.getElementById('de-desc')?.value||'').trim();

  // Save doc description
  if(desc !== getDocDesc(oldCode)){
    DOC_DESCS[oldCode] = desc;
    try{ await apiCall('save_doc_description', {code: oldCode, description: desc}); }catch(e){}
  }

  // Rename if changed
  if(newCode && (newCode !== oldCode || newTitle)){
    try {
      const res = await apiCall('rename_doc', {old_code: oldCode, new_code: newCode, new_title: newTitle});
      if(res && res.ok){
        showToast(`✅ ${lang==='en'?'Saved':'Đã lưu'}`);
        document.getElementById('doc-edit-modal')?.remove();
        await rescanDocs(); renderDocuments(); renderSidebar();
        if(currentDoc && (currentDoc===oldCode || currentDoc===newCode)){
          try{ await openDocPreview(newCode || oldCode); }catch(e){}
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
      <div class="modal-header" style="background:#fef2f2;border-bottom:1px solid #fecaca">
        <h3 style="color:#dc2626;font-size:16px;display:flex;align-items:center;gap:8px">🗑️ ${vi?'Xóa tài liệu':'Delete Document'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">✕</button>
      </div>
      <div style="padding:20px">
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-bottom:16px;display:flex;gap:10px;align-items:start">
          <span style="font-size:20px;flex-shrink:0">⚠️</span>
          <div style="font-size:13px;color:#92400e;line-height:1.5">
            ${vi?'Bạn đang xóa tài liệu:':'You are about to delete:'}
            <div style="margin-top:6px;font-weight:700;color:#1e293b">${code} — ${title||'(untitled)'}</div>
            <div style="margin-top:8px;font-size:12px;color:#78716c">${vi?'Tài liệu sẽ được chuyển vào thư mục <b>_Deleted</b> và có thể khôi phục bởi Admin.':'The document will be moved to <b>_Deleted</b> folder and can be recovered by Admin.'}</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:#dc2626;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:#dc2626">
            ${vi?'Tôi xác nhận muốn xóa tài liệu này':'I confirm I want to delete this document'}
          </label>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Hủy':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:#dc2626;color:#fff;opacity:.5;cursor:not-allowed" onclick="executeDeleteDoc('${escapeHtml(code)}')">🗑️ ${vi?'Xóa vĩnh viễn':'Delete'}</button>
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
  const treeNode=getBestTreeNodeForCategory(currentFilter, DOCS.filter(d=>d.cat===currentFilter));
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
      <div class="modal-header" style="background:#fef2f2;border-bottom:1px solid #fecaca">
        <h3 style="color:#dc2626;font-size:16px;display:flex;align-items:center;gap:8px">🗑️ ${vi?'Xóa folder':'Delete Folder'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">✕</button>
      </div>
      <div style="padding:20px">
        <div style="background:#fff7ed;border:1px solid #fed7aa;border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="display:flex;gap:10px;align-items:start">
            <span style="font-size:20px;flex-shrink:0">⚠️</span>
            <div style="font-size:13px;color:#92400e;line-height:1.5">
              ${vi?'Bạn đang xóa folder:':'You are about to delete folder:'}
              <div style="margin-top:6px;font-weight:700;color:#1e293b;font-size:15px">📁 ${label}</div>
              <div style="margin-top:4px;font-size:11px;color:#a8a29e;font-family:monospace">${folderPath}</div>
            </div>
          </div>
          ${fileCount>0||subCount>0?`
          <div style="margin-top:12px;padding:10px;background:#fef2f2;border:1px solid #fecaca;border-radius:6px">
            <div style="font-size:12px;color:#dc2626;font-weight:600">${vi?'⚠️ Cảnh báo: Folder này chứa dữ liệu!':'⚠️ Warning: This folder contains data!'}</div>
            <div style="font-size:12px;color:#991b1b;margin-top:4px">${fileCount>0?`• ${fileCount} ${vi?'tài liệu':'document(s)'}`:''} ${subCount>0?`• ${subCount} ${vi?'folder con':'subfolder(s)'}`:''}</div>
            <div style="font-size:11px;color:#78716c;margin-top:4px">${vi?'Tất cả sẽ được chuyển vào _Deleted':'All will be moved to _Deleted'}</div>
          </div>`:''}
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:#dc2626;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:#dc2626">
            ${vi?'Tôi xác nhận muốn xóa folder này':'I confirm I want to delete this folder'}
          </label>
        </div>
        ${fileCount>0?`
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:#dc2626;display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check2" style="width:16px;height:16px;accent-color:#dc2626">
            ${vi?'Tôi hiểu rằng '+fileCount+' tài liệu bên trong cũng sẽ bị xóa':'I understand that '+fileCount+' documents inside will also be deleted'}
          </label>
        </div>`:''}
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Hủy':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:#dc2626;color:#fff;opacity:.5;cursor:not-allowed" onclick="executeDeleteFolder('${escapeHtml(folderPath)}')">🗑️ ${vi?'Xóa folder':'Delete folder'}</button>
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
function openDocContextMenu(event, code, title){ openDocEditMenu(event, code, title); }

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
function openRenameDocDialog(code, title){ openDocEditDialog(code, title); }

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
  MAN:'02-Tai-Lieu-He-Thong/01-Quality-Manual',
  POL:'02-Tai-Lieu-He-Thong/02-Policies-Objectives',
  ORG:'02-Tai-Lieu-He-Thong/03-Organization',
  SOP:'03-Tai-Lieu-Van-Hanh/01-SOPs',
  WI:'03-Tai-Lieu-Van-Hanh/02-Work-Instructions',
  ANNEX:'03-Tai-Lieu-Van-Hanh/03-Reference',
  FRM:'04-Bieu-Mau',
  TRN:'10-Training-Academy',
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

  if(revision && !/^\d+(?:\.\d+)?$/.test(revision)){
    showToast(lang==='en'?'⚠ Invalid version (e.g., 0.0, 1.0, 1.1)':'⚠ Phiên bản không hợp lệ (ví dụ: 0.0, 1.0, 1.1)');
    return;
  }

  if(DOCS.find(d=>d.code===code.toUpperCase())){
    showToast(lang==='en'?'⚠ Code already exists':'⚠ Mã đã tồn tại');
    return;
  }

  try{
    const res=await apiCall('doc_create',{code,title,cat,owner,folder,revision});
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
      const resp = await fetch('../11-Glossary/dict-data.json');
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
    .replace(/đ/g, 'd')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
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

  const fields = [
    { key: 'term', value: normalizeDictionarySearchText(item.term), weight: 1200 },
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
              ${d.vi && d.vi !== d.term ? `<div class="dict-vi">${highlightMatch(d.vi, dictQuery)}</div>` : ''}
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
  return text.replace(new RegExp('('+escaped+')','gi'),'<mark style="background:#fff9c4;padding:0 2px;border-radius:2px">$1</mark>');
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
    <div class="modal-field"><label>${lang==='en'?'Meaning / short':'Ý nghĩa / ngắn gọn'}</label><input id="dm-meaning" value="${existing?escapeHtml(existing.meaning||''):''}"></div>
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
  const meaning = (document.getElementById('dm-meaning').value||'').trim();
  const cat = (document.getElementById('dm-cat').value||'General').trim();
  const def = (document.getElementById('dm-def').value||'').trim();
  const ctx = (document.getElementById('dm-ctx').value||'').trim();
  const rec = (document.getElementById('dm-rec').value||'').trim();

  if(!term){ alert(lang==='en'?'Term is required':'Cần nhập thuật ngữ'); return; }
  if(!def){ alert(lang==='en'?'Definition is required':'Cần nhập định nghĩa'); return; }

  try{
    const res = await apiCall('dict_upsert',{term,vi,meaning,cat,def,ctx,rec,originalTerm});
    if(!(res && res.ok)){
      showToast((res && res.error)?('⚠ '+res.error):(lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại'));
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
  const label = collapsed ? 'M\u1edf r\u1ed9ng menu' : 'Thu g\u1ecdn menu';
  toggleBtn.setAttribute('aria-label', label);
  toggleBtn.setAttribute('title', label);
  toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
  toggleText.textContent = collapsed ? 'M\u1edf r\u1ed9ng' : 'Thu g\u1ecdn';
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

function showToast(msg, duration=2500){
  const t=document.createElement('div');
  t.className='toast';
  t.textContent=msg;
  document.body.appendChild(t);
  setTimeout(()=>{t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(()=>t.remove(),300);},duration);
}

function closeGitSyncModal(){
  document.getElementById('git-sync-modal')?.remove();
}

function gitSyncShortHash(hash){
  const raw = String(hash||'').trim();
  return raw ? raw.slice(0,7) : '—';
}

function gitSyncStatusTone(status){
  const raw = String(status||'').toUpperCase();
  if(raw.startsWith('A') || raw === '??') return 'is-add';
  if(raw.startsWith('D')) return 'is-delete';
  if(raw.startsWith('R')) return 'is-rename';
  if(raw.startsWith('M')) return 'is-modify';
  return 'is-neutral';
}

function gitSyncEscapeLines(text){
  return escapeHtml(String(text||'').trim());
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

function gitSyncRenderChangedFileTable(items, emptyText){
  const rows = Array.isArray(items) ? items.filter(Boolean) : [];
  if(!rows.length){
    return `<div class="git-sync-empty">${escapeHtml(emptyText)}</div>`;
  }
  return `
    <div class="git-sync-table-wrap">
      <table class="git-sync-table">
        <thead>
          <tr>
            <th>${lang==='en'?'Change':'Thay đổi'}</th>
            <th>${lang==='en'?'Current path':'Đường dẫn hiện tại'}</th>
            <th>${lang==='en'?'Previous path':'Đường dẫn cũ'}</th>
          </tr>
        </thead>
        <tbody>
          ${rows.map(row=>{
            const status = String(row.status || '').trim() || '--';
            const path = String(row.path || '').trim();
            const oldPath = String(row.old_path || '').trim();
            return `<tr>
              <td><span class="git-sync-status ${gitSyncStatusTone(status)}">${escapeHtml(status)}</span></td>
              <td><code>${escapeHtml(path)}</code></td>
              <td>${oldPath ? `<code>${escapeHtml(oldPath)}</code>` : '<span class="git-sync-empty-inline">—</span>'}</td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>`;
}

function gitSyncRenderOutputBlock(title, text){
  const clean = String(text||'').trim();
  if(!clean) return '';
  return `
    <section class="git-sync-section">
      <div class="git-sync-section-title">${escapeHtml(title)}</div>
      <pre class="git-sync-pre">${gitSyncEscapeLines(clean)}</pre>
    </section>`;
}

function gitSyncRenderSummaryCard(label, value){
  return `<div class="git-sync-card-mini"><div class="git-sync-card-label">${escapeHtml(label)}</div><div class="git-sync-card-value">${escapeHtml(value)}</div></div>`;
}

function gitSyncRenderPresyncSection(presync){
  if(!presync || typeof presync !== 'object') return '';
  const pushed = !!presync.pushed;
  const files = Array.isArray(presync.files) ? presync.files : [];
  const statusEntries = Array.isArray(presync.status_entries) ? presync.status_entries : [];
  const hasAnything = pushed || files.length || statusEntries.length || String(presync.commit_output||'').trim() || String(presync.push_output||'').trim();
  if(!hasAnything) return '';
  return `
    <section class="git-sync-section">
      <div class="git-sync-section-title">${lang==='en'?'Auto pre-sync before pull':'Auto pre-sync trước khi pull'}</div>
      <div class="git-sync-callout">
        ${pushed
          ? (lang==='en'
            ? 'Portal detected meaningful local server changes, committed them, and pushed them to GitHub before pulling.'
            : 'Portal phát hiện thay đổi meaningful trên server, đã commit và đẩy chúng lên GitHub trước khi pull.')
          : (lang==='en'
            ? 'No meaningful local server change needed a pre-sync commit before pull.'
            : 'Không có thay đổi meaningful trên server cần pre-sync commit trước khi pull.')}
      </div>
      <div class="git-sync-summary-grid git-sync-summary-grid--compact">
        ${gitSyncRenderSummaryCard(lang==='en'?'Branch':'Nhánh', String(presync.branch || 'main'))}
        ${gitSyncRenderSummaryCard(lang==='en'?'Files':'Số file', String(files.length))}
        ${gitSyncRenderSummaryCard(lang==='en'?'Before':'Trước', gitSyncShortHash(presync.head_before))}
        ${gitSyncRenderSummaryCard(lang==='en'?'After':'Sau', gitSyncShortHash(presync.head_after))}
      </div>
      ${gitSyncRenderSimpleFileTable(files.map(path=>({status:'SYNC', path})), lang==='en'?'No meaningful file was auto-pushed before pull.':'Không có file meaningful nào được auto-push trước khi pull.')}
      ${gitSyncRenderOutputBlock(lang==='en'?'Pre-sync commit output':'Log commit pre-sync', presync.commit_output)}
      ${gitSyncRenderOutputBlock(lang==='en'?'Pre-sync push output':'Log push pre-sync', presync.push_output)}
    </section>`;
}

function openGitSyncReportModal(kind, res){
  closeGitSyncModal();
  const isPull = kind === 'pull';
  const branch = String((res && res.branch) || 'main');
  const files = Array.isArray(res && res.files) ? res.files : [];
  const statusEntries = Array.isArray(res && res.status_entries) ? res.status_entries : [];
  const changedFiles = Array.isArray(res && res.changed_files) ? res.changed_files : [];
  const pushed = !!(res && res.pushed);
  const pulled = !!(res && res.pulled);
  const beforeHead = String((res && (res.before_head || res.head_before)) || '');
  const afterHead = String((res && (res.after_head || res.head_after)) || '');
  const title = isPull
    ? (lang==='en' ? 'Pull Detail' : 'Chi tiết Pull')
    : (lang==='en' ? 'Push Detail' : 'Chi tiết Push');
  const kicker = isPull ? 'GitHub -> Portal' : 'Portal -> GitHub';
  const summaryCards = isPull
    ? [
        gitSyncRenderSummaryCard(lang==='en'?'Branch':'Nhánh', branch),
        gitSyncRenderSummaryCard(lang==='en'?'Changed files':'File thay đổi', String(changedFiles.length)),
        gitSyncRenderSummaryCard(lang==='en'?'From':'Từ commit', gitSyncShortHash(beforeHead)),
        gitSyncRenderSummaryCard(lang==='en'?'To':'Đến commit', gitSyncShortHash(afterHead)),
      ].join('')
    : [
        gitSyncRenderSummaryCard(lang==='en'?'Branch':'Nhánh', branch),
        gitSyncRenderSummaryCard(lang==='en'?'Committed files':'File commit', String(files.length)),
        gitSyncRenderSummaryCard(lang==='en'?'Before':'Trước', gitSyncShortHash(beforeHead)),
        gitSyncRenderSummaryCard(lang==='en'?'After':'Sau', gitSyncShortHash(afterHead)),
      ].join('');

  const bodySections = isPull
    ? `
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Pull summary':'Tóm tắt pull'}</div>
        <div class="git-sync-callout">${escapeHtml(String(res && res.message || (pulled ? 'Portal updated.' : 'Already up to date.')))}</div>
      </section>
      ${gitSyncRenderPresyncSection(res && res.presync)}
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Files applied to portal':'Danh sách file áp dụng xuống portal'}</div>
        ${gitSyncRenderChangedFileTable(changedFiles, lang==='en'?'No remote file change was applied in this pull.':'Không có file remote nào được áp xuống trong lần pull này.')}
      </section>
      ${gitSyncRenderOutputBlock(lang==='en'?'Fetch output':'Log fetch', res && res.fetch_output)}
      ${gitSyncRenderOutputBlock(lang==='en'?'Pull output':'Log pull', res && res.pull_output)}
    `
    : `
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Push summary':'Tóm tắt push'}</div>
        <div class="git-sync-callout">${escapeHtml(String(res && res.message || (pushed ? 'Changes pushed.' : 'Nothing to sync.')))}</div>
      </section>
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Detected meaningful changes before commit':'Các thay đổi meaningful được phát hiện trước khi commit'}</div>
        ${gitSyncRenderSimpleFileTable(statusEntries, lang==='en'?'No meaningful file was detected for a new commit.':'Không phát hiện file meaningful nào để tạo commit mới.')}
      </section>
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Files included in push':'Danh sách file đi cùng lần push'}</div>
        ${gitSyncRenderSimpleFileTable(files.map(path=>({status:'SYNC', path})), lang==='en'?'No new file was included in this push.':'Không có file mới nào nằm trong lần push này.')}
      </section>
      ${gitSyncRenderOutputBlock(lang==='en'?'Commit output':'Log commit', res && res.commit_output)}
      ${gitSyncRenderOutputBlock(lang==='en'?'Push output':'Log push', res && res.push_output)}
    `;

  const primaryButton = isPull
    ? `<button class="btn-admin primary" onclick="adminReloadLatestPortal()">${lang==='en'?(pulled?'OK - reload latest portal':'OK - refresh portal'):(pulled?'OK - tải lại portal mới nhất':'OK - làm mới portal')}</button>`
    : '';

  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(kicker)}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">✕</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid">${summaryCards}</div>
        ${bodySections}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en'?'Close':'Đóng'}</button>
        ${primaryButton}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

async function adminReloadLatestPortal(){
  closeGitSyncModal();
  showToast(lang==='en' ? 'Refreshing portal with cache-busting…' : 'Đang nạp lại portal với cache-busting…', 2200);
  try{
    await apiCall('admin_clear_site_cache', {}, 'POST', 15000);
  }catch(e){}
  try{
    if(typeof caches !== 'undefined' && caches && typeof caches.keys === 'function'){
      const keys = await caches.keys();
      await Promise.all(keys.map(key => caches.delete(key).catch(()=>false)));
    }
  }catch(e){}
  try{
    if(navigator.serviceWorker && typeof navigator.serviceWorker.getRegistrations === 'function'){
      const regs = await navigator.serviceWorker.getRegistrations();
      await Promise.all((regs || []).map(reg => reg.update().catch(()=>null)));
    }
  }catch(e){}
  const url = new URL(window.location.href, window.location.origin);
  url.searchParams.set('_portal_sync_reload', String(Date.now()));
  window.location.replace(url.toString());
}

async function adminSaveAll(){
  // Local saves (client-side)
  saveRoleDocsToStorage();
  savePermOverrides();
  saveUsersToStorage();
  saveDepartments();
  saveTitles();
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
  }catch(e){
    showToast(lang==='en'?'⚠ Save failed':'⚠ Lưu thất bại');
    return;
  }

  adminUnsaved = false;
  showToast(lang==='en'?'✅ All changes saved successfully':'✅ Đã lưu tất cả thay đổi thành công');
  renderAdmin();
}

let gitSyncBusyMode = '';

function isGitSyncBusy(){
  return gitSyncBusyMode === 'pull' || gitSyncBusyMode === 'push';
}

function adminGitSyncIcon(kind){
  if(kind === 'pull'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 4v12"></path><path d="m7 11 5 5 5-5"></path><path d="M5 19h14"></path></svg>';
  }
  if(kind === 'push'){
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20V8"></path><path d="m7 13 5-5 5 5"></path><path d="M5 5h14"></path></svg>';
  }
  return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12a8 8 0 0 1 13.66-5.66L20 8"></path><path d="M20 4v4h-4"></path><path d="M20 12a8 8 0 0 1-13.66 5.66L4 16"></path><path d="M4 20v-4h4"></path></svg>';
}

function adminGitPushErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_sync_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'staged_changes_present'){
    return lang==='en'
      ? 'There are staged meaningful changes on the server already. Review them before using Git sync.'
      : 'Server đang có thay đổi đã stage sẵn. Hãy commit hoặc unstage trong Terminal trước khi dùng nút đồng bộ Git.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot run git commands.'
      : 'Hosting đang chặn PHP exec nên portal không thể chạy lệnh git.';
  }
  if(error === 'git_push_failed'){
    return lang==='en'
      ? 'Git push failed. Please verify the server can push to GitHub with SSH key or token.'
      : 'Git push thất bại. Hãy kiểm tra server đã cấu hình SSH key hoặc token để đẩy lên GitHub chưa.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'Thư mục portal trên server này không sẵn sàng như một repo git.';
  }
  if(error === 'git_sync_failed' && detail){
    return detail;
  }
  return detail || (lang==='en' ? 'Git sync failed' : 'Đồng bộ Git thất bại');
}

function adminGitPullErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_pull_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'working_tree_dirty' || error === 'staged_changes_present'){
    return lang==='en'
      ? 'The cPanel repository still has meaningful local changes after runtime auto-clean. Review them before pulling from Git.'
      : 'Repo trên cPanel vẫn còn thay đổi local. Hãy commit hoặc bỏ các thay đổi đó trong Terminal trước khi pull từ Git.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot run git commands.'
      : 'Hosting đang chặn PHP exec nên portal không thể chạy lệnh git.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'Git pull failed. Please verify the cPanel server can access the remote repository.'
      : 'Git pull thất bại. Hãy kiểm tra server cPanel có quyền truy cập remote repository.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'Thư mục portal trên server này không sẵn sàng như một repo git.';
  }
  return detail || (lang==='en' ? 'Git pull failed' : 'Git pull thất bại');
}

function adminGitExtractDetailPaths(detail){
  const text = String(detail||'').trim();
  if(!text) return [];
  const found = [];
  const pushUnique = value => {
    const clean = String(value||'').trim().replace(/^['"]|['"]$/g,'');
    if(!clean) return;
    if(!found.includes(clean)) found.push(clean);
  };
  const listPatterns = [
    /(?:^|:\s)(?:working_tree_dirty|staged_changes_present):\s*(.+)$/i,
    /(?:^|:\s)(?:git_presync_failed):\s*(?:working_tree_dirty|staged_changes_present):\s*(.+)$/i,
  ];
  listPatterns.forEach(pattern => {
    const match = text.match(pattern);
    if(match && match[1]){
      match[1].split(',').forEach(part => pushUnique(part));
    }
  });
  Array.from(text.matchAll(/pathspec '([^']+)'/g)).forEach(match => pushUnique(match[1]));
  return found.filter(path => /[\/\\]/.test(path) || /\.[A-Za-z0-9_-]+$/.test(path));
}

function adminGitErrorGuidance(kind, res){
  const error = (res && res.error) ? String(res.error) : '';
  if(error === 'working_tree_dirty' || error === 'staged_changes_present'){
    return lang==='en'
      ? 'Review the listed files first. If those edits are valid, use Push to Git or commit them in Terminal. If they are wrong or temporary, discard them before pulling.'
      : 'Hãy rà soát các file đang được liệt kê. Nếu đó là thay đổi hợp lệ, dùng Push to Git hoặc commit trong Terminal. Nếu là thay đổi tạm/sai, hãy bỏ chúng trước khi pull.';
  }
  if(error === 'git_push_failed'){
    return lang==='en'
      ? 'The server could not push to GitHub. Check SSH access, remote URL, and whether origin/main has newer commits that require fetch/rebase first.'
      : 'Server không thể đẩy lên GitHub. Hãy kiểm tra SSH, remote URL và xem origin/main có commit mới hơn cần fetch/rebase trước hay không.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'The server could not fetch or pull from the remote. Verify network access, SSH key, and remote branch state.'
      : 'Server không thể fetch hoặc pull từ remote. Hãy kiểm tra kết nối mạng, SSH key và trạng thái nhánh remote.';
  }
  if(error === 'git_add_failed'){
    return lang==='en'
      ? 'Git could not stage one or more paths. This usually means the path no longer exists or was renamed. Rescan the document index, then try again.'
      : 'Git không thể stage một hoặc nhiều đường dẫn. Trường hợp này thường do file đã đổi tên hoặc không còn tồn tại. Hãy quét lại danh mục tài liệu rồi thử lại.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'Hosting is blocking PHP exec, so portal buttons cannot run git commands. Terminal or hosting configuration is required.'
      : 'Hosting đang chặn PHP exec nên các nút trên portal không thể chạy lệnh git. Cần dùng Terminal hoặc mở cấu hình hosting.';
  }
  return kind === 'pull'
    ? (lang==='en'
      ? 'Review the raw server detail below to decide whether this is a repository state issue, a remote access issue, or a path mismatch.'
      : 'Hãy xem log chi tiết bên dưới để xác định đây là lỗi trạng thái repo, lỗi truy cập remote hay lỗi không khớp đường dẫn.')
    : (lang==='en'
      ? 'Review the raw server detail below to decide whether this is a staging issue, a commit issue, or a GitHub push issue.'
      : 'Hãy xem log chi tiết bên dưới để xác định đây là lỗi stage, lỗi commit hay lỗi đẩy lên GitHub.');
}

function openGitSyncErrorModal(kind, res){
  closeGitSyncModal();
  const isPull = kind === 'pull';
  const branch = String((res && res.branch) || 'main');
  const detail = String((res && res.detail) || '').trim();
  const errorCode = String((res && res.error) || (isPull ? 'git_pull_failed' : 'git_sync_failed')).trim();
  const paths = adminGitExtractDetailPaths(detail);
  const title = isPull
    ? (lang==='en' ? 'Pull Failed' : 'Pull thất bại')
    : (lang==='en' ? 'Push Failed' : 'Push thất bại');
  const summary = isPull ? adminGitPullErrorMessage(res) : adminGitPushErrorMessage(res);
  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal is-error">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(isPull ? 'GitHub -> Portal' : 'Portal -> GitHub')}</div>
          <h3>${escapeHtml(title)}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">✕</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid git-sync-summary-grid--compact">
          ${gitSyncRenderSummaryCard(lang==='en'?'Branch':'Nhánh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en'?'Error code':'Mã lỗi', errorCode || '—')}
          ${gitSyncRenderSummaryCard(lang==='en'?'Paths found':'Path nhận diện', String(paths.length))}
          ${gitSyncRenderSummaryCard(lang==='en'?'Time':'Thời gian', String((res && res.server_time) || '—'))}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Readable summary':'Tóm tắt dễ hiểu'}</div>
          <div class="git-sync-callout is-error">${escapeHtml(summary)}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Recommended handling':'Hướng xử lý đề nghị'}</div>
          <div class="git-sync-callout">${escapeHtml(adminGitErrorGuidance(kind, res))}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Detected paths from server detail':'Các path nhận diện từ log server'}</div>
          ${gitSyncRenderSimpleFileTable(paths.map(path=>({status:'PATH', path})), lang==='en'?'No specific path could be extracted from the server detail.':'Không trích xuất được path cụ thể nào từ log server.')}
        </section>
        ${gitSyncRenderOutputBlock(lang==='en'?'Raw server detail':'Chi tiết lỗi gốc từ server', detail || errorCode)}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en'?'Close':'Đóng'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

async function adminSyncDocsToGit(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const msg = lang==='en'
    ? 'Push allowed document changes from this cPanel server to Git now? Runtime files such as sessions and rate limits will be ignored.'
    : 'Đẩy ngay các thay đổi tài liệu được cho phép từ server cPanel này lên Git? Các file runtime như sessions và rate limit sẽ bị bỏ qua.';
  if(!confirm(msg)) return;

  gitSyncBusyMode = 'push';
  renderAdmin();
  try{
    const res = await apiCall('admin_git_sync', {});
    if(!(res && res.ok)){
      openGitSyncErrorModal('push', res || {error:'git_sync_failed', detail:''});
      return;
    }
    openGitSyncReportModal('push', res);
  }catch(e){
    openGitSyncErrorModal('push', {
      error:'git_sync_failed',
      detail:(e && e.message) ? String(e.message) : '',
      server_time:new Date().toISOString()
    });
  }finally{
    gitSyncBusyMode = '';
    if(currentPage === 'admin') renderAdmin();
  }
}

async function adminPullPortalFromGit(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const msg = lang==='en'
    ? 'Pull the latest commit from Git into this cPanel portal now? The system will auto-clean runtime noise, try to pre-sync meaningful server-side document changes, then run fast-forward update.'
    : 'Kéo commit mới nhất từ Git xuống portal trên cPanel ngay bây giờ? Hệ thống sẽ tự dọn runtime noise, thử pre-sync thay đổi meaningful trên server, rồi mới fast-forward cập nhật.';
  if(!confirm(msg)) return;

  gitSyncBusyMode = 'pull';
  renderAdmin();
  try{
    const res = await apiCall('admin_git_pull', {});
    if(!(res && res.ok)){
      openGitSyncErrorModal('pull', res || {error:'git_pull_failed', detail:''});
      return;
    }
    openGitSyncReportModal('pull', res);
  }catch(e){
    openGitSyncErrorModal('pull', {
      error:'git_pull_failed',
      detail:(e && e.message) ? String(e.message) : '',
      server_time:new Date().toISOString()
    });
  }finally{
    gitSyncBusyMode = '';
    if(currentPage === 'admin') renderAdmin();
  }
}

function renderAdminSyncPanel(){
  const pullBusy = gitSyncBusyMode === 'pull';
  const pushBusy = gitSyncBusyMode === 'push';
  const disablePull = isGitSyncBusy() && !pullBusy;
  const disablePush = isGitSyncBusy() && !pushBusy;

  return `
    <section class="admin-sync-strip">
      <div class="admin-sync-head">
        <div class="admin-sync-title-wrap">
          <div class="admin-sync-kicker">${lang==='en'?'Sync Control':'Điều khiển đồng bộ'}</div>
          <h3>${lang==='en'?'Portal Data Synchronization':'Đồng bộ dữ liệu portal'}</h3>
          <p>${lang==='en'?'Use Pull to auto-clean runtime noise, pre-sync meaningful portal-side changes when needed, and update cPanel from Git. Use Push when you want to explicitly publish meaningful server-side changes back to GitHub.':'Dùng Pull để tự dọn runtime, pre-sync các thay đổi meaningful trên portal khi cần, rồi cập nhật cPanel từ Git. Dùng Push khi muốn chủ động xuất bản các thay đổi meaningful trên server lên GitHub.'}</p>
        </div>
        <button class="admin-sync-mini" onclick="rescanDocs().then(n=>{showToast('🔄 Scanned: '+n+' docs');renderAdmin()})">
          <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
          <span>${lang==='en'?'Rescan folders':'Quét lại thư mục'}</span>
        </button>
      </div>
      <div class="admin-sync-grid">
        <button class="admin-sync-card is-pull ${pullBusy?'is-busy':''}" onclick="adminPullPortalFromGit()" ${(pullBusy || disablePull)?'disabled':''}>
          <span class="admin-sync-badge">GitHub -> Portal</span>
          <span class="admin-sync-icon">${adminGitSyncIcon('pull')}</span>
          <span class="admin-sync-copy">
            <span class="admin-sync-label">${lang==='en'?'Pull To Portal':'Pull to Portal'}</span>
            <span class="admin-sync-desc">${lang==='en'?'Bring the latest committed version from Git into this live cPanel portal.':'Kéo phiên bản đã commit mới nhất từ Git xuống portal đang chạy trên cPanel.'}</span>
            <span class="admin-sync-note">${lang==='en'?'Auto-cleans runtime noise, pre-syncs meaningful server changes when possible, then fast-forwards from Git.':'Tự dọn runtime, pre-sync thay đổi meaningful trên server khi có thể, sau đó fast-forward từ Git.'}</span>
          </span>
          <span class="admin-sync-arrow">${pullBusy ? (lang==='en'?'Running...':'Đang chạy...') : (lang==='en'?'Update portal':'Cập nhật portal')}</span>
        </button>
        <button class="admin-sync-card is-push ${pushBusy?'is-busy':''}" onclick="adminSyncDocsToGit()" ${(pushBusy || disablePush)?'disabled':''}>
          <span class="admin-sync-badge">Portal -> GitHub</span>
          <span class="admin-sync-icon">${adminGitSyncIcon('push')}</span>
          <span class="admin-sync-copy">
            <span class="admin-sync-label">${lang==='en'?'Push To Git':'Push to Git'}</span>
            <span class="admin-sync-desc">${lang==='en'?'Commit meaningful repository changes from cPanel and publish them back to GitHub.':'Commit các thay đổi meaningful trong repo từ cPanel và đẩy ngược trở lại GitHub.'}</span>
            <span class="admin-sync-note">${lang==='en'?'Ignores runtime files such as sessions, rate limits, scan cache, and local user config noise.':'Bỏ qua file runtime như sessions, rate limits, scan cache và nhiễu do cấu hình user cục bộ.'}</span>
          </span>
          <span class="admin-sync-arrow">${pushBusy ? (lang==='en'?'Running...':'Đang chạy...') : (lang==='en'?'Publish changes':'Xuất bản thay đổi')}</span>
        </button>
      </div>
    </section>`;
}

function markUnsaved(){
  adminUnsaved = true;
  const bar = document.getElementById('admin-save-bar');
  if(bar) bar.style.display = 'flex';
}

function renderAdmin(){
  if(!isAdmin()){
    document.getElementById('page-admin').innerHTML='<div style="text-align:center;padding:60px;color:var(--text-3)">\u26A0 '+T('no_docs')+'</div>';
    return;
  }
  const el = document.getElementById('page-admin');
  const activeUsers = USERS.filter(u=>u.active).length;
  el.innerHTML = `
    <h2 style="font-size:18px;font-weight:700;margin-bottom:16px">${T('admin_panel')}</h2>
    <div class="admin-stat-row">
      <div class="admin-stat"><div class="val">${USERS.length}</div><div class="lbl">${T('admin_total_users')}</div></div>
      <div class="admin-stat"><div class="val">${DEPARTMENTS.length}</div><div class="lbl">${lang==='en'?'Departments':'Phòng ban'}</div></div>
      <div class="admin-stat"><div class="val">${Object.keys(ROLES).length}</div><div class="lbl">${T('admin_total_roles')}</div></div>
      <div class="admin-stat"><div class="val">${DOCS.length}</div><div class="lbl">${T('admin_total_docs')} <span style="font-size:9px;color:#10b981">● LIVE</span></div></div>
      <div class="admin-stat"><div class="val">${activeUsers}</div><div class="lbl">Active</div></div>
    </div>
    ${renderAdminSyncPanel()}
    <div class="admin-tabs-v2">
      <button class="admin-tab-v2 ${adminTab==='users'?'active':''}" onclick="adminTab='users';renderAdmin()">👥 ${T('admin_users')} <span class="tab-badge">${USERS.length}</span></button>
      <button class="admin-tab-v2 ${adminTab==='dept_title'?'active':''}" onclick="adminTab='dept_title';renderAdmin()">🏢 ${lang==='en'?'Dept & Titles':'Phòng ban & Chức danh'}</button>
      <button class="admin-tab-v2 ${adminTab==='roles'?'active':''}" onclick="adminTab='roles';renderAdmin()">🛡 ${T('admin_roles')}</button>
      <button class="admin-tab-v2 ${adminTab==='orgchart'?'active':''}" onclick="adminTab='orgchart';renderAdmin()">🏗 ${lang==='en'?'Org Chart':'Sơ đồ tổ chức'}</button>
      <button class="admin-tab-v2 ${adminTab==='perms'?'active':''}" onclick="adminTab='perms';renderAdmin()">🔐 ${T('admin_perms')}</button>
      <button class="admin-tab-v2 ${adminTab==='activity'?'active':''}" onclick="adminTab='activity';renderAdmin()" ${canViewActivityLog()?'':'style="display:none"'}>📊 ${lang==='en'?'Activity Log':'Kiểm soát hành vi'} <span class="tab-badge">${ACTIVITY_LOG.length}</span></button>
      <button class="admin-tab-v2 ${adminTab==='docs'?'active':''}" onclick="adminTab='docs';renderAdmin()">📄 ${T('admin_effective_docs')}</button>
      <button class="admin-tab-v2 ${adminTab==='portal_display'?'active':''}" onclick="adminTab='portal_display';renderAdmin()">🧭 ${lang==='en'?'Portal display':'Hiển thị portal'}</button>
      <button class="admin-tab-v2 ${adminTab==='retention'?'active':''}" onclick="adminTab='retention';renderAdmin()">📋 ${lang==='en'?'Retention':'Lưu giữ'}</button>
    </div>
    <div class="admin-panel" id="admin-content"></div>`;
  if(adminTab==='users') renderAdminUsers();
  if(adminTab==='dept_title') renderAdminDeptTitle();
  if(adminTab==='perms') renderAdminPerms();
  if(adminTab==='roles') renderAdminRoles();
  if(adminTab==='orgchart') renderAdminOrgChart();
  if(adminTab==='activity') renderAdminActivity();
  if(adminTab==='docs') renderAdminEffectiveDocs();
  if(adminTab==='portal_display'){
    renderAdminPortalDisplay();
    loadPortalDisplayConfigFromServer({silent:true});
  }
  if(adminTab==='retention') renderAdminRetention();
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

function renderAdminUsers(){
  // Fallback: if no users from server, use demo data
  if(!USERS.length && typeof DEMO_USERS !== 'undefined') USERS = JSON.parse(JSON.stringify(DEMO_USERS));
  const el = document.getElementById('admin-content');
  const deptMap = {};
  DEPARTMENTS.forEach(d=>deptMap[d.code]=d);
  
  const viewToggle = `<div style="display:flex;border:1px solid #d1d5db;border-radius:6px;overflow:hidden">
    <button onclick="adminUserViewMode='cards';renderAdminUsers()" style="padding:5px 10px;font-size:11px;border:none;cursor:pointer;background:${adminUserViewMode==='cards'?'#1565c0':'#fff'};color:${adminUserViewMode==='cards'?'#fff':'#666'};transition:all .15s" title="Card view">&#9638;</button>
    <button onclick="adminUserViewMode='list';renderAdminUsers()" style="padding:5px 10px;font-size:11px;border:none;border-left:1px solid #d1d5db;cursor:pointer;background:${adminUserViewMode==='list'?'#1565c0':'#fff'};color:${adminUserViewMode==='list'?'#fff':'#666'};transition:all .15s" title="List view">☰</button>
  </div>`;

  let usersHtml = '';
  if(adminUserViewMode === 'list'){
    usersHtml = `<div style="overflow-x:auto"><table class="admin-table" id="user-list-table" style="width:100%;font-size:12px">
      <thead><tr style="background:#f8fafc">
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
        return `<tr class="user-list-row" data-name="${escapeHtml((u.name||'').toLowerCase())}" data-dept="${escapeHtml(u.dept||'')}" style="border-bottom:1px solid #f1f3f5;${u.active===false?'opacity:.5;background:#fef2f2':''}">
          <td style="padding:6px 10px;color:var(--text-3)">${idx+1}</td>
          <td style="padding:6px 10px">${u.active!==false?'🟢':'🔴'}</td>
          <td style="padding:6px 10px;font-weight:600">${escapeHtml(u.name)}</td>
          <td style="padding:6px 10px;font-family:var(--mono);font-size:11px;color:var(--text-3)">@${escapeHtml(u.username)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${dept?dept.color+'15':'#f1f3f5'};color:${dept?dept.color:'#666'}">${u.dept}${dept?' '+(lang==='en'?dept.labelEn:dept.label):''}</span></td>
          <td style="padding:6px 10px;font-size:11px">${escapeHtml(u.title)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${r?r.color+'15':'#f1f3f5'};color:${r?r.color:'#666'}">${r?r.icon:''} ${r?r.label:u.role}</span></td>
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
            <span class="tag" style="background:${dept?dept.color+'15':'#f1f3f5'};color:${dept?dept.color:'#666'}">${u.dept} ${dept?(lang==='en'?dept.labelEn:dept.label):''}</span>
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

  el.innerHTML = `
    <div class="admin-toolbar">
      <input type="text" placeholder="${lang==='en'?'Search users...':'Tìm người dùng...'}" oninput="filterAdminUserCards(this.value)" id="admin-user-search">
      <select id="admin-user-dept-filter" onchange="filterAdminUserCards(document.getElementById('admin-user-search').value)" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;min-width:140px">
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
    ${usersHtml}`;
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
        <button onclick="doSoftDeleteUser('${u.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid #fde68a;border-radius:10px;cursor:pointer;background:#fffbeb;text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='#fbbf24'" onmouseout="this.style.borderColor='#fde68a'">
          <span style="font-size:22px">⏸</span>
          <div><div style="font-size:13px;font-weight:700;color:#92400e">${lang==='en'?'Deactivate (Soft delete)':'Vô hiệu hóa (Xóa mềm)'}</div><div style="font-size:11px;color:#a16207;margin-top:2px">${lang==='en'?'User becomes inactive but data is preserved. Can be reactivated later.':'Người dùng bị khóa nhưng dữ liệu được giữ lại. Có thể kích hoạt lại sau.'}</div></div>
        </button>
        <button onclick="doHardDeleteUser('${u.id}','${escapeHtml(u.username)}','${escapeHtml(u.name)}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid #fecaca;border-radius:10px;cursor:pointer;background:#fef2f2;text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='#f87171'" onmouseout="this.style.borderColor='#fecaca'">
          <span style="font-size:22px">🗑</span>
          <div><div style="font-size:13px;font-weight:700;color:#991b1b">${lang==='en'?'Delete permanently':'Xóa hoàn toàn'}</div><div style="font-size:11px;color:#b91c1c;margin-top:2px">${lang==='en'?'Completely removes the user from the system. This action cannot be undone.':'Xóa hoàn toàn người dùng khỏi hệ thống. Hành động này không thể hoàn tác.'}</div></div>
        </button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  requestAnimationFrame(()=>modal.classList.add('show'));
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
      await loadUsersFromServerIfAdmin();
      renderAdmin();
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
      await loadUsersFromServerIfAdmin();
      renderAdmin();
    } else {
      const errMsg = res&&res.error==='cannot_delete_self' ? (lang==='en'?'Cannot delete yourself':'Không thể xóa chính mình') : ((res&&res.error)?res.error:'error');
      showToast('\u26A0 '+errMsg);
    }
  }catch(e){ showToast('\u26A0 Server error'); }
}

function showUserModal(userId){
  const isEdit = !!userId;
  const u0 = isEdit ? USERS.find(x=>String(x.id)===String(userId)) : {id:'',name:'',username:'',dept:'',title:'',role:'employee',active:true,mfa_enabled:false,cccd:'',phone:'',personal_email:''};
  if(isEdit && !u0){
    showToast(lang==='en'?'⚠ User not found':'⚠ Không tìm thấy người dùng');
    return;
  }

  closeModal();

  // Reset modal state
  window.__um_state = { tempPassword: '' };

  const roleKeys = Object.keys(ROLES||{});
  const roleOptions = roleKeys.map(k=>`<option value="${k}" ${String(u0.role)===String(k)?'selected':''}>${escapeHtml((ROLES[k]?.icon||'')+' '+(ROLES[k]?.label||k))}</option>`).join('');
  
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

  function roleKeyByLabel(lbl){
    for(const [k,v] of Object.entries(ROLES)){ if(v && v.label===lbl) return k; }
    return '';
  }

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
    const k = roleKeyByLabel(titleSel.value);
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

    const payload = { username, name, dept, title, role, active, cccd, phone, personal_email };
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
      await loadUsersFromServerIfAdmin();
      renderAdminUsers();
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
    ? `HESEM QMS Login\n\nLink: ${link}\nUsername: ${username}\nPassword: ${password}\n`
    : `Thông tin đăng nhập HESEM QMS\n\nLink: ${link}\nTài khoản: ${username}\nMật khẩu: ${password}\n`);
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
      await loadUsersFromServerIfAdmin();
      renderAdmin();
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
      await loadUsersFromServerIfAdmin();
      renderAdmin();
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
  const overrides=PERM_OVERRIDES[u.id]||{grant:[],deny:[]};
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
          <input type="checkbox" data-doc="${d.code}" data-base="${baseAccess}" ${checked?'checked':''} onchange="handlePermChange(this,'${u.id}')">
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
    <div style="max-height:55vh;overflow-y:auto;border:1px solid #e2e8f0;border-radius:6px;padding:8px 12px">
      ${catHtml}
    </div>
    <div class="modal-actions">
      <button class="btn-admin danger" onclick="resetUserPerms('${u.id}')">↩ Reset</button>
      <button class="btn-admin secondary" onclick="closeModal()">✕ ${T('admin_cancel')}</button>
      <button class="btn-admin primary" onclick="closeModal();renderAdmin()">✓ OK</button>
    </div>
  </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{if(e.target===modal)closeModal();});
}

function handlePermChange(cb, userId){
  const docCode=cb.dataset.doc;
  const baseAccess=cb.dataset.base==='true';
  if(!PERM_OVERRIDES[userId])PERM_OVERRIDES[userId]={grant:[],deny:[]};
  const ov=PERM_OVERRIDES[userId];
  // Remove from both lists
  ov.grant=ov.grant.filter(c=>c!==docCode);
  ov.deny=ov.deny.filter(c=>c!==docCode);
  if(cb.checked && !baseAccess){
    ov.grant.push(docCode); // Grant override
  } else if(!cb.checked && baseAccess){
    ov.deny.push(docCode); // Deny override
  }
  // Clean empty overrides
  if(!ov.grant.length&&!ov.deny.length)delete PERM_OVERRIDES[userId];
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

function resetUserPerms(userId){
  delete PERM_OVERRIDES[userId];
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

  el.innerHTML=`
    <div class="perm-grid">
      <div class="pg-sidebar">
        <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--text-3);border-bottom:1px solid #e2e8f0">${lang==='en'?'SELECT ROLE':'CHỌN VAI TRÒ'}</div>
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
    <div class="admin-save-bar" id="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>⚠ '+(lang==='en'?'Unsaved changes':'Có thay đổi chưa lưu')+'</b>':lang==='en'?'Edit permissions then click Save':'Chỉnh phân quyền rồi nhấn Lưu'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.removeItem('hesem_role_docs');location.reload()">↩ Reset</button>
      <button class="btn-admin primary" onclick="adminSaveAll()" style="padding:8px 24px;font-size:13px">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
    </div>`;
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
  saveRoleDocsToStorage();
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
  saveRoleDocsToStorage();
  markUnsaved();
  renderAdminPerms();
}

function saveRoleDocsToStorage(){try{sessionStorage.setItem('hesem_role_docs',JSON.stringify(ROLE_DOCS));}catch(e){}}
function loadRoleDocsFromStorage(){try{const s=sessionStorage.getItem('hesem_role_docs');if(s){const loaded=JSON.parse(s);if(loaded&&typeof loaded==='object')Object.assign(ROLE_DOCS,loaded);}}catch(e){}}

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

// ═══════════════════════════════════════════════════
// ADMIN TAB: DEPARTMENTS & TITLES
// ═══════════════════════════════════════════════════
function renderAdminDeptTitle(){
  adminPanel.innerHTML='';
  const totalTitles = Object.values(DEPT_TITLES||{}).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0);
  const card=el('div',{class:'card'},[]);
  const header=el('div',{style:'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;'},[
    el('div',{},[
      el('div',{style:'font-weight:800;font-size:16px;line-height:1.2;'},'Phòng ban → Chức danh (JD Tree)'),
      el('div',{class:'muted',style:'margin-top:4px;'},'Một cửa sổ duy nhất mô phỏng đúng cấu trúc thư mục JD. Chức danh nằm bên trong phòng ban; khi sửa người dùng, danh sách chức danh sẽ tự lọc theo phòng ban và ô Vai trò sẽ tự nhận theo chức danh.')
    ]),
    el('div',{style:'display:flex;gap:8px;flex-wrap:wrap;align-items:center;'},[
      el('div',{class:'muted',style:'font-size:12px;'},`${DEPARTMENTS.length} phòng ban • ${totalTitles} chức danh`),
      el('button',{class:'btn',onclick:()=>{
        if(!confirm('Reset Phòng ban & Chức danh theo SSOT (mặc định)?'))return;
        DEPARTMENTS=JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
        DEPT_TITLES=JSON.parse(JSON.stringify(DEFAULT_DEPT_TITLES));
        syncTitlesFromDept();
        saveDepartments();saveDeptTitles();saveTitles();
        renderAdminDeptTitle();
      }},'Reset theo JD SSOT'),
      el('button',{class:'btn',onclick:()=>{
        const code=(prompt('Mã phòng ban (VD: ENG, PRO, QA, ...):','')||'').trim().toUpperCase();
        if(!code)return;
        if(DEPARTMENTS.some(d=>d.code===code)){alert('Mã phòng ban đã tồn tại.');return;}
        const label=(prompt('Tên phòng ban (VN):','')||'').trim();
        if(!label)return;
        const labelEn=(prompt('Tên phòng ban (EN):','')||'').trim()||label;
        DEPARTMENTS.push({code,label,labelEn,color:'#94a3b8'});
        DEPT_TITLES[code]=DEPT_TITLES[code]||[];
        syncTitlesFromDept();saveDepartments();saveDeptTitles();saveTitles();
        renderAdminDeptTitle();
      }},'Thêm phòng ban')
    ])
  ]);

  const body=el('div',{style:'margin-top:12px;border:1px solid var(--ln);border-radius:14px;background:#fff;overflow:hidden;'},[]);
  const tree=el('div',{style:'padding:10px;display:flex;flex-direction:column;gap:8px;background:#f8fafc;'},[]);

  DEPARTMENTS.forEach(d=>{
    const titles=titlesForDept(d.code)||[];
    const usersInDept = USERS.filter(u=>u.dept===d.code).length;
    const folder=el('details',{open:true,class:'fm-folder',style:`border:1px solid ${d.color}33;background:#fff;border-radius:12px;overflow:hidden;`},[]);
    const summary=el('summary',{style:'list-style:none;cursor:pointer;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(180deg,#fff,#f8fafc);'},[
      el('div',{style:'display:flex;align-items:center;gap:10px;'},[
        el('div',{class:'fm-icon',style:`width:36px;height:36px;border-radius:10px;background:${d.color}18;border:1px solid ${d.color}40;display:flex;align-items:center;justify-content:center;font-size:18px;color:${d.color};`},'📁'),
        el('div',{},[
          el('div',{style:'font-weight:800;'},`${d.code} — ${d.label}`),
          el('div',{class:'muted',style:'margin-top:2px;font-size:11px;'},`${titles.length} chức danh • ${usersInDept} người dùng`)
        ])
      ]),
      el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;align-items:center;'},[
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          const t=(prompt(`Thêm chức danh cho ${d.code}:`,'')||'').trim();
          if(!t)return;
          DEPT_TITLES[d.code]=DEPT_TITLES[d.code]||[];
          if(DEPT_TITLES[d.code].includes(t)){alert('Chức danh đã tồn tại trong phòng ban này.');return;}
          DEPT_TITLES[d.code].push(t);
          syncTitlesFromDept();saveDeptTitles();saveTitles();
          renderAdminDeptTitle();
        }},'Thêm chức danh'),
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          const nl=(prompt(`Đổi tên phòng ban ${d.code}:`,d.label)||'').trim();
          if(!nl)return;
          d.label=nl; saveDepartments(); renderAdminDeptTitle();
        }},'Sửa'),
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          if(!confirm(`Xóa phòng ban ${d.code}? (Người dùng thuộc phòng ban này sẽ bị xóa mapping phòng ban/chức danh)`))return;
          DEPARTMENTS=DEPARTMENTS.filter(x=>x.code!==d.code);
          delete DEPT_TITLES[d.code];
          USERS.forEach(u=>{if(u.dept===d.code){u.dept='';u.title='';}});
          syncTitlesFromDept();saveDepartments();saveDeptTitles();saveTitles();
          renderAdminDeptTitle(); renderAdminUsers();
        }},'Xóa')
      ])
    ]);
    folder.appendChild(summary);

    const list=el('div',{style:'padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px;background:#fff;'},[]);
    if(!titles.length){
      list.appendChild(el('div',{class:'muted',style:'padding:8px 10px;'},'Chưa có chức danh trong phòng ban này.'));
    }else{
      titles.forEach(t=>{
        const count = USERS.filter(u=>u.dept===d.code && u.title===t).length;
        const row=el('div',{class:'fm-file-row',style:'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--ln);border-radius:10px;background:#f8fafc;'},[
          el('div',{style:'display:flex;align-items:center;gap:10px;min-width:0;'},[
            el('div',{class:'fm-file-icon',style:'width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:#e0e7ff;border:1px solid #c7d2fe;border-radius:8px;font-size:15px;'},'📄'),
            el('div',{style:'min-width:0;'},[
              el('div',{style:'font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'},t),
              el('div',{class:'muted',style:'font-size:11px;margin-top:1px;'},`${d.code}/${t}`)
            ])
          ]),
          el('div',{style:'display:flex;align-items:center;gap:6px;flex-wrap:wrap;'},[
            el('span',{style:'font-size:10px;padding:2px 8px;border-radius:999px;background:#eef2ff;color:#4338ca;border:1px solid #c7d2fe;'},`${count} user`+(count===1?'':'s')),
            el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
              const nt=(prompt('Đổi tên chức danh:',t)||'').trim();
              if(!nt||nt===t)return;
              DEPT_TITLES[d.code]=DEPT_TITLES[d.code].map(x=>x===t?nt:x);
              USERS.forEach(u=>{if(u.dept===d.code && u.title===t)u.title=nt;});
              syncTitlesFromDept();saveDeptTitles();saveTitles(); renderAdminDeptTitle(); renderAdminUsers();
            }},'Sửa'),
            el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
              if(!confirm(`Xóa chức danh "${t}" khỏi ${d.code}?`))return;
              DEPT_TITLES[d.code]=DEPT_TITLES[d.code].filter(x=>x!==t);
              USERS.forEach(u=>{if(u.dept===d.code && u.title===t)u.title='';});
              syncTitlesFromDept();saveDeptTitles();saveTitles(); renderAdminDeptTitle(); renderAdminUsers();
            }},'Xóa')
          ])
        ]);
        list.appendChild(row);
      });
    }
    folder.appendChild(list);
    tree.appendChild(folder);
  });

  body.appendChild(tree);
  card.appendChild(header);
  card.appendChild(body);
  adminPanel.appendChild(card);
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
  
  // Build hierarchy from ROLES levels and actual users
  const levelGroups = {};
  USERS.filter(u=>u.active!==false).forEach(u=>{
    const r = ROLES[u.role];
    const level = r ? r.level : 5;
    if(!levelGroups[level]) levelGroups[level] = [];
    levelGroups[level].push(u);
  });
  
  const levels = Object.keys(levelGroups).sort((a,b)=>Number(a)-Number(b));
  const deptMap = {};
  DEPARTMENTS.forEach(d=>deptMap[d.code]=d);
  
  let chartHtml = '<div class="org-chart-container"><div style="text-align:center">';
  
  levels.forEach((lv,li)=>{
    const users = levelGroups[lv];
    const levelLabel = lv==='0' ? 'Ban Giám Đốc' : lv==='1' ? 'Quản lý cấp cao' : lv==='2' ? 'Trưởng phòng' : lv==='3' ? 'Chuyên viên / Nhân viên' : lv==='4' ? 'Nhân viên' : 'Thực tập';
    
    chartHtml += `<div style="margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;color:var(--text-3);letter-spacing:1px;margin-bottom:8px;text-transform:uppercase">Level ${lv} — ${levelLabel}</div>
      <div style="display:flex;flex-wrap:wrap;justify-content:center;gap:10px;margin-bottom:4px">`;
    
    // Group users by dept within this level
    const deptGrouped = {};
    users.forEach(u=>{
      if(!deptGrouped[u.dept]) deptGrouped[u.dept] = [];
      deptGrouped[u.dept].push(u);
    });
    
    Object.entries(deptGrouped).forEach(([dept, dUsers])=>{
      const dc = deptMap[dept];
      const borderColor = dc ? dc.color : '#94a3b8';
      dUsers.forEach(u=>{
        const r = ROLES[u.role];
        chartHtml += `<div class="org-node" style="border-color:${borderColor}" title="${escapeHtml(u.username)}">
          <div style="font-size:16px">${r?r.icon:'👤'}</div>
          <div class="on-name">${escapeHtml(u.name)}</div>
          <div class="on-title">${escapeHtml(u.title)}</div>
          <div class="on-dept" style="background:${borderColor}15;color:${borderColor}">${escapeHtml(u.dept)}</div>
        </div>`;
      });
    });
    
    chartHtml += '</div>';
    
    // Connector line between levels
    if(li < levels.length - 1){
      chartHtml += '<div style="width:2px;height:20px;background:#d1d5db;margin:0 auto"></div>';
    }
    
    chartHtml += '</div>';
  });
  
  chartHtml += '</div></div>';
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:14px;font-weight:700;margin:0">🏗 ${lang==='en'?'Organization Chart':'Sơ đồ Tổ chức Công ty'}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-admin secondary" onclick="exportOrgChartSVG()">📥 ${lang==='en'?'Export SVG':'Xuất SVG'}</button>
        <button class="btn-admin secondary" onclick="window.print()">🖨 ${lang==='en'?'Print':'In'}</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:16px">
      ${lang==='en'
        ?'Auto-generated from user database. Grouped by role level and department.'
        :'Tự động tạo từ cơ sở dữ liệu người dùng. Nhóm theo cấp vai trò và phòng ban.'}
    </div>
    <div style="border:1px solid #e2e8f0;border-radius:10px;overflow:auto;background:#fafbfc;max-height:600px">
      ${chartHtml}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      ${DEPARTMENTS.map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:3px 8px;border-radius:6px;background:${d.color}10;color:${d.color};border:1px solid ${d.color}30">
        <span style="width:8px;height:8px;border-radius:50%;background:${d.color}"></span>
        ${d.code} — ${lang==='en'?d.labelEn:d.label}
      </span>`).join('')}
    </div>`;
}

function exportOrgChartSVG(){
  showToast(lang==='en'?'💡 Use Print (Ctrl+P) to save as PDF':'💡 Dùng In (Ctrl+P) để lưu PDF');
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: ACTIVITY LOG (User Behavior)
// ═══════════════════════════════════════════════════
function renderAdminActivity(){
  const el = document.getElementById('admin-content');
  
  // Permission check
  if(!canViewActivityLog()){
    el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-3)">⛔ '+(lang==='en'?'You do not have permission to view this tab. Contact the General Manager (EXE-01).':'Bạn không có quyền xem tab này. Liên hệ General Manager (EXE-01).')+'</div>';
    return;
  }
  
  // Sort by most recent first
  const logs = [...ACTIVITY_LOG].reverse();
  
  const uniqueUsers = [...new Set(logs.map(l=>l.user))];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <h3 style="font-size:14px;font-weight:700;margin:0">📊 ${lang==='en'?'User Activity Monitor':'Kiểm soát Hành vi Người dùng'}</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-admin secondary" onclick="document.getElementById('ds-panel').style.display=document.getElementById('ds-panel').style.display==='none'?'':'none'">⚙️ ${lang==='en'?'Settings':'Cài đặt'}</button>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="activity-user-filter" onchange="filterActivityLog()" style="padding:5px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:11px">
          <option value="">${lang==='en'?'All users':'Tất cả'}</option>
          ${uniqueUsers.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('')}
        </select>
        <button class="btn-admin secondary" onclick="exportActivityCSV()">📥 CSV</button>
        <button class="btn-admin danger" onclick="clearActivityLog()">🗑 ${lang==='en'?'Clear':'Xóa log'}</button>
      </div>
    </div>
    <div id="ds-panel" style="display:none;margin-bottom:16px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden;background:#fff">
      <div style="padding:12px 16px;font-weight:700;font-size:13px;background:#f8fafc;border-bottom:1px solid #e2e8f0">⚙️ ${lang==='en'?'Data Collection Settings':'Cài đặt Thu thập Dữ liệu'}</div>
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
          return `<div data-ds-key="${it.k}" style="display:flex;align-items:flex-start;gap:12px;padding:10px 14px;border-bottom:1px solid #f1f3f5">
            <label style="position:relative;display:inline-block;width:44px;min-width:44px;height:24px;cursor:pointer">
              <input type="checkbox" ${on?"checked":""} onchange="toggleDataSetting('${it.k}',this.checked)" style="opacity:0;width:0;height:0;position:absolute">
              <span class="ds-track" style="position:absolute;top:0;left:0;right:0;bottom:0;background:${on?"#10b981":"#d1d5db"};border-radius:24px;transition:.3s"></span>
              <span class="ds-knob" style="position:absolute;height:18px;width:18px;left:${on?"22px":"3px"};bottom:3px;background:#fff;border-radius:50%;transition:.3s;box-shadow:0 1px 3px rgba(0,0,0,.2)"></span>
            </label>
            <div style="flex:1"><div style="font-weight:700;font-size:13px">${it.i} ${lb}</div><div style="font-size:11px;color:var(--text-3);margin-top:2px">${dc}</div></div>
          </div>`;
        }).join('');
      })()}
      <div id="ds-action-bar" style="display:${DATA_SETTINGS_DRAFT?'flex':'none'};padding:10px 14px;gap:8px;justify-content:flex-end;background:#fffbeb;border-top:1px solid #fde68a">
        <button class="btn-admin secondary" onclick="cancelDataSettingsDraft()" style="padding:6px 16px;font-size:12px">↩ ${lang==='en'?'Cancel':'Hủy'}</button>
        <button class="btn-admin primary" onclick="saveDataSettingsDraft()" style="padding:6px 16px;font-size:12px">💾 ${lang==='en'?'Save':'Lưu'}</button>
      </div>
      <div style="padding:10px 14px;background:#f0f7ff;font-size:11px;color:#1e40af">💡 ${lang==='en'?'Toggle options then click Save. Changes take effect on next login.':'Bật/tắt tùy chọn rồi nhấn Lưu. Thay đổi có hiệu lực từ lần đăng nhập kế.'}</div>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px;padding:10px;background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
      🛡 <b>${lang==='en'?'Security Audit Log':'Nhật ký Kiểm toán Bảo mật'}:</b> 
      ${lang==='en'
        ?'Records session data: login time, IP, GPS coordinates, device fingerprint, detailed page-by-page navigation with exact timestamps and viewing duration.'
        :'Ghi nhận dữ liệu phiên: thời gian đăng nhập, IP, tọa độ GPS, vân tay thiết bị, điều hướng chi tiết từng trang với thời điểm chính xác và thời lượng xem.'}
    </div>
    <div id="activity-sessions-list" style="max-height:550px;overflow-y:auto">
      ${logs.length === 0 
        ? '<div style="text-align:center;padding:40px;color:var(--text-3)">'+( lang==='en'?'No activity recorded yet':'Chưa có hoạt động nào được ghi')+'</div>'
        : logs.map((s,si)=>{
          const loginDate = new Date(s.login_time);
          const dateStr = loginDate.toLocaleDateString('vi-VN') + ' ' + loginDate.toLocaleTimeString('vi-VN');
          const totalPages = (s.pages||[]).length;
          const totalTime = (s.pages||[]).reduce((sum,p)=>sum+(p.duration_sec||0),0);
          return `<div class="al-session" data-user="${escapeHtml(s.user)}" data-idx="${si}">
            <div class="al-header">
              <div style="display:flex;align-items:center;gap:8px;flex:1;flex-wrap:wrap">
                <span style="font-weight:700;font-size:12px;color:var(--text)">${escapeHtml(s.name||s.user)}</span>
                <span style="font-family:var(--mono);font-size:10px;color:var(--text-3)">@${escapeHtml(s.user)}</span>
                <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:#e3f2fd;color:#1565c0">${escapeHtml(s.role||'')}</span>
                <span style="font-size:10px;color:var(--text-2)">🕐 ${dateStr}</span>
              </div>
              <button class="btn-admin secondary sm" onclick="this.parentElement.parentElement.querySelector('.al-detail').style.display=this.parentElement.parentElement.querySelector('.al-detail').style.display==='none'?'':'none';this.textContent=this.textContent.includes('▾')?'▴ Thu gọn':'▾ Chi tiết'">
                ▾ ${lang==='en'?'Detail':'Chi tiết'}
              </button>
            </div>
            <!-- Summary row -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--text-3);margin:6px 0;padding:8px;background:#f8fafc;border-radius:6px">
              <span>🌐 <b>IP:</b> ${escapeHtml(s.ip||'—')}</span>
              <span>📍 <b>GPS:</b> ${escapeHtml(s.location||'—')} ${s.location_accuracy&&s.location_accuracy!=='—'?'(±'+escapeHtml(s.location_accuracy)+')':''}</span>
              <span>📱 <b>${lang==='en'?'Device':'Thiết bị'}:</b> ${escapeHtml(s.device_short||s.platform||'—')}</span>
              <span>🖥 <b>${lang==='en'?'Screen':'Màn hình'}:</b> ${escapeHtml(s.screen||'—')}</span>
              <span>🔲 <b>Viewport:</b> ${escapeHtml(s.viewport||'—')}</span>
              <span>🌍 <b>TZ:</b> ${escapeHtml(s.timezone||'—')}</span>
              <span>📶 <b>Net:</b> ${escapeHtml(s.connection_type||'—')}</span>
              <span>📄 <b>${totalPages}</b> ${lang==='en'?'pages':'trang'} · <b>${formatDuration(totalTime)}</b></span>
            </div>
            <!-- Detailed page-by-page log (hidden by default) -->
            <div class="al-detail" style="display:none">
              <div style="font-size:10px;font-weight:700;margin:8px 0 6px;color:var(--text-2);border-bottom:1px solid #e2e8f0;padding-bottom:4px">
                📋 ${lang==='en'?'Page-by-page navigation log':'Nhật ký điều hướng từng trang'} (${totalPages} ${lang==='en'?'entries':'mục'})
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:10px">
                <thead><tr style="background:#f0f7ff">
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">#</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Page / Document':'Trang / Tài liệu'}</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Started viewing':'Bắt đầu xem'}</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Left at':'Rời lúc'}</th>
                  <th style="text-align:right;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Duration':'Thời lượng'}</th>
                </tr></thead>
                <tbody>
                ${(s.pages||[]).map((p,pi)=>{
                  const entered = new Date(p.entered_at);
                  const enteredStr = entered.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                  const leftStr = p.left_at ? new Date(p.left_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : '—';
                  const isDoc = (p.page_id||p.page||'').startsWith('doc/');
                  const durColor = (p.duration_sec||0) > 300 ? '#dc2626' : (p.duration_sec||0) > 60 ? '#d97706' : '#16a34a';
                  return `<tr style="border-bottom:1px solid #f1f3f5">
                    <td style="padding:3px 8px;color:var(--text-3)">${pi+1}</td>
                    <td style="padding:3px 8px">
                      ${isDoc?'📄':'📁'} <b>${escapeHtml(p.page_title||p.page_id||p.page||'—')}</b>
                      <span style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-left:4px">${escapeHtml(p.page_id||p.page||'')}</span>
                    </td>
                    <td style="padding:3px 8px;font-family:var(--mono)">${enteredStr}</td>
                    <td style="padding:3px 8px;font-family:var(--mono)">${leftStr}</td>
                    <td style="padding:3px 8px;text-align:right;font-weight:600;color:${durColor}">${formatDuration(p.duration_sec||0)}</td>
                  </tr>`;
                }).join('')}
                </tbody>
              </table>
              <div style="margin-top:8px;font-size:9px;color:var(--text-3);padding:6px 8px;background:#f8fafc;border-radius:4px">
                <b>Full User-Agent:</b> ${escapeHtml(s.device||'—')}<br>
                <b>Language:</b> ${escapeHtml(s.language||'—')} · <b>Cookies:</b> ${s.cookies_enabled?'Yes':'No'} · <b>Online:</b> ${s.online?'Yes':'No'}
              </div>
            </div>
          </div>`;
        }).join('')
      }
    </div>`;
}

function formatDuration(sec){
  if(!sec || sec < 1) return '< 1s';
  if(sec < 60) return sec+'s';
  const m = Math.floor(sec/60);
  const s = sec%60;
  return m+'m'+( s>0?' '+s+'s':'');
}

function filterActivityLog(){
  const userFilter = (document.getElementById('activity-user-filter')||{}).value||'';
  document.querySelectorAll('#activity-sessions-list .al-session').forEach(el=>{
    const u = el.dataset.user||'';
    el.style.display = (!userFilter || u === userFilter) ? '' : 'none';
  });
}

function exportActivityCSV(){
  let csv = 'User,Name,Role,Dept,Login Time,IP,GPS Location,GPS Accuracy,Device,Screen,Viewport,Timezone,Connection,Page ID,Page Title,Started At,Left At,Duration (s)\n';
  ACTIVITY_LOG.forEach(s=>{
    (s.pages||[]).forEach(p=>{
      csv += `"${s.user}","${s.name}","${s.role||''}","${s.dept||''}","${s.login_time}","${s.ip||''}","${s.location||''}","${s.location_accuracy||''}","${(s.device_short||s.platform||'').replace(/"/g,"'")}","${s.screen||''}","${s.viewport||''}","${s.timezone||''}","${s.connection_type||''}","${p.page_id||p.page||''}","${(p.page_title||'').replace(/"/g,"'")}","${p.entered_at||''}","${p.left_at||''}",${p.duration_sec||0}\n`;
    });
  });
  const blob = new Blob(['\uFEFF'+csv], {type:'text/csv;charset=utf-8'});
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'hesem_activity_log_'+new Date().toISOString().slice(0,10)+'.csv';
  document.body.appendChild(a);
  a.click();
  setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},0);
  showToast('✅ '+(lang==='en'?'Exported':'Đã xuất'));
}

function clearActivityLog(){
  if(!confirm(lang==='en'?'Clear all activity log?':'Xóa toàn bộ log hoạt động?')) return;
  ACTIVITY_LOG.length = 0;
  saveActivityLog();
  showToast('✅ '+(lang==='en'?'Cleared':'Đã xóa'));
  renderAdminActivity();
}

// ═══════════════════════════════════════════════════
// ADMIN TAB: ROLES (original, kept)
// ═══════════════════════════════════════════════════
function renderAdminRoles(){
  const el=document.getElementById('admin-content');
  const roleOpts=Object.entries(ROLES).map(([k,v])=>'<option value="'+k+'">'+v.icon+' '+v.label+'</option>').join('');
  el.innerHTML=`
    <div style="overflow-x:auto">
      <table class="admin-table">
        <thead><tr>
          <th></th><th>${lang==='en'?'Role':'Vai trò'}</th><th>Level</th>
          <th>${lang==='en'?'Edit':'Sửa'}</th>
          <th>${lang==='en'?'Create':'Tạo mới'}</th>
          <th>${lang==='en'?'Approve':'Duyệt'}</th><th>Admin</th>
          <th title="${lang==='en'?'Can view Activity Log tab':'Xem được tab Kiểm soát hành vi'}">👁 ${lang==='en'?'Activity':'Hành vi'}</th>
          <th title="${lang==='en'?'Can export/import user Excel':'Xuất/nhập Excel người dùng'}">📥 Excel</th>
          <th>${lang==='en'?'Documents':'Tài liệu'}</th>
          <th>${lang==='en'?'Members':'Thành viên'}</th>
        </tr></thead>
        <tbody>
          ${Object.entries(ROLES).map(([k,v])=>{
            const cnt=ROLE_DOCS[k]==='ALL'?DOCS.length:DOCS.filter(d=>docMatchesRole(d.code,k)).length;
            const roleUsers=USERS.filter(u=>u.role===k&&u.active);
            const pct=Math.round(cnt/DOCS.length*100);
            return `<tr>
              <td>${v.icon}</td>
              <td>
                <b style="color:${v.color}">${v.label}</b><br>
                <span style="font-size:10px;color:var(--text-3)">${v.labelEn}</span>
              </td>
              <td style="text-align:center">${v.level}</td>
              <td style="text-align:center">
                <input type="checkbox" ${v.canEditDocs?'checked':''} onchange="ROLES['${k}'].canEditDocs=this.checked;markUnsaved();renderAdminRoles()">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.canCreateDocs?'checked':''} onchange="ROLES['${k}'].canCreateDocs=this.checked;markUnsaved();renderAdminRoles()">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.approve?'checked':''} onchange="ROLES['${k}'].approve=this.checked;markUnsaved();renderAdminRoles()">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.admin?'checked':''} onchange="ROLES['${k}'].admin=this.checked;markUnsaved();renderAdminRoles()">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.canViewActivity?'checked':''} onchange="ROLES['${k}'].canViewActivity=this.checked;markUnsaved();renderAdminRoles()" title="${lang==='en'?'Allow this role to view Activity Log':'Cho phép vai trò này xem Kiểm soát hành vi'}">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.canExportUsers?'checked':''} onchange="ROLES['${k}'].canExportUsers=this.checked;markUnsaved();renderAdminRoles()" title="${lang==='en'?'Allow this role to export/import user Excel':'Cho phép vai trò này xuất/nhập Excel người dùng'}">
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;background:#e2e8f0;border-radius:3px;height:8px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:${v.color};border-radius:3px"></div>
                  </div>
                  <span style="font-size:10px;font-family:var(--mono);min-width:50px">${cnt}/${DOCS.length}</span>
                </div>
              </td>
              <td style="min-width:160px">
                ${roleUsers.length>0
                  ? roleUsers.map(u=>'<div style="font-size:10px;padding:2px 0"><span style="color:var(--text-3)">'+u.id+'</span> '+u.name+'</div>').join('')
                  : '<span style="font-size:10px;color:var(--text-3);font-style:italic">'+(lang==='en'?'No members':'Chưa có')+'</span>'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px;border-top:1px solid #e2e8f0;padding-top:16px">
      <h3 style="font-size:13px;font-weight:700;margin-bottom:10px">${lang==='en'?'Reassign User Role':'Thay đổi vai trò người dùng'}</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="role-reassign-user" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;min-width:180px">
          ${USERS.filter(u=>u.active).map(u=>'<option value="'+u.id+'">'+u.name+' ('+u.role+')</option>').join('')}
        </select>
        <span style="font-size:11px;color:var(--text-3)">→</span>
        <select id="role-reassign-role" style="padding:6px 10px;border:1px solid #d1d5db;border-radius:6px;font-size:12px;min-width:180px">
          ${roleOpts}
        </select>
        <button class="btn-admin primary" onclick="reassignUserRole()">${lang==='en'?'Apply':'Áp dụng'}</button>
      </div>
    </div>
    <div class="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>⚠ '+(lang==='en'?'Unsaved changes':'Có thay đổi chưa lưu')+'</b>':lang==='en'?'Make changes then click Save':'Thay đổi rồi nhấn Lưu'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.clear();location.reload()">↩ Reset All</button>
      <button class="btn-admin primary" onclick="adminSaveAll()" style="padding:8px 24px;font-size:13px">💾 ${lang==='en'?'SAVE':'LƯU'}</button>
    </div>`;
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
