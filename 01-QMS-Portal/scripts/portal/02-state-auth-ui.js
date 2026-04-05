// APP STATE
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let currentUser = null;
let currentPage = 'dashboard';
let currentFilter = 'ALL';
let searchQuery = '';
let currentFolderPath = []; // Hierarchical navigation: ['08-Organization','03-Job-Descriptions','01-JD-EXE']
let folderEditMode = false; // Toggle for file manager edit mode
let docHeaderMetaCollapsed = true;
const PENDING_AUTH_TTL_MS = 10 * 60 * 1000;
let pendingAuthTimer = null;

function syncCurrentUserRef(user){
  currentUser = user || null;
  try{
    window.currentUser = currentUser;
    window.__currentUser = currentUser;
  }catch(e){}
  return currentUser;
}

syncCurrentUserRef(null);

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
      : 'PhiÃªn thiáº¿t láº­p Authenticator Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.';
  }
  return lang==='en'
    ? 'Authenticator verification timed out. Please sign in again.'
    : 'PhiÃªn xÃ¡c thá»±c OTP Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.';
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
        showToast('âš  ' + ((res && res.error) ? res.error : (lang==='en'?'display_config_load_failed':'KhÃ´ng táº£i Ä‘Æ°á»£c cáº¥u hÃ¬nh hiá»ƒn thá»‹ portal')));
      }
    }catch(e){
      if(!options.silent){
        showToast('âš  ' + ((e && e.message) ? e.message : (lang==='en'?'display_config_load_failed':'KhÃ´ng táº£i Ä‘Æ°á»£c cáº¥u hÃ¬nh hiá»ƒn thá»‹ portal')));
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
    {id:'dashboard', icon:'ðŸ ', label:lang==='en'?'Dashboard':'Dashboard'},
    {id:'documents', icon:'ðŸ“', label:lang==='en'?'All documents':'Táº¥t cáº£ tÃ i liá»‡u'},
    {id:'search', icon:'ðŸ”', label:lang==='en'?'Search':'TÃ¬m kiáº¿m'},
    {id:'dictionary', icon:'ðŸ“–', label:lang==='en'?'Dictionary':'Tá»« Ä‘iá»ƒn thuáº­t ngá»¯'},
    {id:'deploy', icon:'ðŸš€', label:lang==='en'?'Operations deploy':'Triá»ƒn khai váº­n hÃ nh'},
    {id:'exceptions', icon:'\u26a0\ufe0f', label:lang==='en'?'Exception dashboard':'B\u1ea3ng ngo\u1ea1i l\u1ec7'},
    {id:'admin', icon:'âš™', label:'Admin', locked:true},
  ];
}

function portalSidebarSections(){
  return [
    {id:'system', label:lang==='en'?'System documents':'TÃ i liá»‡u há»‡ thá»‘ng'},
    {id:'ops', label:lang==='en'?'Operational documents':'TÃ i liá»‡u váº­n hÃ nh'},
    {id:'train', label:lang==='en'?'Training & competency':'ÄÃ o táº¡o & nÄƒng lá»±c'}
  ];
}

function portalSidebarCategoryItems(){
  return (Array.isArray(CATEGORIES) ? CATEGORIES : []).filter(cat => cat && !cat.hidden).map(cat => ({
    id: String(cat.id||'').toUpperCase(),
    icon: cat.icon || 'â€¢',
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
    showToast(lang==='en'?'âš  Enter a valid extension':'âš  Nháº­p Ä‘uÃ´i file há»£p lá»‡');
    return;
  }
  const draft = ensurePortalDisplayConfigDraft();
  if((draft.extensions.known || []).includes(ext)){
    showToast(lang==='en'?'â„¹ Extension already exists':'â„¹ ÄuÃ´i file Ä‘Ã£ tá»“n táº¡i');
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
      showToast('âš  ' + ((res && res.error) ? res.error : 'save_failed'));
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
    showToast(lang==='en'?'âœ… Portal display settings saved':'âœ… ÄÃ£ lÆ°u cáº¥u hÃ¬nh hiá»ƒn thá»‹ portal');
    if(currentPage === 'admin') renderAdmin();
  }catch(e){
    showToast('âš  ' + ((e && e.message) ? e.message : (lang==='en'?'Server error':'Lá»—i server')));
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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// AUTH
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    if(btn) btn.textContent = (lang==='en' ? 'Verify' : 'XÃ¡c minh');
    document.getElementById('inp-otp')?.focus();
    return;
  }
  if(stage === 'enroll'){
    if(enroll) enroll.style.display = 'block';
    if(btn) btn.textContent = (lang==='en' ? 'Complete' : 'HoÃ n táº¥t');
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

async function onLoggedIn(res){
  csrfToken = res.csrf_token || csrfToken;
  syncCurrentUserRef(res.user || currentUser);

  if(!currentUser){
    // fallback: check status
    try{
      const s = await apiCall('status', null, 'GET');
      if(s.logged_in){ syncCurrentUserRef(s.user); csrfToken = s.csrf_token || csrfToken; }
    }catch(e){}
  }
  // V10 Role migration: map old role keys to new JD-based keys
  if(currentUser && currentUser.role && !(currentUser.role in ROLES)){
    const _RM={general_director:'ceo',deputy_director:'production_director',prod_manager:'cnc_workshop_manager',prod_supervisor:'shift_leader',cnc_setup:'setup_technician',cnc_programmer:'cam_nc_programmer',qms_supervisor:'qms_engineer',doc_controller:'qms_engineer',purchasing_officer:'buyer',procurement_manager:'supply_chain_manager',sales_officer:'estimator',planning_officer:'production_planner',hse_officer:'ehs_specialist',maintenance_tech:'maintenance_technician',finance_officer:'gl_payroll_accountant',finance_manager:'finance_manager',warehouse_staff:'warehouse_clerk',warehouse_lead:'supply_chain_manager',deburr_tech:'deburr_technician',tooling_tech:'tool_storekeeper',clean_tech:'cleaning_packaging_technician',production_engineer:'process_engineer',dfm_engineer:'process_engineer',metrology_specialist:'qc_inspector',receiving_clerk:'warehouse_clerk',storekeeper:'warehouse_clerk',shipping_packing:'logistics_coordinator',trainee:'cnc_operator'};
    if(_RM[currentUser.role]) currentUser.role = _RM[currentUser.role];
  }
  if(!currentUser){
    showLoginError(lang==='en' ? 'Login failed' : 'ÄÄƒng nháº­p tháº¥t báº¡i');
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
      showToast(lang==='en'?'Access denied â€” consent required':'Truy cáº­p bá»‹ tá»« chá»‘i â€” cáº§n Ä‘á»“ng Ã½ Ä‘iá»u khoáº£n');
      syncCurrentUserRef(null); csrfToken = null;
      try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}
      setLoginStage('password');
      return;
    }
  }

  // Geolocation (if enabled)
  let geo = {ok:true, lat:null, lng:null, accuracy:null};
  if(DATA_SETTINGS.collect_gps){
    showToast(lang==='en'?'ðŸ“ Verifying locationâ€¦':'ðŸ“ Äang xÃ¡c minh vá»‹ trÃ­â€¦');
    geo = await requireGeolocation();
    if(!geo.ok){
      const reasons = {
        denied: lang==='en'?'Location access was denied.':'Quyá»n truy cáº­p vá»‹ trÃ­ bá»‹ tá»« chá»‘i.',
        unavailable: lang==='en'?'Location unavailable. Enable GPS.':'KhÃ´ng xÃ¡c Ä‘á»‹nh Ä‘Æ°á»£c vá»‹ trÃ­. Báº­t GPS.',
        timeout: lang==='en'?'Location request timed out.':'YÃªu cáº§u vá»‹ trÃ­ quÃ¡ thá»i gian.',
        not_supported: lang==='en'?'Browser does not support geolocation.':'TrÃ¬nh duyá»‡t khÃ´ng há»— trá»£ Ä‘á»‹nh vá»‹.'
      };
      alert('âš  ' + (reasons[geo.reason] || reasons.denied) + '\n\n' + (lang==='en'?'Session will be terminated.':'PhiÃªn sáº½ káº¿t thÃºc.'));
      syncCurrentUserRef(null); csrfToken = null;
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

function showRecoveryCodes(codes){
  const modal = document.createElement('div');
  modal.className = 'modal-overlay';
  modal.id = 'recovery-modal';
  modal.innerHTML = `
    <div class="modal" style="max-width:520px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <div style="font-weight:700">âœ… ÄÃ£ báº­t 2FA â€” MÃ£ dá»± phÃ²ng</div>
        <button class="btn-admin secondary" onclick="document.getElementById('recovery-modal')?.remove()">âœ• ÄÃ³ng</button>
      </div>
      <div style="font-size:13px;color:var(--text-3);margin-bottom:10px">
        LÆ°u cÃ¡c mÃ£ nÃ y á»Ÿ nÆ¡i an toÃ n. Má»—i mÃ£ chá»‰ dÃ¹ng Ä‘Æ°á»£c 1 láº§n khi báº¡n máº¥t Authenticator.
      </div>
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px">
        ${codes.map(c=>`<code style="padding:8px;border:1px solid var(--border);border-radius:8px;background:#fafafa;text-align:center">${c}</code>`).join('')}
      </div>
    </div>`;
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  document.body.appendChild(modal);
}

// ACCESS CONTROL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// JD DEPARTMENT HELPERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DYNAMIC SUBFOLDER HELPERS â€” derive from actual path
// (replaces old static DEPT_MAP/ORDER blocks)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

// Extract department/subfolder code from document path
// e.g., "05-Processes/01-PROC-CNC/proc-cnc-001.html" â†’ "PROC-CNC"
// e.g., "10-Training-Academy/02-Course-Modules/C01.html" â†’ "Modules"
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
  // After getSubfolderLabel strips "01-" prefix â†’ "JD-Executive"
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
  // Fallback: extract dept code from subfolder name (JD-ENG â†’ ENG, JD-Quality â†’ QA)
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER APP
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
      if(!u || !p){ showLoginError(lang==='en' ? 'Please enter username and password' : 'Vui lÃ²ng nháº­p tÃ i khoáº£n vÃ  máº­t kháº©u'); return; }

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
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'BÆ°á»›c 2: Báº­t 2FA vÃ  nháº­p mÃ£ 6 sá»‘', res.pending_expires_in);
        return;
      }
      if(res.mfa_required){
        csrfToken = res.csrf_token || csrfToken;
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nháº­p mÃ£ xÃ¡c thá»±c 6 sá»‘ tá»« Authenticator', res.pending_expires_in);
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
      if(!otp){ showLoginError(lang==='en' ? 'Enter 6-digit code to confirm' : 'Nháº­p mÃ£ 6 sá»‘ Ä‘á»ƒ xÃ¡c nháº­n'); return; }
      const res = await apiCall('auth_enroll_verify', {code: otp});
      if(!res.ok){
        if(res.error === 'unauthorized' || res.error === 'enroll_expired'){
          resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Authenticator setup timed out. Please sign in again.' : 'PhiÃªn thiáº¿t láº­p Authenticator Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.'});
        } else {
          showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mÃ£'));
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
      if(!otp && !recovery){ showLoginError(lang==='en' ? 'Enter authenticator code or recovery code' : 'Nháº­p mÃ£ xÃ¡c thá»±c hoáº·c mÃ£ dá»± phÃ²ng'); return; }
      const res = await apiCall('auth_mfa_verify', {username:u, password:p, code: otp, recovery: recovery});
      if(!res.ok){
        if(res.error === 'mfa_expired' || res.error === 'unauthorized'){
          resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Authenticator verification timed out. Please sign in again.' : 'PhiÃªn xÃ¡c thá»±c OTP Ä‘Ã£ háº¿t háº¡n. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.'});
        } else {
          showLoginError(res.error || (lang==='en' ? 'Invalid code' : 'Sai mÃ£'));
        }
        return;
      }
      await onLoggedIn(res);
      return;
    }
  }catch(err){
    console.error(err);
    showLoginError(lang==='en' ? 'Cannot connect to server. Please try again.' : 'KhÃ´ng thá»ƒ káº¿t ná»‘i mÃ¡y chá»§. Vui lÃ²ng thá»­ láº¡i.');
  }
}

async function doLogout(){
  clearPendingAuthTimer();
  try{ await apiCall('auth_logout', {}, 'POST'); }catch(e){}

  csrfToken = null;
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
  setLoginChecking(true, lang==='en' ? 'Checking sessionâ€¦' : 'Äang kiá»ƒm tra phiÃªn Ä‘Äƒng nháº­pâ€¦');

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
        syncCurrentUserRef(s.user);
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
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'BÆ°á»›c 2: Báº­t 2FA vÃ  nháº­p mÃ£ 6 sá»‘', s.pending_expires_in);
        return;
      }
      if(s && s.mfa_pending){
        csrfToken = s.csrf_token || null;
        setLoginChecking(false, '');
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nháº­p mÃ£ xÃ¡c thá»±c 6 sá»‘ tá»« Authenticator', s.pending_expires_in);
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
    resetPortalToLogin({stage:'password', errorMsg: lang==='en' ? 'Login session is no longer valid.' : 'PhiÃªn Ä‘Äƒng nháº­p khÃ´ng cÃ²n há»£p lá»‡.'});
    return;
  }

  clearPendingAuthTimer();
  document.getElementById('login-screen').style.display = 'none';
  document.getElementById('app').classList.add('active');
  const r = ROLES[currentUser.role] || {label: currentUser.title||currentUser.role, labelEn: currentUser.title||currentUser.role};
  document.getElementById('hdr-name').textContent = currentUser.name;
  document.getElementById('hdr-title').textContent = (lang==='en' ? (r.labelEn||r.label||currentUser.title||'') : (r.label||currentUser.title||''));
  document.getElementById('dd-name').textContent = currentUser.name;
  document.getElementById('dd-title').textContent = (lang==='en'?(r.labelEn||currentUser.title):currentUser.title) + ' Â· ' + currentUser.dept;
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
        showPendingAuthStage('enroll', lang==='en' ? 'Step 2: Enable 2FA and enter 6-digit code' : 'BÆ°á»›c 2: Báº­t 2FA vÃ  nháº­p mÃ£ 6 sá»‘', status.pending_expires_in);
        return;
      }
      if(status && status.mfa_pending){
        csrfToken = status.csrf_token || null;
        showPendingAuthStage('mfa', lang==='en' ? 'Enter 6-digit authenticator code' : 'Nháº­p mÃ£ xÃ¡c thá»±c 6 sá»‘ tá»« Authenticator', status.pending_expires_in);
        return;
      }
      resetPortalToLogin({
        stage:'password',
        errorMsg: status && status.auth_expired
          ? getPendingAuthExpiredMessage(status.auth_expired)
          : (lang==='en' ? 'Login session is no longer valid. Please sign in again.' : 'PhiÃªn Ä‘Äƒng nháº­p khÃ´ng cÃ²n há»£p lá»‡. Vui lÃ²ng Ä‘Äƒng nháº­p láº¡i.')
      });
      return;
    }
    showToast(lang==='en' ? 'Document index is temporarily unavailable.' : 'Danh má»¥c tÃ i liá»‡u táº¡m thá»i chÆ°a táº£i Ä‘Æ°á»£c.');
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
  try{ if(typeof startLiveDocsSync==='function') startLiveDocsSync(); }catch(e){}
}

function renderSidebar(){
  const nav = document.getElementById('sidebar-nav');
  const VDOCS = getVisibleDocs();

  const SIDEBAR_SECTIONS = portalSidebarSections();
  const coreButtons = [];

  if(isPortalSidebarCoreVisible('dashboard')){
    coreButtons.push(`<button class="nav-item ${currentPage==='dashboard'?'active':''}" onclick="navigateTo('dashboard')"><span class="icon">ðŸ </span><span>${T('dashboard')}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('documents')){
    coreButtons.push(`<button class="nav-item ${currentPage==='documents'?'active':''}" onclick="navigateTo('documents')"><span class="icon">ðŸ“</span><span>${T('all_docs')}</span><span class="badge">${VDOCS.length}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('search')){
    coreButtons.push(`<button class="nav-item ${currentPage==='search'?'active':''}" onclick="navigateTo('search')"><span class="icon">ðŸ”</span><span>${T('search')}</span></button>`);
  }
  if(isPortalSidebarCoreVisible('dictionary')){
    coreButtons.push(`<button class="nav-item ${currentPage==='dictionary'?'active':''}" onclick="navigateTo('dictionary')"><span class="icon">ðŸ“–</span><span>${T('dictionary')}</span><span class="badge" id="dict-badge">${dictData ? dictData.length.toLocaleString() : '...'}</span></button>`);
  }

  let html = coreButtons.length ? `<div class="nav-section">${coreButtons.join('')}</div>` : '';

  if(isPortalSidebarCoreVisible('deploy')){
    // â”€â”€ Sáº¢N XUáº¤T â”€â”€
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'PRODUCTION':'Sáº¢N XUáº¤T'}</div>
      <button class="nav-item ${currentPage==='orders'?'active':''}" onclick="navigateTo('orders')"><span class="icon">ðŸ“¦</span><span>${lang==='en'?'Orders':'ÄÆ¡n hÃ ng'}</span></button>
      <button class="nav-item ${currentPage==='dispatch'?'active':''}" onclick="navigateTo('dispatch')"><span class="icon">ðŸ“‹</span><span>${lang==='en'?'Production Dispatch':'PhÃ¢n cÃ´ng sáº£n xuáº¥t'}</span></button>
      <button class="nav-item ${currentPage==='mes'?'active':''}" onclick="navigateTo('mes')"><span class="icon">ðŸ­</span><span>${lang==='en'?'Shop Floor':'XÆ°á»Ÿng sáº£n xuáº¥t'}</span></button>
      <button class="nav-item ${currentPage==='mobile-shopfloor'?'active':''}" onclick="navigateTo('mobile-shopfloor')"><span class="icon">ðŸ“±</span><span>${lang==='en'?'Operator Mobile':'CÃ´ng nhÃ¢n di Ä‘á»™ng'}</span></button>
      <button class="nav-item ${currentPage==='quoting'?'active':''}" onclick="navigateTo('quoting')"><span class="icon">ðŸ’°</span><span>${lang==='en'?'Quoting':'BÃ¡o giÃ¡'}</span></button>
    </div>`;
    // â”€â”€ CHáº¤T LÆ¯á»¢NG â”€â”€
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'QUALITY':'CHáº¤T LÆ¯á»¢NG'}</div>
      <button class="nav-item ${['quality-exceptions','exceptions'].indexOf(currentPage)>=0?'active':''}" onclick="navigateTo('quality-exceptions')"><span class="icon">ðŸ”´</span><span>${lang==='en'?'Nonconformance':'Sá»± khÃ´ng phÃ¹ há»£p'}</span></button>
      <button class="nav-item ${currentPage==='supplier-quality'?'active':''}" onclick="navigateTo('supplier-quality')"><span class="icon">ðŸª</span><span>${lang==='en'?'Supplier Quality':'Cháº¥t lÆ°á»£ng NCC'}</span></button>
      <button class="nav-item ${currentPage==='fmea'?'active':''}" onclick="navigateTo('fmea')"><span class="icon">âš¡</span><span>${lang==='en'?'FMEA & Control Plan':'FMEA & Control Plan'}</span></button>
      <button class="nav-item ${currentPage==='apqp-ppap'?'active':''}" onclick="navigateTo('apqp-ppap')"><span class="icon">ðŸŽ¯</span><span>${lang==='en'?'APQP / PPAP':'APQP / PPAP'}</span></button>
      <button class="nav-item ${currentPage==='ai-scheduling'?'active':''}" onclick="navigateTo('ai-scheduling')"><span class="icon">ðŸ¤–</span><span>${lang==='en'?'AI Quality':'AI Cháº¥t lÆ°á»£ng'}</span></button>
    </div>`;
    // â”€â”€ Há»’ SÆ  & BÃO CÃO â”€â”€
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'RECORDS & REPORTS':'Há»’ SÆ  & BÃO CÃO'}</div>
      <button class="nav-item ${currentPage==='forms'?'active':''}" onclick="navigateTo('forms')"><span class="icon">ðŸ“‹</span><span>${lang==='en'?'Evidence Control':'Kiá»ƒm soÃ¡t chá»©ng cá»©'}</span></button>
      <button class="nav-item ${currentPage==='evidence'?'active':''}" onclick="navigateTo('evidence')"><span class="icon">ðŸ”’</span><span>${lang==='en'?'Evidence Vault':'Kho chá»©ng cá»©'}</span></button>
      <button class="nav-item ${currentPage==='compliance-reports'?'active':''}" onclick="navigateTo('compliance-reports')"><span class="icon">ðŸ“Š</span><span>${lang==='en'?'Reports':'BÃ¡o cÃ¡o'}</span></button>
      <button class="nav-item ${currentPage==='continuous-improvement'?'active':''}" onclick="navigateTo('continuous-improvement')"><span class="icon">ðŸ”„</span><span>${lang==='en'?'Improvement':'Cáº£i tiáº¿n liÃªn tá»¥c'}</span></button>
      <button class="nav-item ${currentPage==='knowledge-base'?'active':''}" onclick="navigateTo('knowledge-base')"><span class="icon">ðŸ’¡</span><span>${lang==='en'?'Knowledge Base':'Kho kiáº¿n thá»©c'}</span></button>
    </div>`;
    // â”€â”€ CÃ”NG Cá»¤ â”€â”€
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'TOOLS':'CÃ”NG Cá»¤'}</div>
      <button class="nav-item ${currentPage==='cnc-programs'?'active':''}" onclick="navigateTo('cnc-programs')"><span class="icon">âš™</span><span>${lang==='en'?'CNC Programs':'ChÆ°Æ¡ng trÃ¬nh CNC'}</span></button>
      <button class="nav-item ${currentPage==='product-passport'?'active':''}" onclick="navigateTo('product-passport')"><span class="icon">ðŸ”—</span><span>${lang==='en'?'Product Passport':'Há»™ chiáº¿u sáº£n pháº©m'}</span></button>
      <button class="nav-item ${currentPage==='schema-studio'?'active':''}" onclick="navigateTo('schema-studio')"><span class="icon">ðŸ—„</span><span>${lang==='en'?'Schema Studio':'Schema Studio'}</span></button>
      <button class="nav-item ${currentPage==='energy-dashboard'?'active':''}" onclick="navigateTo('energy-dashboard')"><span class="icon">âš¡</span><span>${lang==='en'?'Energy':'NÄƒng lÆ°á»£ng'}</span></button>
      <button class="nav-item ${currentPage==='deploy'?'active':''}" onclick="navigateTo('deploy')"><span class="icon">ðŸš€</span><span>${lang==='en'?'Deploy':'Triá»ƒn khai'}</span></button>
      <button class="nav-item ${currentPage==='customer-portal'?'active':''}" onclick="navigateTo('customer-portal')"><span class="icon">ðŸŒ</span><span>${lang==='en'?'Customer Portal':'Cá»•ng khÃ¡ch hÃ ng'}</span></button>
    </div>`;
    // NÃºt + Táº¡o Module má»›i (luÃ´n hiá»‡n cho admin)
    if(isAdmin()){
      html += `<div class="nav-section" style="padding:0 8px"><button class="nav-item" onclick="navigateTo('module-builder')" style="border:1px dashed rgba(255,255,255,0.3);justify-content:center;opacity:0.7"><span class="icon">âž•</span><span>${lang==='en'?'Create Module':'Táº¡o Module má»›i'}</span></button></div>`;
    }
  }
  if(isAdmin() && isPortalSidebarCoreVisible('admin')){
    html += `<div class="nav-section"><div class="nav-section-title">ADMIN</div><button class="nav-item ${currentPage==='admin'?'active':''}" onclick="navigateTo('admin')"><span class="icon">âš™</span><span>${T('admin_panel')}</span></button></div>`;
  }

  if(isAdmin()){
    html += `<div class="nav-section"><div class="nav-section-title">${lang==='en'?'TEMPLATE LAB':'TEMPLATE LAB'}</div>
      <button class="nav-item ${currentPage==='template-demo'?'active':''}" onclick="navigateTo('template-demo')"><span class="icon">ðŸ§©</span><span>${lang==='en'?'Master Module Template':'Master Module Template'}</span></button>
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
        <span class="icon">${cat.icon}</span><span>${catLabel(cat)}</span><span class="badge">${locked?'ðŸ”’':cnt}</span>
      </button>`;
    });
    html += '</div>';
  });

  nav.innerHTML = html;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// NAVIGATION
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    ? (lang==='en' ? 'Loading Module Builder...' : 'Äang náº¡p Module Builder...')
    : 'Module Builder';
  var body = mode === 'loading'
    ? (lang==='en'
        ? 'Please wait while the builder runtime is reloaded.'
        : 'Vui lÃ²ng chá» trong khi há»‡ thá»‘ng náº¡p láº¡i runtime cá»§a builder.')
    : (lang==='en'
        ? 'The builder could not be loaded automatically. Please reload once.'
        : 'KhÃ´ng thá»ƒ náº¡p Module Builder tá»± Ä‘á»™ng. Vui lÃ²ng táº£i láº¡i má»™t láº§n.');
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
        '<button class="hm-btn hm-btn-primary" onclick="navigateTo(\'module-builder\', undefined, true)">' + (lang==='en' ? 'Retry builder' : 'Thá»­ náº¡p láº¡i builder') + '</button>' +
        '<button class="hm-btn hm-btn-secondary" onclick="window.location.reload()">' + (lang==='en' ? 'Reload page' : 'Táº£i láº¡i trang') + '</button>' +
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

function navigateTo(page, filter, bypassGuard){
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
  document.querySelectorAll('#content > .page').forEach(p=>p.classList.remove('active'));
  document.getElementById('doc-viewer').classList.remove('active');
  document.getElementById('user-dropdown').classList.remove('show');
  
  // Track page view for activity log
  const pageTitles = {dashboard:'Tá»•ng quan',documents:'Danh sÃ¡ch tÃ i liá»‡u',search:'TÃ¬m kiáº¿m',dictionary:'Tá»« Ä‘iá»ƒn thuáº­t ngá»¯',access:'Ma tráº­n truy cáº­p',admin:'Quáº£n trá»‹ há»‡ thá»‘ng',deploy:'Triá»ƒn khai váº­n hÃ nh',mes:'Trung tÃ¢m Ä‘iá»u hÃ nh MES',exceptions:'Báº£ng ngoáº¡i lá»‡',orders:'Quáº£n lÃ½ Ä‘Æ¡n hÃ ng',forms:'Kiá»ƒm soÃ¡t chá»©ng cá»©','quality-exceptions':'Quáº£n lÃ½ ngoáº¡i lá»‡ cháº¥t lÆ°á»£ng','supplier-quality':'Quáº£n lÃ½ cháº¥t lÆ°á»£ng NCC','quoting':'BÃ¡o giÃ¡ & Æ¯á»›c tÃ­nh',evidence:'Kho chá»©ng cá»©','customer-portal':'Cá»•ng khÃ¡ch hÃ ng','cnc-programs':'ChÆ°Æ¡ng trÃ¬nh CNC','product-passport':'Há»™ chiáº¿u sáº£n pháº©m sá»‘','ai-scheduling':'AI Cháº¥t lÆ°á»£ng & Lá»‹ch trÃ¬nh','compliance-reports':'BÃ¡o cÃ¡o tuÃ¢n thá»§',fmea:'FMEA & Control Plan','apqp-ppap':'APQP / PPAP','mobile-shopfloor':'XÆ°á»Ÿng di Ä‘á»™ng','knowledge-base':'Kho kiáº¿n thá»©c','continuous-improvement':'Cáº£i tiáº¿n liÃªn tá»¥c','energy-dashboard':'GiÃ¡m sÃ¡t nÄƒng lÆ°á»£ng','schema-studio':'Schema Studio'};
  pageTitles['module-builder'] = 'Module Builder';
  trackPageView(page + (filter ? '/'+filter : ''), (pageTitles[page]||page) + (filter ? ' â€” '+filter : ''));
  
  const titles = {dashboard:T('bc_dashboard'),documents:T('bc_documents'),search:T('bc_search'),dictionary:T('bc_dictionary'),access:T('bc_access'),deploy:lang==='en'?'Operations Deployment':'Triá»ƒn khai váº­n hÃ nh',mes:lang==='en'?'MES Control Center':'Trung tÃ¢m Ä‘iá»u hÃ nh MES',exceptions:lang==='en'?'Exception Dashboard':'Báº£ng ngoáº¡i lá»‡',orders:lang==='en'?'Order Management':'Quáº£n lÃ½ Ä‘Æ¡n hÃ ng',forms:lang==='en'?'Evidence Control':'Kiá»ƒm soÃ¡t chá»©ng cá»©','quality-exceptions':lang==='en'?'Quality Exception Hub':'Quáº£n lÃ½ ngoáº¡i lá»‡ cháº¥t lÆ°á»£ng','supplier-quality':lang==='en'?'Supplier Quality':'Quáº£n lÃ½ cháº¥t lÆ°á»£ng NCC',quoting:lang==='en'?'Quoting & Estimation':'BÃ¡o giÃ¡ & Æ¯á»›c tÃ­nh',evidence:lang==='en'?'Evidence Vault':'Kho chá»©ng cá»©','customer-portal':lang==='en'?'Customer Portal Admin':'Quáº£n trá»‹ cá»•ng khÃ¡ch hÃ ng','cnc-programs':lang==='en'?'CNC Programs':'ChÆ°Æ¡ng trÃ¬nh CNC','product-passport':lang==='en'?'Digital Product Passport':'Há»™ chiáº¿u sáº£n pháº©m sá»‘','ai-scheduling':lang==='en'?'AI Quality & Scheduling':'AI Cháº¥t lÆ°á»£ng & Lá»‹ch trÃ¬nh','compliance-reports':lang==='en'?'Compliance Reports':'BÃ¡o cÃ¡o tuÃ¢n thá»§',fmea:lang==='en'?'FMEA & Control Plan':'FMEA & Control Plan','apqp-ppap':lang==='en'?'APQP / PPAP':'APQP / PPAP','mobile-shopfloor':lang==='en'?'Shop Floor Mobile':'XÆ°á»Ÿng di Ä‘á»™ng','knowledge-base':lang==='en'?'Knowledge Base':'Kho kiáº¿n thá»©c','continuous-improvement':lang==='en'?'Continuous Improvement':'Cáº£i tiáº¿n liÃªn tá»¥c','energy-dashboard':lang==='en'?'Energy Monitor':'GiÃ¡m sÃ¡t nÄƒng lÆ°á»£ng','schema-studio':'Schema Studio'};
  titles['template-demo'] = 'Master Module Template';
  titles['module-builder'] = 'Module Builder';
  // Reset header breadcrumb for non-documents pages
  if(page !== 'documents'){
    const bcEl = document.getElementById('header-breadcrumb');
    if(bcEl) bcEl.innerHTML = `<span>HESEM QMS</span><span style="margin:0 4px">â€º</span><span class="current">${titles[page]||page}</span>`;
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
  if(page==='forms' && typeof renderOnlineForms==='function') renderOnlineForms();
  if(page==='quality-exceptions' && typeof window._renderQualityExceptionHub==='function'){ var qep=document.getElementById('page-quality-exceptions'); if(qep) window._renderQualityExceptionHub(qep); }
  if(page==='supplier-quality' && typeof window._renderSupplierQuality==='function'){ var sqp=document.getElementById('page-supplier-quality'); if(sqp) window._renderSupplierQuality(sqp); }
  if(page==='quoting' && typeof window._renderQuotingEngine==='function'){ var qtp=document.getElementById('page-quoting'); if(qtp) window._renderQuotingEngine(qtp); }
  if(page==='evidence' && typeof window._renderEvidenceVault==='function'){ var evp=document.getElementById('page-evidence'); if(evp) window._renderEvidenceVault(evp); }
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
  if(page==='apqp-ppap' && typeof window._renderApqpPpap==='function'){ var app=document.getElementById('page-apqp-ppap'); if(app) window._renderApqpPpap(app); }
  if(page==='mobile-shopfloor' && typeof window._renderMobileShopFloor==='function'){ var msp=document.getElementById('page-mobile-shopfloor'); if(msp) window._renderMobileShopFloor(msp); }
  if(page==='knowledge-base' && typeof window._renderKnowledgeBase==='function'){ var kbp=document.getElementById('page-knowledge-base'); if(kbp) window._renderKnowledgeBase(kbp); }
  if(page==='continuous-improvement' && typeof window._renderContinuousImprovement==='function'){ var cip=document.getElementById('page-continuous-improvement'); if(cip) window._renderContinuousImprovement(cip); }
  if(page==='energy-dashboard' && typeof window._renderEnergyDashboard==='function'){ var edp=document.getElementById('page-energy-dashboard'); if(edp) window._renderEnergyDashboard(edp); }
  if(page==='dispatch' && typeof window._renderProductionDispatch==='function'){ var dsp=document.getElementById('page-dispatch'); if(dsp) window._renderProductionDispatch(dsp); }
  if(page==='module-builder'){ renderModuleBuilderPage(); }
  if(page==='schema-studio' && typeof window._renderSchemaStudio==='function'){ var ssp=document.getElementById('page-schema-studio'); if(ssp) window._renderSchemaStudio(ssp); }
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

  const doc = resolveDocRecord(code);
  if(!doc) return;
  const resolvedCode = String(doc.code || '').trim();

  // Block access to hidden documents for non-admins
  if(isDocHidden(doc.code) && !isAdmin()){
    showToast(lang==='en' ? 'This document is currently hidden by Admin.' : 'TÃ i liá»‡u nÃ y hiá»‡n Ä‘ang bá»‹ áº©n bá»Ÿi Admin.');
    return;
  }
  if(!canAccessDoc(doc.code)) return;

  // â”€â”€ Unsaved Changes Guard â”€â”€
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
  trackPageView('doc/'+resolvedCode, (isDownloadOnlyDoc(doc)?'ðŸ“Š ':'ðŸ“„ ')+displayCode+' â€” '+displayTitle.substring(0,60));
  editMode=false;
  editingDoc=null;
  currentDoc=resolvedCode;
  window.currentDocPath = String(doc.path || '');
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
    let bcHtml = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];navigateTo('documents')">ðŸ </span>`;
    // Add category if we came from one
    if(currentFilter && currentFilter !== 'ALL'){
      const cat = CATEGORIES.find(c=>c.id===currentFilter);
      bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
      bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];navigateTo('documents','${currentFilter}')">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    }
    // Add folder path
    for(let i=0; i<currentFolderPath.length; i++){
      const seg = currentFolderPath[i];
      const label = getSubfolderLabel(seg);
      bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
      bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});navigateTo('documents')">${label}</span>`;
    }
    const safeCode = (typeof escapeHtml === 'function') ? escapeHtml(displayCode) : displayCode;
    const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(displayTitle) : displayTitle;
    bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span><span style="font-weight:700">${safeCode}</span>`;
    if(displayTitle && displayTitle.toUpperCase() !== displayCode.toUpperCase()){
      bcHtml += `<span style="color:var(--text-3);margin:0 6px">â€¢</span><span class="current">${safeTitle}</span>`;
    }
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
  loadDocContent(doc);

  // Background: refresh server-backed state + versions, then re-render once
  try{
    refreshDocFromServer(resolvedCode).then(()=>{
      try{
        updateDocViewerHeader(doc);
        renderWorkflowPanel(doc);
        renderVersionHistory(doc);
        // Re-load iframe in case the resolved view file changed (draft / inreview / archive)
        loadDocContent(doc);
      }catch(e){}
    }).catch(()=>{});
  }catch(e){}
}

// Refresh the currently-open document preview (header, workflow, DCR record, iframe)
// without navigating away. This is used after server-side state changes (approve/new revision).
async function openDocPreview(code){
  try{
    const doc = resolveDocRecord(code);
    if(!doc) return;
    const resolvedCode = String(doc.code || '').trim();
    // Pull the latest server state/versions to keep folder-sync accurate
    try{ await refreshDocFromServer(resolvedCode); }catch(e){}

    // Ensure doc viewer is active
    currentDoc = resolvedCode;
    window.currentDocPath = String(doc.path || '');
    setDocHeaderMetaCollapsed(true);
    const viewer = document.getElementById('doc-viewer');
    if(viewer) viewer.classList.add('active');

    // Re-render UI blocks
    updateDocViewerHeader(doc);
    renderWorkflowPanel(doc);
    renderVersionHistory(doc);
    loadDocContent(doc);
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
        ${renderDocHeaderButton(lang==='en'?'Upload draft':'Upload báº£n nhÃ¡p', 'upload', 'primary', `uploadFormDraft('${doc.code}')`)}
        ${activeDraft?renderDocHeaderButton(T('wf_submit_review'), 'submit', 'accent', `submitWorkbookForReview('${doc.code}')`):''}
        ${hasDiscardableWorkbookDraft?renderDocHeaderButton(lang==='en'?'Discard draft':'Há»§y nhÃ¡p', 'cancel', 'danger', `deleteDraft('${doc.code}')`):''}
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
  if(desc) doc.__displayDesc = desc;

  if(String(currentDoc || '') !== String(doc.code || '')) return;

  try{
    const bc = document.getElementById('header-breadcrumb');
    if(bc){
      const displayCode = (typeof getDocDisplayCode === 'function') ? getDocDisplayCode(doc) : String(doc.code || '').trim();
      const displayTitle = getDocDisplayTitle(doc);
      let bcHtml = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];navigateTo('documents')">ðŸ </span>`;
      if(currentFilter && currentFilter !== 'ALL'){
        const cat = CATEGORIES.find(c=>c.id===currentFilter);
        bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
        bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];navigateTo('documents','${currentFilter}')">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
      }
      for(let i=0; i<currentFolderPath.length; i++){
        const seg = currentFolderPath[i];
        const label = getSubfolderLabel(seg);
        bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
        bcHtml += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});navigateTo('documents')">${label}</span>`;
      }
      const safeCode = (typeof escapeHtml === 'function') ? escapeHtml(displayCode) : displayCode;
      const safeTitle = (typeof escapeHtml === 'function') ? escapeHtml(displayTitle) : displayTitle;
      bcHtml += `<span style="color:var(--text-3);margin:0 4px">â€º</span><span style="font-weight:700">${safeCode}</span>`;
      if(displayTitle && displayTitle.toUpperCase() !== displayCode.toUpperCase()){
        bcHtml += `<span style="color:var(--text-3);margin:0 6px">â€¢</span><span class="current">${safeTitle}</span>`;
      }
      bc.innerHTML = bcHtml;
    }
  }catch(e){}

  try{ updateDocViewerHeader(doc); }catch(e){}
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
    lastEditMeta=`<div class="dv-meta-note edit"><span class="dv-meta-note-label">${lang==='en'?'Last edited by':'NgÆ°á»i chá»‰nh sá»­a cuá»‘i'}</span><b>${le.by}</b><span>${le.role?le.role+' Â· ':''}${le.date||''}</span></div>`;
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
  const isWorkbook = isDownloadOnlyDoc(doc);
  const detailToggleLabel = docHeaderMetaCollapsed
    ? (lang==='en' ? 'Show details' : 'Hiá»‡n chi tiáº¿t')
    : (lang==='en' ? 'Hide details' : 'áº¨n chi tiáº¿t');
  const detailToggleHtml = renderDocHeaderButton(
    detailToggleLabel,
    docHeaderMetaCollapsed ? 'expand' : 'collapse',
    'neutral',
    'toggleDocHeaderMeta()',
    'dv-detail-toggle',
    `aria-expanded="${docHeaderMetaCollapsed?'false':'true'}"`
  );
  const ownerEditButton = canEdit(doc)
    ? '<button class="dv-meta-edit" onclick="event.stopPropagation();editDocMeta(\''+doc.code+'\',\'owner\')" title="'+(lang==='en'?'Edit owner':'Chá»‰nh chá»§ sá»Ÿ há»¯u')+'">'+(lang==='en'?'Edit':'Sá»­a')+'</button>'
    : '';
  const approverEditButton = canEdit(doc)
    ? '<button class="dv-meta-edit" onclick="event.stopPropagation();editDocMeta(\''+doc.code+'\',\'approver\')" title="'+(lang==='en'?'Edit approver':'Chá»‰nh ngÆ°á»i duyá»‡t')+'">'+(lang==='en'?'Edit':'Sá»­a')+'</button>'
    : '';
  const activityNotes = [submittedMeta, lastEditMeta, approvedMeta].filter(Boolean).join('');
  const navActionsHtml = isWorkbook
    ? `<div class="dv-action-group dv-nav-actions">
          ${detailToggleHtml}
          ${renderDocHeaderButton(T('back'), 'back', 'neutral', 'closeDocViewer()')}
          ${renderDocHeaderButton(lang==='en'?'Download':'Táº£i vá»', 'download', 'neutral', `downloadCurrentDoc('${doc.code}')`)}
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
        <div class="dv-code" style="color:${cat.color}">${displayCode} <span style="display:inline-block;padding:2px 10px;border-radius:10px;font-size:10px;font-weight:700;background:${statusColor(status)}18;color:${statusColor(status)}">${statusLabel(status)}</span></div>
        <div class="dv-name">${displayTitle}</div>
        ${displayDesc ? `<div class="dv-desc">${displayDesc}</div>` : ''}
      </div>
    </div>
    <div class="dv-meta${docHeaderMetaCollapsed ? ' is-collapsed' : ''}">
      <div class="dv-meta-grid">
        <div class="dv-meta-item"><span class="dv-meta-label">${T('code_label')}</span><div class="dv-meta-value"><b>${displayCode}</b></div></div>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// RENDER PAGES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

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
      title = lang==='en'?'Edit Document Owner':'Chá»‰nh sá»­a Chá»§ sá»Ÿ há»¯u';
      // Build department list from CATEGORIES or known departments
      options = ['QA/QMS','Production','Engineering','Sales','Purchasing','HR/Admin','IT','Finance','Warehouse','Planning','Quality','Maintenance','Management'];
    } else if(field === 'approver'){
      currentVal = (state.approver || (lang==='en'?'General Director':'Tá»•ng GiÃ¡m Äá»‘c'));
      title = lang==='en'?'Edit Approver':'Chá»‰nh sá»­a NgÆ°á»i phÃª duyá»‡t';
      options = [lang==='en'?'General Director':'Tá»•ng GiÃ¡m Äá»‘c', 'QMR', 'QA Manager', 'Production Manager', 'Engineering Manager'];
      // Add admin users if available
      try{
        if(typeof adminUsers !== 'undefined' && Array.isArray(adminUsers)){
          adminUsers.forEach(u=>{ if(u.name && !options.includes(u.name)) options.push(u.name); });
        }
      }catch(e){}
    }
    
    const newVal = prompt(title + '\n\n' + (lang==='en'?'Current':'Hiá»‡n táº¡i') + ': ' + currentVal + '\n\n' + (lang==='en'?'Options':'TÃ¹y chá»n') + ': ' + options.join(', ') + '\n\n' + (lang==='en'?'Enter new value:':'Nháº­p giÃ¡ trá»‹ má»›i:'), currentVal);
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
    showToast((lang==='en'?'Updated ':'ÄÃ£ cáº­p nháº­t ') + field);
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
        <h3 style="color:#d97706">ðŸ“¬ ${T('pending_approval')} <span style="background:#fef3c7;color:#d97706;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:6px">${pendingDocs.length}</span></h3>
        <div style="max-height:300px;overflow-y:auto">
          ${pendingDocs.map(d=>{
            const cat=getCatForDoc(d);
            const state=getDocState(d.code);
            const submitter=state&&state.submittedBy?state.submittedBy.name:'â€”';
            const subDate=state&&state.submittedBy?state.submittedBy.date:'';
            const subType=state&&state.submittedBy&&state.submittedBy.updateType?state.submittedBy.updateType:'';
            const subTypeBadge=subType?('<span style="display:inline-block;padding:1px 6px;border-radius:4px;font-size:9px;font-weight:700;margin-left:4px;'+(subType==='major'?'background:#fee2e2;color:#dc2626':'background:#dcfce7;color:#16a34a')+'">'+(subType==='major'?'MAJOR':'MINOR')+'</span>'):'';
            return `<div class="pa-card" onclick="openDoc('${d.code}')">
              <div class="pa-badge" style="background:#3b82f615;color:#3b82f6">ðŸ“¤ IN REVIEW</div>
              <div class="pa-info">
                <div class="pa-code">${d.code}${subTypeBadge}</div>
                <div class="pa-title">${d.title}</div>
                <div class="pa-sub">${T('submitted_by')}: ${submitter} Â· ${subDate} Â· v${getDocRevision(d)}</div>
              </div>
              <span style="color:#1565c0;font-size:18px">â†’</span>
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
        <h3 style="color:#6366f1">ðŸ“ ${T('my_drafts')} <span style="background:#eef2ff;color:#6366f1;padding:2px 10px;border-radius:10px;font-size:12px;margin-left:6px">${myEditing.length}</span></h3>
        <div style="max-height:200px;overflow-y:auto">
          ${myEditing.map(d=>{
            const state=getDocState(d.code);
            return `<div class="pa-card" onclick="openDoc('${d.code}')">
              <div class="pa-badge" style="background:#f59e0b15;color:#f59e0b">ðŸ“‹ DRAFT</div>
              <div class="pa-info">
                <div class="pa-code">${d.code}</div>
                <div class="pa-title">${d.title}</div>
                <div class="pa-sub">v${getDocRevision(d)} Â· ${state&&state.lastEdit?state.lastEdit.date:''}</div>
              </div>
              <span style="color:#1565c0;font-size:18px">â†’</span>
            </div>`;
          }).join('')}
        </div>
      </div>`;
  }

  // High-impact execution shortcuts (RFQ â†’ Cash, G0â€“G7)
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
      <div class="stat-card" style="cursor:pointer;border-left:3px solid #059669" onclick="showFilteredDocs('recent')"><div class="value" style="color:#059669">${ruCount}</div><div class="label">${lang==='en'?'Updated (30d)':'Cáº­p nháº­t (30d)'}</div><div class="sub">${lang==='en'?'Last 30 days':'30 ngÃ y qua'}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('approved')"><div class="value" style="color:#2e7d32">${approvedCount}</div><div class="label">${T('approved')}</div><div class="sub">${T('effective')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('draft')"><div class="value" style="color:#f57f17">${draftCount}</div><div class="label">${T('draft')}</div><div class="sub">${T('editing')}</div></div>
      <div class="stat-card" style="cursor:pointer;${r.approve&&reviewCount>0?'border:2px solid #f59e0b':''}" onclick="showFilteredDocs('review')"><div class="value" style="color:#d97706">${reviewCount}</div><div class="label">${T('in_review_label')}</div><div class="sub">${r.approve&&reviewCount>0?T('click_review'):T('pending_waiting')}</div></div>
      <div class="stat-card" style="cursor:pointer" onclick="showFilteredDocs('accessible')"><div class="value" style="color:#6366f1">${accessibleDocs.length}</div><div class="label">${T('accessible')}</div><div class="sub">${T('by_role')} ${lang==='en'?(r.labelEn||r.label):r.label}</div></div>
    </div>
    <div id="dash-pending">${pendingHtml}${draftsHtml}</div>
    <div class="card" style="margin-top:12px">
      <h3 style="margin-bottom:8px">ðŸ­ ${lang==='en'?'Job Order Lifecycle â€” G0 â†’ G7 (8 Gates)':'VÃ²ng Ä‘á»i Ä‘Æ¡n hÃ ng â€” G0 â†’ G7 (8 cá»•ng)'}</h3>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;overflow-x:auto;padding:4px 0 8px">
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #4CAF50;background:#f8fdf8;min-width:0"><div style="font-weight:700;font-size:11px;color:#2e7d32;margin-bottom:3px">G0</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Contract</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'RFQ, order entry':'Xem xÃ©t RFQ, nháº­p Ä‘Æ¡n'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-201');return false" style="color:#0369a1">SOP-201</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #1565C0;background:#f0f4ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#0d47a1;margin-bottom:3px">G1</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Engineering</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'DFM, CAM/NC, baseline':'DFM, CAM/NC, baseline'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-303');return false" style="color:#0369a1">SOP-303</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #795548;background:#faf6f3;min-width:0"><div style="font-weight:700;font-size:11px;color:#4e342e;margin-bottom:3px">G2</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">IQC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Receiving, incoming QC':'Nháº­n hÃ ng, KT Ä‘áº§u vÃ o'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('WI-701');return false" style="color:#0369a1">WI-701</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #2196F3;background:#f5f9ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#1565c0;margin-bottom:3px">G3</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Setup</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Program, machine setup':'CT, setup mÃ¡y'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-504');return false" style="color:#0369a1">SOP-504</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #FF9800;background:#fffbf0;min-width:0"><div style="font-weight:700;font-size:11px;color:#e65100;margin-bottom:3px">G4</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">FAI</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'First article inspection':'Kiá»ƒm tra bÃ i Ä‘áº§u tiÃªn'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-302');return false" style="color:#0369a1">SOP-302</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #9C27B0;background:#fdf5ff;min-width:0"><div style="font-weight:700;font-size:11px;color:#7b1fa2;margin-bottom:3px">G5</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">IPQC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'In-process QC, SPC':'KS trong quÃ¡ trÃ¬nh'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-502');return false" style="color:#0369a1">SOP-502</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #00BCD4;background:#f0fdff;min-width:0"><div style="font-weight:700;font-size:11px;color:#00838f;margin-bottom:3px">G6</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Final QC</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Final inspection, pack':'KT cuá»‘i, Ä‘Ã³ng gÃ³i'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a></div></div>
        <div style="border:1px solid #e5e7eb;border-radius:8px;padding:8px;border-top:3px solid #F44336;background:#fff5f5;min-width:0"><div style="font-weight:700;font-size:11px;color:#c62828;margin-bottom:3px">G7</div><div style="font-size:9px;color:#333;font-weight:600;margin-bottom:4px">Ship</div><div style="font-size:9px;color:#666;margin-bottom:5px">${lang==='en'?'Shipment, CoC':'Giao hÃ ng, CoC'}</div><div style="font-size:9px"><a href="#" onclick="openDoc('SOP-605');return false" style="color:#0369a1">SOP-605</a></div></div>
      </div>
    </div>
    <div class="grid-2" style="margin-top:12px">
      <div class="card">
        <h3>ðŸ‘¤ ${lang==='en'?'Quick Access by Role':'Truy cáº­p nhanh theo vai trÃ²'}</h3>
        <div style="display:grid;grid-template-columns:1fr;gap:6px;font-size:12px">
          <div style="padding:8px 10px;border-left:3px solid #2196F3;border-radius:4px;background:#f5f9ff"><b>CNC Operator</b> â€” <a href="#" onclick="openDoc('SOP-502');return false" style="color:#0369a1">SOP-502</a> Â· <a href="#" onclick="openDoc('SOP-504');return false" style="color:#0369a1">SOP-504</a> Â· <a href="#" onclick="openDoc('WI-519');return false" style="color:#0369a1">WI-519</a></div>
          <div style="padding:8px 10px;border-left:3px solid #4CAF50;border-radius:4px;background:#f8fdf8"><b>QC Inspector</b> â€” <a href="#" onclick="openDoc('SOP-302');return false" style="color:#0369a1">SOP-302</a> Â· <a href="#" onclick="openDoc('SOP-604');return false" style="color:#0369a1">SOP-604</a> Â· <a href="#" onclick="openDoc('SOP-601');return false" style="color:#0369a1">SOP-601</a></div>
          <div style="padding:8px 10px;border-left:3px solid #FF9800;border-radius:4px;background:#fffbf0"><b>Team Leader / Foreman</b> â€” <a href="#" onclick="openDoc('WI-202');return false" style="color:#0369a1">WI-202</a> Â· <a href="#" onclick="openDoc('SOP-501');return false" style="color:#0369a1">SOP-501</a> Â· <a href="#" onclick="openDoc('SOP-606');return false" style="color:#0369a1">SOP-606</a></div>
          <div style="padding:8px 10px;border-left:3px solid #9C27B0;border-radius:4px;background:#fdf5ff"><b>Planner / Engineer</b> â€” <a href="#" onclick="openDoc('SOP-501');return false" style="color:#0369a1">SOP-501</a> Â· <a href="#" onclick="openDoc('SOP-303');return false" style="color:#0369a1">SOP-303</a> Â· <a href="#" onclick="openDoc('SOP-103');return false" style="color:#0369a1">SOP-103</a></div>
          <div style="padding:8px 10px;border-left:3px solid #0C2D48;border-radius:4px;background:#f0f4f8"><b>Manager / Director</b> â€” <a href="#" onclick="openDoc('SOP-902');return false" style="color:#0369a1">SOP-902</a> Â· <a href="#" onclick="openDoc('WI-901');return false" style="color:#0369a1">WI-901</a> Â· <a href="#" onclick="openDoc('ANNEX-122');return false" style="color:#0369a1">ANNEX-122</a></div>
          <div style="padding:8px 10px;border-left:3px solid #00BCD4;border-radius:4px;background:#f0fdff"><b>IT / QMS Admin</b> â€” <a href="#" onclick="openDoc('SOP-101');return false" style="color:#0369a1">SOP-101</a> Â· <a href="#" onclick="openDoc('SOP-104');return false" style="color:#0369a1">SOP-104</a> Â· <a href="#" onclick="openDoc('ANNEX-101');return false" style="color:#0369a1">ANNEX-101</a></div>
        </div>
      </div>
      <div class="card">
        <h3>ðŸ“‹ ${lang==='en'?'Key Documents & Matrices':'TÃ i liá»‡u trá»ng yáº¿u'}</h3>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-120')"><b>Authority Matrix</b><span style="color:#0369a1;font-size:11px">ANNEX-120 â†’</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-121')"><b>RACI Master</b><span style="color:#0369a1;font-size:11px">ANNEX-121 â†’</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-122')"><b>KPI Cascade Dictionary</b><span style="color:#0369a1;font-size:11px">ANNEX-122 â†’</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-123')"><b>Deputy / Backup Matrix</b><span style="color:#0369a1;font-size:11px">ANNEX-123 â†’</span></div>
          <div style="padding:8px 10px;border:1px solid #e5e7eb;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('WI-201')"><b>Quality Gates & Hold Points</b><span style="color:#0369a1;font-size:11px">WI-201 â†’</span></div>
          <div style="padding:8px 10px;border:1px solid #fee2e2;border-left:3px solid #ef4444;border-radius:6px;cursor:pointer;display:flex;justify-content:space-between" onclick="openDoc('ANNEX-118')"><b>âš  Offline Fallback Kit</b><span style="color:#ef4444;font-size:11px">ANNEX-118 â†’</span></div>
        </div>
      </div>
    </div>
    <div class="card" style="margin-top:12px">
      <h3>ðŸ“Š ${lang==='en'?'Operational KPIs â€” ISO 9001:2026 Â§9.1':'KPI váº­n hÃ nh â€” ISO 9001:2026 Â§9.1'}</h3>
      <div style="display:grid;grid-template-columns:repeat(8,1fr);gap:6px;font-size:12px">
        <div style="padding:10px;border:1px solid #dcfce7;border-radius:8px;background:#f0fdf4;text-align:center;min-width:0"><div style="font-size:10px;color:#166534;font-weight:600;text-transform:uppercase">OTD</div><div style="font-size:18px;font-weight:700;color:#16a34a;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'On-Time Delivery':'Giao hÃ ng Ä‘Ãºng háº¡n'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¥ 95%</div></div>
        <div style="padding:10px;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;text-align:center;min-width:0"><div style="font-size:10px;color:#1e40af;font-weight:600;text-transform:uppercase">FPY</div><div style="font-size:18px;font-weight:700;color:#2563eb;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'First Pass Yield':'Tá»· lá»‡ Ä‘áº¡t láº§n Ä‘áº§u'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¥ 98%</div></div>
        <div style="padding:10px;border:1px solid #fef3c7;border-radius:8px;background:#fffbeb;text-align:center;min-width:0"><div style="font-size:10px;color:var(--amber);font-weight:600;text-transform:uppercase">COPQ</div><div style="font-size:18px;font-weight:700;color:#d97706;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'Cost of Poor Quality':'Chi phÃ­ CL kÃ©m'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¤ 2%</div></div>
        <div style="padding:10px;border:1px solid #fee2e2;border-radius:8px;background:#fef2f2;text-align:center;min-width:0"><div style="font-size:10px;color:var(--red);font-weight:600;text-transform:uppercase">NCR</div><div style="font-size:18px;font-weight:700;color:#dc2626;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'Open NCRs':'NCR Ä‘ang má»Ÿ'}</div><div style="font-size:9px;color:#999;margin-top:2px">= 0</div></div>
        <div style="padding:10px;border:1px solid #f3e8ff;border-radius:8px;background:#faf5ff;text-align:center;min-width:0"><div style="font-size:10px;color:#6b21a8;font-weight:600;text-transform:uppercase">IQC Pass</div><div style="font-size:18px;font-weight:700;color:#7c3aed;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'IQC Pass Rate':'Tá»· lá»‡ Ä‘áº¡t IQC'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¥ 99%</div></div>
        <div style="padding:10px;border:1px solid #e0f2fe;border-radius:8px;background:#f0f9ff;text-align:center;min-width:0"><div style="font-size:10px;color:#075985;font-weight:600;text-transform:uppercase">OEE</div><div style="font-size:18px;font-weight:700;color:#0284c7;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'Equipment Effectiveness':'Hiá»‡u suáº¥t thiáº¿t bá»‹'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¥ 85%</div></div>
        <div style="padding:10px;border:1px solid #dbeafe;border-radius:8px;background:#eff6ff;text-align:center;min-width:0"><div style="font-size:10px;color:#1e3a5f;font-weight:600;text-transform:uppercase">ENG FTR</div><div style="font-size:18px;font-weight:700;color:#1565c0;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'Eng First-Time-Right':'KT Ä‘Ãºng láº§n Ä‘áº§u'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¥ 95%</div></div>
        <div style="padding:10px;border:1px solid #fce7f3;border-radius:8px;background:#fdf2f8;text-align:center;min-width:0"><div style="font-size:10px;color:#831843;font-weight:600;text-transform:uppercase">ECN Lead</div><div style="font-size:18px;font-weight:700;color:#be185d;margin:4px 0">â€”</div><div style="font-size:9px;color:#666">${lang==='en'?'Eng Change Lead':'TG thay Ä‘á»•i KT'}</div><div style="font-size:9px;color:#999;margin-top:2px">â‰¤ 48h</div></div>
      </div>
      <div style="margin-top:8px;font-size:10px;color:var(--text-3);text-align:right"><a href="#" onclick="openDoc('ANNEX-122');return false" style="color:#0369a1">${lang==='en'?'Full KPI Dictionary':'Tá»« Ä‘iá»ƒn KPI Ä‘áº§y Ä‘á»§'} â†’ ANNEX-122</a> Â· <a href="#" onclick="openDoc('WI-901');return false" style="color:#0369a1">${lang==='en'?'Dashboard Guide':'HÆ°á»›ng dáº«n Dashboard'} â†’ WI-901</a></div>
    </div>
    `;
/* OLD DASHBOARD CODE REMOVED â€” see git history for reference */
}

var _lastDocRenderTarget = 'page-documents';
function renderDocuments(targetContainerId){
  if(targetContainerId) _lastDocRenderTarget = targetContainerId;
  const el = document.getElementById(_lastDocRenderTarget || 'page-documents');
  const VDOCS = getVisibleDocs();

  // â•â•â• Update header breadcrumb â•â•â•
  updateDocBreadcrumb();

  // â•â•â• SEARCH MODE: flat list â•â•â•
  if(searchQuery){
    const q = searchQuery.toLowerCase();
    const filtered = VDOCS.filter(d => d.code.toLowerCase().includes(q) || d.title.toLowerCase().includes(q));
    el.innerHTML = renderDocSearchBar(VDOCS) + renderDocFileList(filtered);
    return;
  }

  // â•â•â• ALL DOCS MODE: show category cards â•â•â•
  if(currentFilter === 'ALL' && currentFolderPath.length === 0){
    el.innerHTML = renderDocSearchBar(VDOCS) + renderDocCategoryGrid(VDOCS);
    return;
  }

  // â•â•â• CATEGORY/FOLDER BROWSING MODE â•â•â•
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
        <button class="fm-btn primary" onclick="openCreateFolderDialog()">ðŸ“ ${lang==='en'?'New folder':'Táº¡o folder'}</button>
        <button class="fm-btn primary" onclick="openCreateDocModalQuick()">ðŸ“„ ${lang==='en'?'New document':'Táº¡o tÃ i liá»‡u'}</button>
        <span style="font-size:11px;color:var(--text-3)">${lang==='en'?'Drag to move':'KÃ©o tháº£ Ä‘á»ƒ di chuyá»ƒn'}</span>
      ` : ''}
      <button class="fm-btn ${folderEditMode?'active':''}" onclick="folderEditMode=!folderEditMode;renderDocuments()">
        ${folderEditMode?'âœ• '+(lang==='en'?'Exit':'ThoÃ¡t'):'âœï¸ '+(lang==='en'?'Edit':'Chá»‰nh sá»­a')}
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
          ${folderEditMode?`<button class="fm-del-btn" onclick="event.stopPropagation();confirmDeleteFolder('${escapeHtml(sub.path)}','${escapeHtml(subKey)}')" title="${lang==='en'?'Delete folder':'XÃ³a folder'}">âœ•</button>`:''}
          <div class="fm-icon" style="position:relative">
            <div class="folder-tab"></div>
            <div class="folder-back"></div>
            <div class="folder-front"></div>
            <div class="folder-dept-icon">${getFolderIcon(subKey)}</div>
            ${allSubDocs.length>0?`<div class="folder-badge">${allSubDocs.length}</div>`:''}
          </div>
          <div class="fm-label">${label}</div>
          <div class="fm-desc">${getFolderDesc(sub.path) || (allSubDocs.length > 0 ? `${allSubDocs.length} ${lang==='en'?'docs':'tÃ i liá»‡u'}${isLocked?' ðŸ”’':''}` : (lang==='en'?'Empty folder':'ThÆ° má»¥c trá»‘ng'))}</div>
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
    fileHtml = `<div class="fm-empty">${lang==='en'?'This folder is empty':'ThÆ° má»¥c nÃ y trá»‘ng'}</div>`;
  }

  el.innerHTML = renderDocSearchBar(VDOCS) + toolbar + folderHtml + fileHtml;
}

// â•â•â• DYNAMIC HEADER BREADCRUMB â•â•â•
function updateDocBreadcrumb(){
  const bcEl = document.getElementById('header-breadcrumb');
  if(!bcEl || currentPage !== 'documents') return;

  let html = `<span style="cursor:pointer;font-size:16px" onclick="currentFilter='ALL';currentFolderPath=[];renderDocuments();renderSidebar()">ðŸ </span>`;

  if(currentFilter !== 'ALL'){
    const cat = CATEGORIES.find(c=>c.id===currentFilter);
    html += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
    if(currentFolderPath.length > 0){
      html += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=[];renderDocuments()">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    } else {
      html += `<span style="font-weight:700;color:var(--text-1)">${cat?cat.icon:''} ${cat?catLabel(cat).split('(')[0].trim():currentFilter}</span>`;
    }
  }

  for(let i=0; i<currentFolderPath.length; i++){
    const seg = currentFolderPath[i];
    const label = getSubfolderLabel(seg);
    html += `<span style="color:var(--text-3);margin:0 4px">â€º</span>`;
    if(i < currentFolderPath.length - 1){
      html += `<span style="cursor:pointer;color:var(--accent);font-weight:600" onclick="currentFolderPath=currentFolderPath.slice(0,${i+1});renderDocuments()">ðŸ“ ${label}</span>`;
    } else {
      html += `<span style="font-weight:700;color:var(--text-1)">ðŸ“ ${label}</span>`;
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
        <div class="fm-count">${cnt} ${lang==='en'?'docs':'tÃ i liá»‡u'}</div>
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
      <span></span><span>${lang==='en'?'Document code / Standard title':'MÃ£ tÃ i liá»‡u / TÃªn file chuáº©n'}</span><span>${T('rev')}</span><span>${T('status')}</span><span>${T('access')}</span>
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
        <div class="fm-file-access">${locked?'<span style="color:var(--red)">ðŸ”’</span>':'<span style="color:var(--green)">âœ“</span>'}</div>
        ${folderEditMode&&canCreateNewDoc()?`<div class="fm-file-del"><button class="fm-del-btn-row" onclick="event.stopPropagation();confirmDeleteDoc('${escapeHtml(doc.code)}','${escapeHtml(displayTitle)}')" title="${lang==='en'?'Delete':'XÃ³a'}">ðŸ—‘ï¸</button></div>`:''}
      </div>`;
  });
  html += `</div>`;
  return html;
}

// â•â•â• EDIT MODE: Folder creation dialog â•â•â•
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
        <div style="font-weight:700;font-size:16px">ðŸ“ ${lang==='en'?'Create New Folder':'Táº¡o Folder Má»›i'}</div>
        <button class="btn-admin secondary" onclick="document.getElementById('folder-create-modal')?.remove()">âœ•</button>
      </div>
      <div class="modal-field">
        <label>${lang==='en'?'Folder name':'TÃªn folder'}</label>
        <input id="nf-name" type="text" placeholder="VD: PROC-NEW, Templates" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px" autofocus>
      </div>
      <div style="margin-top:10px;font-size:12px;color:var(--text-3)">
        ðŸ“‚ ${lang==='en'?'Will create':'Sáº½ táº¡o'}: <code>${parentPath}/<b>${String(nextNum).padStart(2,'0')}</b>-<span id="nf-preview">???</span>/</code>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-admin secondary" onclick="document.getElementById('folder-create-modal')?.remove()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="doCreateFolder(${nextNum})">ðŸ“ ${lang==='en'?'Create':'Táº¡o'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
  const nameEl=document.getElementById('nf-name'), prevEl=document.getElementById('nf-preview');
  nameEl.addEventListener('input', ()=>{ prevEl.textContent=nameEl.value||'???'; });
}

async function doCreateFolder(nextNum){
  const name = (document.getElementById('nf-name')?.value||'').trim().replace(/[^A-Za-z0-9_-]/g,'-');
  if(!name){ showToast(lang==='en'?'Enter folder name':'Nháº­p tÃªn folder'); return; }
  const folderName = String(nextNum).padStart(2,'0') + '-' + name;
  const catDocs = DOCS.filter(d=>d.cat===currentFilter);
  const treeNode = ((typeof getCategoryTreeRoot === 'function') ? getCategoryTreeRoot(currentFilter, catDocs) : null) || getBestTreeNodeForCategory(currentFilter, catDocs);
  const currentNode = resolveTreeNodeForCategory(currentFilter, currentFolderPath, catDocs);
  const parentPath = currentNode ? currentNode.path : (treeNode ? treeNode.path : '');
  try {
    const res = await apiCall('create_folder', {parent: parentPath, name: folderName});
    if(res && res.ok){
      showToast('âœ… ' + (lang==='en'?'Folder created':'ÄÃ£ táº¡o folder'));
      document.getElementById('folder-create-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 Error: ' + e.message); }
}

// â•â•â• QUICK CREATE DOC â€” defaults to current folder â•â•â•
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
        <div style="font-weight:700;font-size:16px">ðŸ“„ ${lang==='en'?'Create New Document':'Táº¡o TÃ i Liá»‡u Má»›i'}</div>
        <button class="btn-admin secondary" onclick="document.getElementById('quick-create-modal')?.remove()">âœ•</button>
      </div>
      <div style="margin-bottom:10px;padding:8px 12px;background:var(--bg-2);border-radius:8px;font-size:12px">
        ðŸ“‚ ${lang==='en'?'Folder':'Folder'}: <b>${folderPath}/</b>
      </div>
      <div class="modal-field">
        <label>${lang==='en'?'Document code':'MÃ£ tÃ i liá»‡u'}</label>
        <input id="qc-code" type="text" placeholder="VD: PROC-CNC-003" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px" autofocus>
      </div>
      <div class="modal-field" style="margin-top:8px">
        <label>${lang==='en'?'English standard title / file name':'TÃªn file / tiÃªu Ä‘á» chuáº©n'}</label>
        <input id="qc-title" type="text" placeholder="${lang==='en'?'English standard title':'TÃªn file / tiÃªu Ä‘á» chuáº©n tiáº¿ng Anh'}" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px">
      </div>
      <div class="modal-field" style="margin-top:8px">
        <label>${lang==='en'?'Owner':'Chá»§ sá»Ÿ há»¯u'}</label>
        <select id="qc-owner" style="width:100%;padding:8px;border:1px solid var(--border);border-radius:8px">
          ${ownerOpts.map(o=>`<option value="${o.v}" ${o.v===ownerDept?'selected':''}>${o.v}</option>`).join('')}
        </select>
      </div>
      <div style="margin-top:16px;display:flex;gap:8px;justify-content:flex-end">
        <button class="btn-admin secondary" onclick="document.getElementById('quick-create-modal')?.remove()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="doQuickCreateDoc('${escapeHtml(folderPath)}','${escapeHtml(currentFilter)}')">ðŸ“„ ${lang==='en'?'Create':'Táº¡o'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

async function doQuickCreateDoc(folder, cat){
  const code = (document.getElementById('qc-code')?.value||'').trim();
  const title = (document.getElementById('qc-title')?.value||'').trim();
  const owner = (document.getElementById('qc-owner')?.value||'').trim();
  if(!code){ showToast(lang==='en'?'Enter doc code':'Nháº­p mÃ£ tÃ i liá»‡u'); return; }
  if(!title){ showToast(lang==='en'?'Enter title':'Nháº­p tiÃªu Ä‘á»'); return; }
  if(!ensureEnglishStandardTitle(title)) return;
  try {
    const res = await apiCall('doc_create', {code, title, cat, owner, folder, revision:'0.0'});
    if(res && res.ok){
      showToast('âœ… ' + code);
      document.getElementById('quick-create-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}

// â•â•â• DRAG & DROP â•â•â•
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
      showToast(`âœ… ${code} â†’ ${getSubfolderLabel(targetFolderPath.split('/').pop())}`);
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Move failed'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}



// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FOLDER CONTEXT MENU (rename, edit description)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function openFolderEditMenu(event, folderPath, folderKey){
  event.stopPropagation();
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const menu = document.createElement('div');
  menu.className = 'fm-context-menu';
  menu.style.cssText = `position:fixed;top:${event.clientY}px;left:${event.clientX}px;z-index:9999;background:#fff;border:1px solid var(--border);border-radius:10px;box-shadow:0 8px 30px rgba(0,0,0,.15);padding:6px 0;min-width:180px`;
  const vi=lang!=='en';
  menu.innerHTML = `
    <div class="ctx-item" onclick="openFolderEditDialog('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">âœï¸ ${vi?'Chá»‰nh sá»­a folder':'Edit folder'}</div>
    ${canCreateNewDoc()?`<div class="ctx-item ctx-danger" onclick="confirmDeleteFolder('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">ðŸ—‘ï¸ ${vi?'XÃ³a folder':'Delete folder'}</div>`:''}
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
    <div class="ctx-item" onclick="openDoc('${escapeHtml(code)}')">ðŸ“„ ${vi?'Má»Ÿ tÃ i liá»‡u':'Open document'}</div>
    <div class="ctx-item" onclick="openDocEditDialog('${escapeHtml(code)}')">âœï¸ ${vi?'Chá»‰nh sá»­a thÃ´ng tin':'Edit info'}</div>
    ${canCreateNewDoc()?`<div style="border-top:1px solid #f1f3f5;margin:4px 0"></div><div class="ctx-item ctx-danger" onclick="confirmDeleteDoc('${escapeHtml(code)}','${escapeHtml(standardTitle)}')">ðŸ—‘ï¸ ${vi?'XÃ³a tÃ i liá»‡u':'Delete document'}</div>`:''}
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

// â•â•â• UNIFIED FOLDER EDIT DIALOG (name + desc + icon) â•â•â•
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
        <div class="modal-title">âœï¸ ${lang==='en'?'Edit Folder':'Chá»‰nh Sá»­a Folder'}</div>
        <button class="icon-btn" onclick="document.getElementById('folder-edit-modal')?.remove()">âœ•</button>
      </div>
      <div class="modal-body">
        <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">ðŸ“‚ ${escapeHtml(folderPath)}</div>

        <div class="modal-grid-2">
          <div class="modal-field" style="flex:1">
            <label>${lang==='en'?'Folder name':'TÃªn folder'} (${numPrefix}...)</label>
            <input id="fe-name" type="text" value="${escapeHtml(currentName)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px" autofocus>
            <div style="font-size:10px;color:var(--text-3);margin-top:2px">${lang==='en'?'Preview':'Xem trÆ°á»›c'}: <code>${numPrefix}<span id="fe-preview">${escapeHtml(currentName)}</span></code></div>
          </div>
          <div class="modal-field" style="width:80px">
            <label>${lang==='en'?'Icon':'Biá»ƒu tÆ°á»£ng'}</label>
            <button id="fe-icon-btn" onclick="showIconPickerInline('folder','${escapeHtml(folderKey)}','fe-icon-btn')" 
              style="width:60px;height:48px;font-size:28px;border:1.5px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all .15s"
              onmouseenter="this.style.borderColor='var(--accent)'" onmouseleave="this.style.borderColor='var(--border)'"
            >${curIcon}</button>
          </div>
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'Description / Notes':'Ghi chÃº / MÃ´ táº£'}</label>
          <textarea id="fe-desc" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;font-size:13px" placeholder="${lang==='en'?'Brief description':'MÃ´ táº£ ngáº¯n'}">${escapeHtml(desc)}</textarea>
        </div>

        <div style="margin-top:8px;font-size:10px;color:var(--text-3)">âš ï¸ ${lang==='en'?'Renaming updates all internal links automatically':'Äá»•i tÃªn sáº½ cáº­p nháº­t táº¥t cáº£ liÃªn káº¿t ná»™i bá»™ tá»± Ä‘á»™ng'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" onclick="document.getElementById('folder-edit-modal')?.remove()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="doSaveFolderEdit('${escapeHtml(folderPath)}','${escapeHtml(folderKey)}')">ðŸ’¾ ${lang==='en'?'Save':'LÆ°u'}</button>
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
        showToast(`âœ… ${lang==='en'?'Saved':'ÄÃ£ lÆ°u'} (${res.updated_files} ${lang==='en'?'files':'tá»‡p'})`);
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
    showToast('âœ… '+(lang==='en'?'Saved':'ÄÃ£ lÆ°u'));
  }
  document.getElementById('folder-edit-modal')?.remove();
  renderDocuments(); renderSidebar();
}

// â•â•â• UNIFIED DOC EDIT DIALOG (code + title + desc) â•â•â•
function titleHasNonAsciiChars(text){
  return /[^\x20-\x7E]/.test(String(text||''));
}

function ensureEnglishStandardTitle(title){
  const value = String(title || '').trim();
  if(!value){
    showToast(lang==='en'?'âš  Missing standard title':'âš  Thiáº¿u tÃªn file chuáº©n');
    return false;
  }
  if(titleHasNonAsciiChars(value)){
    showToast(lang==='en'?'âš  Standard title must be English (ASCII only)':'âš  TÃªn file chuáº©n pháº£i lÃ  tiáº¿ng Anh (ASCII)');
    return false;
  }
  if(!/[A-Za-z]/.test(value)){
    showToast(lang==='en'?'âš  Invalid standard title':'âš  TÃªn file chuáº©n khÃ´ng há»£p lá»‡');
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
        <div class="modal-title">âœï¸ ${lang==='en'?'Edit Document':'Chá»‰nh Sá»­a TÃ i Liá»‡u'}</div>
        <button class="icon-btn" onclick="document.getElementById('doc-edit-modal')?.remove()">âœ•</button>
      </div>
      <div class="modal-body">
        <div class="modal-grid-2">
          <div class="modal-field" style="flex:1">
            <label>${lang==='en'?'Document code':'MÃ£ tÃ i liá»‡u'}</label>
            <input id="de-code" type="text" value="${escapeHtml(code)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px;font-weight:600">
          </div>
          <div class="modal-field" style="width:80px">
            <label>${lang==='en'?'Icon':'Biá»ƒu tÆ°á»£ng'}</label>
            <button id="de-icon-btn" onclick="showIconPickerInline('doc','${escapeHtml(code)}','de-icon-btn')" 
              style="width:60px;height:48px;font-size:28px;border:1.5px solid var(--border);border-radius:10px;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center"
            >${curIcon}</button>
          </div>
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'English standard title / file name':'TÃªn file / tiÃªu Ä‘á» chuáº©n'}</label>
          <input id="de-title" data-original="${escapeHtml(standardTitle)}" type="text" value="${escapeHtml(standardTitle)}" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;font-size:13px">
        </div>

        <div class="modal-field" style="margin-top:10px">
          <label>${lang==='en'?'Vietnamese description':'MÃ´ táº£ tiáº¿ng Viá»‡t'}</label>
          <textarea id="de-desc" rows="2" style="width:100%;padding:8px 12px;border:1.5px solid var(--border);border-radius:8px;resize:vertical;font-size:13px" placeholder="${lang==='en'?'Brief Vietnamese description':'MÃ´ táº£ ngáº¯n báº±ng tiáº¿ng Viá»‡t'}">${escapeHtml(desc)}</textarea>
        </div>

        <div style="margin-top:8px;font-size:10px;color:var(--text-3)">âš ï¸ ${lang==='en'?'Document code + English standard title are SSOT for filename and header title. Vietnamese description syncs to the header note.':'MÃ£ tÃ i liá»‡u + tÃªn file / tiÃªu Ä‘á» chuáº©n lÃ  SSOT cho filename vÃ  title header. MÃ´ táº£ tiáº¿ng Viá»‡t Ä‘á»“ng bá»™ vÃ o ghi chÃº trÃªn header.'}</div>
      </div>
      <div class="modal-actions">
        <button class="btn-admin" onclick="document.getElementById('doc-edit-modal')?.remove()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="doSaveDocEdit('${escapeHtml(code)}')">ðŸ’¾ ${lang==='en'?'Save':'LÆ°u'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click',e=>{ if(e.target===modal) modal.remove(); });
}

async function doSaveDocEdit(oldCode){
  const newCode = (document.getElementById('de-code')?.value||'').trim();
  const titleEl = document.getElementById('de-title');
  const newTitle = (titleEl?.value||'').trim();
  const originalTitle = (titleEl?.dataset?.original||'').trim();
  const desc = (document.getElementById('de-desc')?.value||'').trim();
  const currentDocMeta = DOCS.find(d=>d.code===oldCode) || {};
  const originalDesc = String(getDocDesc(oldCode) || getDocDisplayDescription(currentDocMeta) || '').trim();
  if(!newCode){
    showToast(lang==='en'?'âš  Missing document code':'âš  Thiáº¿u mÃ£ tÃ i liá»‡u');
    return;
  }
  if(!ensureEnglishStandardTitle(newTitle)) return;

  const codeChanged = newCode !== oldCode;
  const titleChanged = newTitle !== originalTitle;
  const descChanged = desc !== originalDesc;

  // Rename file + sync header title when code, standard title, or header note changes
  if(codeChanged || titleChanged || descChanged){
    try {
      const res = await apiCall('rename_doc', {old_code: oldCode, new_code: newCode, new_title: newTitle, new_desc: desc});
      if(res && res.ok){
        showToast(`âœ… ${lang==='en'?'Saved':'ÄÃ£ lÆ°u'}`);
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
    showToast('âœ… '+(lang==='en'?'Saved':'ÄÃ£ lÆ°u'));
  }
  document.getElementById('doc-edit-modal')?.remove();
  renderDocuments();
}

// â•â•â• INLINE ICON PICKER (opens in modal context) â•â•â•
function showIconPickerInline(targetType, targetId, btnId){
  // Remove existing picker
  document.querySelectorAll('.icon-picker-inline').forEach(p=>p.remove());
  const btn = document.getElementById(btnId);
  if(!btn) return;
  const rect = btn.getBoundingClientRect();
  
  const catLabels={docs:'ðŸ“„ TÃ i liá»‡u',folders:'ðŸ“ ThÆ° má»¥c',departments:'ðŸ¢ PhÃ²ng ban',tools:'ðŸ”§ CÃ´ng cá»¥',industry:'ðŸ­ NgÃ nh',objects:'ðŸŽª Äá»‘i tÆ°á»£ng',symbols:'âœ¨ Biá»ƒu tÆ°á»£ng',nature:'ðŸŒ Tá»± nhiÃªn',flags:'ðŸ³ï¸ Cá»',food:'ðŸœ áº¨m thá»±c',hands:'ðŸ¤ Biá»ƒu cáº£m'};
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
    <a href="#" onclick="event.preventDefault();applyIconInline('${targetType}','${escapeHtml(targetId)}','','${btnId}')" style="font-size:11px;color:#dc2626">${lang==='en'?'Reset to default':'Äáº·t láº¡i máº·c Ä‘á»‹nh'}</a>
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

// â•â•â• DELETE DOCUMENT â€” double confirmation + archive â•â•â•
function confirmDeleteDoc(code, title){
  document.querySelectorAll('.fm-context-menu').forEach(m=>m.remove());
  const vi=lang!=='en';
  const modal=document.createElement('div');
  modal.className='modal-overlay';
  modal.id='delete-confirm-modal';
  modal.innerHTML=`
    <div class="modal" style="max-width:460px">
      <div class="modal-header" style="background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));border-bottom:1px solid color-mix(in srgb, var(--red) 24%, var(--border))">
        <h3 style="color:var(--red);font-size:16px;display:flex;align-items:center;gap:8px">ðŸ—‘ï¸ ${vi?'XÃ³a tÃ i liá»‡u':'Delete Document'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">âœ•</button>
      </div>
      <div style="padding:20px">
        <div style="background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 24%, var(--border));border-radius:8px;padding:12px;margin-bottom:16px;display:flex;gap:10px;align-items:start">
          <span style="font-size:20px;flex-shrink:0">âš ï¸</span>
          <div style="font-size:13px;color:var(--amber);line-height:1.5">
            ${vi?'Báº¡n Ä‘ang xÃ³a tÃ i liá»‡u:':'You are about to delete:'}
            <div style="margin-top:6px;font-weight:700;color:var(--text-primary)">${code} â€” ${title||'(untitled)'}</div>
            <div style="margin-top:8px;font-size:12px;color:var(--text-secondary)">${vi?'TÃ i liá»‡u sáº½ Ä‘Æ°á»£c chuyá»ƒn vÃ o thÆ° má»¥c <b>_Deleted</b> vÃ  cÃ³ thá»ƒ khÃ´i phá»¥c bá»Ÿi Admin.':'The document will be moved to <b>_Deleted</b> folder and can be recovered by Admin.'}</div>
          </div>
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'TÃ´i xÃ¡c nháº­n muá»‘n xÃ³a tÃ i liá»‡u nÃ y':'I confirm I want to delete this document'}
          </label>
        </div>
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Há»§y':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:var(--red);color:var(--text-inverse,#fff);opacity:.5;cursor:not-allowed" onclick="executeDeleteDoc('${escapeHtml(code)}')">ðŸ—‘ï¸ ${vi?'XÃ³a vÄ©nh viá»…n':'Delete'}</button>
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
      showToast('âœ… '+(vi?'ÄÃ£ xÃ³a tÃ i liá»‡u '+code:'Deleted document '+code));
      document.getElementById('delete-confirm-modal')?.remove();
      // Close doc viewer if this doc is open
      if(typeof closeDocViewerForce==='function')closeDocViewerForce();
      await rescanDocs();
      renderDocuments();
      renderSidebar();
    }else{
      const errMap={
        'doc_not_found':vi?'KhÃ´ng tÃ¬m tháº¥y tÃ i liá»‡u':'Document not found',
        'forbidden':vi?'Báº¡n khÃ´ng cÃ³ quyá»n xÃ³a':'Permission denied',
        'move_failed':vi?'KhÃ´ng thá»ƒ di chuyá»ƒn file':'Failed to move file',
        'delete_failed':vi?'XÃ³a tÃ i liá»‡u tháº¥t báº¡i trÃªn server':'Document delete failed on server',
        'server_error':vi?'Lá»—i server khi xÃ³a tÃ i liá»‡u':'Server error while deleting document'
      };
      showToast('\u26A0 '+(errMap[res?.error]||res?.error||'Error'));
    }
  }catch(e){
    showToast('\u26A0 Error: '+e.message);
  }
}

// â•â•â• DELETE FOLDER â€” double confirmation + archive â•â•â•
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
        <h3 style="color:var(--red);font-size:16px;display:flex;align-items:center;gap:8px">ðŸ—‘ï¸ ${vi?'XÃ³a folder':'Delete Folder'}</h3>
        <button class="icon-btn" onclick="document.getElementById('delete-confirm-modal')?.remove()">âœ•</button>
      </div>
      <div style="padding:20px">
        <div style="background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 24%, var(--border));border-radius:8px;padding:12px;margin-bottom:16px">
          <div style="display:flex;gap:10px;align-items:start">
            <span style="font-size:20px;flex-shrink:0">âš ï¸</span>
            <div style="font-size:13px;color:var(--amber);line-height:1.5">
              ${vi?'Báº¡n Ä‘ang xÃ³a folder:':'You are about to delete folder:'}
              <div style="margin-top:6px;font-weight:700;color:var(--text-primary);font-size:15px">ðŸ“ ${label}</div>
              <div style="margin-top:4px;font-size:11px;color:var(--text-secondary);font-family:monospace">${folderPath}</div>
            </div>
          </div>
          ${fileCount>0||subCount>0?`
          <div style="margin-top:12px;padding:10px;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--red) 24%, var(--border));border-radius:6px">
            <div style="font-size:12px;color:var(--red);font-weight:600">${vi?'âš ï¸ Cáº£nh bÃ¡o: Folder nÃ y chá»©a dá»¯ liá»‡u!':'âš ï¸ Warning: This folder contains data!'}</div>
            <div style="font-size:12px;color:var(--red);margin-top:4px">${fileCount>0?`â€¢ ${fileCount} ${vi?'tÃ i liá»‡u':'document(s)'}`:''} ${subCount>0?`â€¢ ${subCount} ${vi?'folder con':'subfolder(s)'}`:''}</div>
            <div style="font-size:11px;color:var(--text-secondary);margin-top:4px">${vi?'Táº¥t cáº£ sáº½ Ä‘Æ°á»£c chuyá»ƒn vÃ o _Deleted':'All will be moved to _Deleted'}</div>
          </div>`:''}
        </div>
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'TÃ´i xÃ¡c nháº­n muá»‘n xÃ³a folder nÃ y':'I confirm I want to delete this folder'}
          </label>
        </div>
        ${fileCount>0?`
        <div style="margin-bottom:12px">
          <label style="font-size:12px;font-weight:600;color:var(--red);display:flex;align-items:center;gap:6px">
            <input type="checkbox" id="del-confirm-check2" style="width:16px;height:16px;accent-color:var(--red)">
            ${vi?'TÃ´i hiá»ƒu ráº±ng '+fileCount+' tÃ i liá»‡u bÃªn trong cÅ©ng sáº½ bá»‹ xÃ³a':'I understand that '+fileCount+' documents inside will also be deleted'}
          </label>
        </div>`:''}
        <div style="display:flex;gap:10px;justify-content:flex-end">
          <button class="btn-admin secondary" onclick="document.getElementById('delete-confirm-modal')?.remove()">${vi?'Há»§y':'Cancel'}</button>
          <button class="btn-admin" id="del-confirm-btn" disabled style="background:var(--red);color:var(--text-inverse,#fff);opacity:.5;cursor:not-allowed" onclick="executeDeleteFolder('${escapeHtml(folderPath)}')">ðŸ—‘ï¸ ${vi?'XÃ³a folder':'Delete folder'}</button>
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
      showToast('âœ… '+(vi?'ÄÃ£ xÃ³a folder'+(cnt>0?' ('+cnt+' tÃ i liá»‡u)':''):'Deleted folder'+(cnt>0?' ('+cnt+' docs)':'')));
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
        'folder_not_found':vi?'KhÃ´ng tÃ¬m tháº¥y folder':'Folder not found',
        'forbidden':vi?'Báº¡n khÃ´ng cÃ³ quyá»n xÃ³a':'Permission denied',
        'cannot_delete_system_folder':vi?'KhÃ´ng thá»ƒ xÃ³a folder há»‡ thá»‘ng':'Cannot delete system folder',
        'move_failed':vi?'KhÃ´ng thá»ƒ di chuyá»ƒn folder':'Failed to move folder',
        'delete_failed':vi?'XÃ³a folder tháº¥t báº¡i trÃªn server':'Folder delete failed on server',
        'server_error':vi?'Lá»—i server khi xÃ³a folder':'Server error while deleting folder'
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
  if(!newName){ showToast(lang==='en'?'Enter name':'Nháº­p tÃªn'); return; }
  try {
    const res = await apiCall('rename_folder', {old_path: oldPath, new_name: newName});
    if(res && res.ok){
      showToast(`âœ… ${lang==='en'?'Renamed':'ÄÃ£ Ä‘á»•i tÃªn'} (${res.updated_files} ${lang==='en'?'files updated':'tá»‡p cáº­p nháº­t'})`);
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
  showToast('âœ… ' + (lang==='en'?'Saved':'ÄÃ£ lÆ°u'));
  document.getElementById('edit-desc-modal')?.remove();
  renderDocuments();
}

// Legacy: openRenameDocDialog replaced by openDocEditDialog
function openRenameDocDialog(code, title){ openDocEditDialog(code); }

async function doRenameDoc(oldCode){
  const newCode = (document.getElementById('rd-code')?.value||'').trim();
  const newTitle = (document.getElementById('rd-title')?.value||'').trim();
  if(!newCode && !newTitle){ showToast(lang==='en'?'Enter code or title':'Nháº­p mÃ£ hoáº·c tiÃªu Ä‘á»'); return; }
  try {
    const res = await apiCall('rename_doc', {old_code: oldCode, new_code: newCode, new_title: newTitle});
    if(res && res.ok){
      showToast(`âœ… ${lang==='en'?'Renamed':'ÄÃ£ Ä‘á»•i tÃªn'}`);
      document.getElementById('rename-doc-modal')?.remove();
      await rescanDocs();
      renderDocuments();
    } else {
      showToast('\u26A0 ' + (res?.detail || res?.error || 'Error'));
    }
  } catch(e){ showToast('\u26A0 ' + e.message); }
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// FOLDER STRUCTURE MAP â€” mirrors actual server filesystem
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
  CNC:{vi:'CNC',en:'CNC'},ENG:{vi:'Ká»¹ thuáº­t',en:'Engineering'},FIN:{vi:'TÃ i chÃ­nh',en:'Finance'},
  HR:{vi:'NhÃ¢n sá»±',en:'HR'},HSE:{vi:'An toÃ n',en:'HSE'},IT:{vi:'CNTT',en:'IT'},
  MNT:{vi:'Báº£o trÃ¬',en:'Maintenance'},OPS:{vi:'Váº­n hÃ nh',en:'Operations'},
  PLA:{vi:'Káº¿ hoáº¡ch',en:'Planning'},PUR:{vi:'Mua hÃ ng',en:'Purchasing'},
  QA:{vi:'QA/QC',en:'QA/QC'},QMS:{vi:'Há»‡ thá»‘ng QMS',en:'QMS System'},
  SAL:{vi:'Kinh doanh',en:'Sales'},WHS:{vi:'Kho váº­n',en:'Warehouse'},
  EXE:{vi:'Ban Ä‘iá»u hÃ nh',en:'Executive'},PRO:{vi:'Sáº£n xuáº¥t',en:'Production'},
  GDL:{vi:'HÆ°á»›ng dáº«n',en:'Guidelines'},
};

// Auto-generated dept label from folder name (e.g., "01-PROC-CNC" â†’ "PROC-CNC")
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
  {id:'SOP',  label:'SOP â€” Quy trÃ¬nh há»‡ thá»‘ng',  labelEn:'SOP â€” Standard Operating Procedure'},
  {id:'PROC', label:'PROC â€” Quy trÃ¬nh phÃ²ng ban',  labelEn:'PROC â€” Department Process'},
  {id:'WI',   label:'WI â€” HÆ°á»›ng dáº«n cÃ´ng viá»‡c',   labelEn:'WI â€” Work Instruction'},
  {id:'FRM',  label:'FRM â€” Biá»ƒu máº«u / Há»“ sÆ¡',    labelEn:'FRM â€” Forms & Records'},
  {id:'ORG',  label:'ORG â€” Tá»• chá»©c & NhÃ¢n sá»±',    labelEn:'ORG â€” Organization & HR'},
  {id:'ANNEX',label:'ANNEX â€” Phá»¥ lá»¥c',labelEn:'ANNEX â€” Annexes'},
  {id:'POL',  label:'POL â€” ChÃ­nh sÃ¡ch',            labelEn:'POL â€” Policy'},
  {id:'MAN',  label:'MAN â€” Sá»• tay cháº¥t lÆ°á»£ng',    labelEn:'MAN â€” Quality Manual'},
  {id:'TRN',  label:'TRN â€” ÄÃ o táº¡o & NÄƒng lá»±c',   labelEn:'TRN â€” Training & Competency'},
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
      return {value: name, label: name + ' â€” ' + txt, path: path};
    });
  }
  return [];
}

function openCreateDocModal(cat){
  if(!canCreateNewDoc()){
    showToast(lang==='en'?'âš  You do not have permission to create new documents':'âš  Báº¡n khÃ´ng cÃ³ quyá»n táº¡o má»›i tÃ i liá»‡u');
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
      return `<option value="${opt.value}">${getSubfolderLabel(opt.value)} â€” ${txt}</option>`;
    }).join('');
  };

  modal.innerHTML=`
    <div class="modal" style="max-width:640px">
      <div class="modal-header">
        <div class="modal-title">${lang==='en'?'Create new document':'Táº¡o má»›i tÃ i liá»‡u'}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">âœ•</button>
      </div>

      <div class="modal-body">
        <!-- ROW 1: Category + Department -->
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>â‘  ${lang==='en'?'Category':'Loáº¡i tÃ i liá»‡u'}</label>
            <select id="cd-cat" onchange="onCreateDocCatChange()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer">
              ${catSelectHTML}
            </select>
          </div>
          <div class="modal-field" id="cd-dept-wrap">
            <label>â‘¡ ${lang==='en'?'Department':'PhÃ²ng ban'}</label>
            <select id="cd-dept" onchange="onCreateDocDeptChange()" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer;${hasDept?'':'opacity:0.4;pointer-events:none'}">
              ${hasDept ? buildDeptOptions(cat) : `<option value="">â€” ${lang==='en'?'Not applicable':'KhÃ´ng Ã¡p dá»¥ng'} â€”</option>`}
            </select>
            <div class="help-text" id="cd-dept-hint" style="margin-top:4px;font-size:11px;color:var(--text-3)">
              ${hasDept ? (lang==='en'?'Select department for this document type':'Chá»n phÃ²ng ban cho loáº¡i tÃ i liá»‡u nÃ y') : (lang==='en'?'This category has no department subdivision':'Loáº¡i tÃ i liá»‡u nÃ y khÃ´ng chia theo phÃ²ng ban')}
            </div>
          </div>
        </div>

        <!-- ROW 2: Code + Version -->
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>â‘¢ ${lang==='en'?'Document code':'MÃ£ tÃ i liá»‡u'}</label>
            <input id="cd-code" type="text" placeholder="${cat==='PROC'?'PROC-CNC-003':cat==='FRM'?'FRM-QA-020':'SOP-QMS-027'}" value="">
          </div>
          <div class="modal-field">
            <label>${lang==='en'?'Initial version':'PhiÃªn báº£n khá»Ÿi táº¡o'}</label>
            <input id="cd-rev" type="text" value="0.0" placeholder="0.0">
          </div>
        </div>

        <!-- ROW 3: Title -->
        <div class="modal-field">
          <label>â‘£ ${lang==='en'?'Title':'TiÃªu Ä‘á»'}</label>
          <input id="cd-title" type="text" placeholder="${lang==='en'?'Document title':'TÃªn tÃ i liá»‡u'}" value="">
        </div>

        <!-- ROW 4: Owner -->
        <div class="modal-field">
          <label>${lang==='en'?'Owner':'Chá»§ sá»Ÿ há»¯u'}</label>
          <select id="cd-owner" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-1);cursor:pointer">
            ${[
              {v:'QA/QMS',vi:'QA/QMS â€” Há»‡ thá»‘ng cháº¥t lÆ°á»£ng',en:'QA/QMS â€” Quality System'},
              {v:'Production',vi:'Production â€” Sáº£n xuáº¥t',en:'Production'},
              {v:'Engineering',vi:'Engineering â€” Ká»¹ thuáº­t',en:'Engineering'},
              {v:'QA/QC',vi:'QA/QC â€” Kiá»ƒm tra cháº¥t lÆ°á»£ng',en:'QA/QC â€” Quality Control'},
              {v:'OPS',vi:'OPS â€” Váº­n hÃ nh',en:'OPS â€” Operations'},
              {v:'Planning',vi:'Planning â€” Káº¿ hoáº¡ch',en:'Planning'},
              {v:'Purchasing',vi:'Purchasing â€” Mua hÃ ng',en:'Purchasing'},
              {v:'Sales',vi:'Sales â€” Kinh doanh',en:'Sales'},
              {v:'Warehouse',vi:'Warehouse â€” Kho váº­n',en:'Warehouse'},
              {v:'Maintenance',vi:'Maintenance â€” Báº£o trÃ¬',en:'Maintenance'},
              {v:'Finance',vi:'Finance â€” TÃ i chÃ­nh',en:'Finance'},
              {v:'HR',vi:'HR â€” NhÃ¢n sá»±',en:'HR â€” Human Resources'},
              {v:'HSE',vi:'HSE â€” An toÃ n',en:'HSE â€” Health Safety Environment'},
              {v:'IT',vi:'IT â€” CÃ´ng nghá»‡ thÃ´ng tin',en:'IT â€” Information Technology'},
              {v:'Executive',vi:'Executive â€” Ban Ä‘iá»u hÃ nh',en:'Executive'},
              {v:'Multi',vi:'Multi â€” Äa phÃ²ng ban',en:'Multi â€” Cross-department'},
            ].map(o=>'<option value="'+o.v+'" '+(o.v===ownerDept?'selected':'')+'>'+
              (lang==='en'?o.en:o.vi)+'</option>').join('')}
          </select>
        </div>

        <!-- ROW 5: Folder (auto-computed, read-only display) -->
        <div class="modal-field">
          <label>ðŸ“ ${lang==='en'?'Save location':'Vá»‹ trÃ­ lÆ°u'}</label>
          <div id="cd-folder-display" style="padding:10px 12px;background:var(--bg-2);border:1px solid var(--border);border-radius:8px;font-family:var(--mono);font-size:12px;color:var(--text-2);display:flex;align-items:center;gap:8px">
            <span style="font-size:16px">ðŸ“‚</span>
            <span id="cd-folder-text">${initFolder}/</span>
          </div>
          <input type="hidden" id="cd-folder" value="${initFolder}">
          <div class="help-text" style="margin-top:4px;font-size:11px;color:var(--text-3)">
            ${lang==='en'
              ?'Auto-computed from Category + Department. Baseline V0 does not create an <b>_Archive</b> subfolder; control is maintained through the active file, checksum registry and release manifest.'
              :'Tá»± Ä‘á»™ng tÃ­nh tá»« Loáº¡i + PhÃ²ng ban. Baseline V0 khÃ´ng táº¡o thÆ° má»¥c <b>_Archive</b>; kiá»ƒm soÃ¡t Ä‘Æ°á»£c duy trÃ¬ qua file active, checksum registry vÃ  release manifest.'}
          </div>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-admin" onclick="closeModal()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="submitCreateDoc(document.getElementById('cd-cat').value)">${lang==='en'?'Create':'Táº¡o má»›i'}</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  setTimeout(()=>{ document.getElementById('cd-code')?.focus(); }, 50);
}

// When category changes â†’ update dept dropdown + folder
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
      return `<option value="${d}">${getSubfolderLabel(d)} â€” ${txt}</option>`;
    }).join('');
    deptSel.style.opacity = '1';
    deptSel.style.pointerEvents = 'auto';
    deptHint.textContent = lang==='en'?'Select department for this document type':'Chá»n phÃ²ng ban cho loáº¡i tÃ i liá»‡u nÃ y';
  } else {
    deptSel.innerHTML = `<option value="">â€” ${lang==='en'?'Not applicable':'KhÃ´ng Ã¡p dá»¥ng'} â€”</option>`;
    deptSel.style.opacity = '0.4';
    deptSel.style.pointerEvents = 'none';
    deptHint.textContent = lang==='en'?'This category has no department subdivision':'Loáº¡i tÃ i liá»‡u nÃ y khÃ´ng chia theo phÃ²ng ban';
  }

  onCreateDocDeptChange();
}

// When dept changes â†’ update folder display
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
      // Derive prefix from subfolder name: "PROC-CNC" â†’ "PROC-CNC-", "Job-Descriptions" â†’ "JD-"
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

  if(!code){ showToast(lang==='en'?'âš  Missing document code':'âš  Thiáº¿u mÃ£ tÃ i liá»‡u'); return; }
  if(!title){ showToast(lang==='en'?'âš  Missing title':'âš  Thiáº¿u tiÃªu Ä‘á»'); return; }
  if(!ensureEnglishStandardTitle(title)) return;

  if(revision && !/^\d+(?:\.\d+)?$/.test(revision)){
    showToast(lang==='en'?'âš  Invalid version (e.g., 0.0, 1.0, 1.1)':'âš  PhiÃªn báº£n khÃ´ng há»£p lá»‡ (vÃ­ dá»¥: 0.0, 1.0, 1.1)');
    return;
  }

  if(DOCS.find(d=>d.code===code.toUpperCase())){
    showToast(lang==='en'?'âš  Code already exists':'âš  MÃ£ Ä‘Ã£ tá»“n táº¡i');
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
      showToast(lang==='en'?'âœ… Document created':'âœ… ÄÃ£ táº¡o tÃ i liá»‡u');
      renderDocuments();
      renderSidebar();
      openDoc(res.doc.code);
      // Also refresh dashboard counters
      renderDashboard();
    }else{
      showToast((res && res.error) ? ('âš  '+res.error) : (lang==='en'?'âš  Create failed':'âš  Táº¡o tháº¥t báº¡i'));
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
        <div class="sr-cat">${catLabel(cat).split('(')[0].trim()} ${locked?'ðŸ”’':''}</div>
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
              return `<td title="${accessCount}/${docsInCat.length}"><span class="${none?'cross':'check'}">${full?'âœ“':partial?accessCount:'âœ•'}</span></td>`;
            }).join('')}
            <td><span class="${r.approve?'check':'cross'}">${r.approve?'âœ“':'â€”'}</span></td>
            <td style="font-size:10px;font-family:var(--mono)">${totalForRole}/${VDOCS.length}</td>
          </tr>`;
        }).join('')}
      </tbody>
    </table>
    </div>
    <p style="font-size:11px;color:var(--text-3);margin-top:8px">âœ“ = ${lang==='en'?'Full access to category':'ToÃ n quyá»n danh má»¥c'} | <i>number</i> = ${lang==='en'?'Partial (X docs)':'Má»™t pháº§n (X tÃ i liá»‡u)'} | âœ• = ${lang==='en'?'No access':'KhÃ´ng truy cáº­p'}</p>`;
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DICTIONARY
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
        <h2 style="font-size:18px;font-weight:700;display:flex;align-items:center;gap:8px">ðŸ“– ${T('dict_title')} <span style="font-size:12px;font-weight:400;color:var(--text-3);background:#f1f3f5;padding:2px 10px;border-radius:20px">ANNEX-50470</span></h2>
        <p style="font-size:13px;color:var(--text-3);margin-top:4px">${T('dict_desc')}</p>
      </div>
      <div style="display:flex;gap:10px;align-items:center;flex-shrink:0">
        ${isAdmin()?`<button class=\"btn-admin primary\" onclick=\"openDictTermModal()\">âž• ${lang==='en'?'Add term':'ThÃªm thuáº­t ngá»¯'}</button>`:''}
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
    .replace(/Ä‘/g, 'd')
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
    missing_term: 'Cáº§n nháº­p thuáº­t ngá»¯',
    missing_meaning: 'Cáº§n nháº­p tÃªn Ä‘áº§y Ä‘á»§ tiáº¿ng Anh',
    missing_definition: 'Cáº§n nháº­p Ä‘á»‹nh nghÄ©a',
    use_abbreviation_canonical_term: 'DÃ¹ng mÃ£ viáº¿t táº¯t lÃ m term chÃ­nh vÃ  Ä‘iá»n tÃªn Ä‘áº§y Ä‘á»§ tiáº¿ng Anh vÃ o trÆ°á»ng Meaning',
    meaning_must_expand_abbreviation: 'TÃªn Ä‘áº§y Ä‘á»§ tiáº¿ng Anh pháº£i khai triá»ƒn mÃ£ viáº¿t táº¯t, khÃ´ng Ä‘Æ°á»£c láº·p láº¡i chÃ­nh mÃ£ Ä‘Ã³'
  };
  const enMessages = {
    missing_term: 'Term is required',
    missing_meaning: 'Full English is required',
    missing_definition: 'Definition is required',
    use_abbreviation_canonical_term: 'Use the abbreviation as the canonical term and put the full English in Meaning',
    meaning_must_expand_abbreviation: 'Meaning must expand the abbreviation instead of repeating the code'
  };
  const messages = lang === 'en' ? enMessages : viMessages;
  return messages[errorCode] || errorCode || (lang === 'en' ? 'Save failed' : 'LÆ°u tháº¥t báº¡i');
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
                <button class="btn-admin secondary sm" title="${lang==='en'?'Edit term':'Sá»­a thuáº­t ngá»¯'}" onclick="openDictTermModal('${safeTerm}')">âœŽ</button>
                <button class="btn-admin danger sm" title="${lang==='en'?'Delete term':'XÃ³a thuáº­t ngá»¯'}" onclick="deleteDictTerm('${safeTerm}')">ðŸ—‘</button>
              `:''}
            </div>
          </div>
          <div class="dict-def">${highlightMatch(d.def, dictQuery)}</div>
          ${d.ctx ? `<div class="dict-ctx"><b>${T('dict_ctx')}:</b> ${d.ctx}</div>` : ''}
          ${d.rec ? `<div class="dict-rec">ðŸ“‹ ${d.rec}</div>` : ''}
        </div>
      `;
      }).join('')}
    </div>
    ${hasMore ? `<button class="dict-more-btn" onclick="dictShowCount+=30;renderDictBody()">${T('dict_more')} (${filtered.length - dictShowCount > 0 ? filtered.length - dictShowCount : 0} ${T('dict_remaining')})</button>` : ''}
    <div style="margin-top:12px;font-size:11px;color:var(--text-3);text-align:center">${T('showing')} ${Math.min(dictShowCount, filtered.length)} / ${filtered.length} Â· ${T('dict_source')}: ANNEX-50470</div>
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

// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// DICTIONARY CRUD (Admin only)
// â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function openDictTermModal(term){
  if(!isAdmin()){
    showToast(lang==='en'?'Not permitted':'KhÃ´ng cÃ³ quyá»n');
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
    <h3 style="margin-bottom:10px">${isEdit?(lang==='en'?'Edit term':'Sá»­a thuáº­t ngá»¯'):(lang==='en'?'Add new term':'ThÃªm thuáº­t ngá»¯ má»›i')}</h3>

    <div class="modal-field"><label>${lang==='en'?'Term (EN)':'Thuáº­t ngá»¯ (EN)'}</label><input id="dm-term" value="${existing?escapeHtml(existing.term):''}" ${isEdit?'disabled':''}></div>
    <div class="modal-field"><label>${lang==='en'?'Vietnamese':'Tiáº¿ng Viá»‡t'}</label><input id="dm-vi" value="${existing?escapeHtml(existing.vi||''):''}"></div>
    <div class="modal-field"><label>${lang==='en'?'Full English (required)':'TÃªn Ä‘áº§y Ä‘á»§ tiáº¿ng Anh (báº¯t buá»™c)'}</label><input id="dm-meaning" value="${existing?escapeHtml(existing.meaning||''):''}"></div>
    <div class="modal-field"><label>${lang==='en'?'Category':'NhÃ³m'}</label>
      <select id="dm-cat">${catOptions || '<option value="General">General</option>'}</select>
    </div>
    <div class="modal-field"><label>${lang==='en'?'Definition':'Äá»‹nh nghÄ©a'}</label><textarea id="dm-def" rows="4" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.def||''):''}</textarea></div>
    <div class="modal-field"><label>${lang==='en'?'Context / Example':'Ngá»¯ cáº£nh / VÃ­ dá»¥'}</label><textarea id="dm-ctx" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.ctx||''):''}</textarea></div>
    <div class="modal-field"><label>${lang==='en'?'Required records':'Há»“ sÆ¡ pháº£i cÃ³'}</label><textarea id="dm-rec" rows="2" style="width:100%;padding:10px;border:1px solid var(--border);border-radius:10px;resize:vertical">${existing?escapeHtml(existing.rec||''):''}</textarea></div>

    <div class="modal-actions">
      <button class="btn-admin secondary" onclick="closeModal()">âœ• ${T('admin_cancel')}</button>
      <button class="btn-admin primary" onclick="saveDictTerm('${isEdit?String(term).replace(/'/g,"\\'"):''}')">âœ“ ${T('admin_save')}</button>
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
      showToast('âš  ' + getDictionarySaveErrorMessage(res && res.error));
      return;
    }
    dictData = res.items || dictData;
    closeModal();
    renderDictBody();
    showToast(lang==='en'?'âœ“ Saved':'âœ“ ÄÃ£ lÆ°u');
  }catch(e){
    showToast(lang==='en'?'âš  Save failed':'âš  LÆ°u tháº¥t báº¡i');
  }
}

async function deleteDictTerm(term){
  if(!isAdmin()) return;
  if(!confirm((lang==='en'?'Delete term':'XÃ³a thuáº­t ngá»¯')+': '+term+' ?')) return;
  try{
    const res = await apiCall('dict_delete',{term});
    if(!(res && res.ok)){
      showToast((res && res.error)?('âš  '+res.error):(lang==='en'?'âš  Delete failed':'âš  XÃ³a tháº¥t báº¡i'));
      return;
    }
    dictData = res.items || dictData;
    renderDictBody();
    showToast(lang==='en'?'âœ“ Deleted':'âœ“ ÄÃ£ xÃ³a');
  }catch(e){
    showToast(lang==='en'?'âš  Delete failed':'âš  XÃ³a tháº¥t báº¡i');
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
    icon.textContent = s.classList.contains('collapsed') ? 'â–·' : 'â—';
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


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN PANEL
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
let adminTab = 'users';
let adminUserViewMode = 'cards'; // 'cards' or 'list'
let adminEditRole = 'ceo';
let adminUnsaved = false;
let adminManualRuntimeState = {
  loading:false,
  loaded:false,
  master:null,
  hierarchy:[],
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

function showToast(msg, type, duration){
  duration = duration || 3000;
  var colorMap = {
    success: {bg:'#16a34a', icon:'âœ…'},
    error: {bg:'#dc2626', icon:'âŒ'},
    warning: {bg:'#d97706', icon:'âš ï¸'},
    info: {bg:'#2563eb', icon:'â„¹ï¸'}
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

function closeGitSyncModal(){
  document.getElementById('git-sync-modal')?.remove();
}

function gitSyncShortHash(hash){
  const raw = String(hash||'').trim();
  return raw ? raw.slice(0,7) : 'â€”';
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
            <th>${lang==='en'?'Status':'Tráº¡ng thÃ¡i'}</th>
            <th>${lang==='en'?'Path':'ÄÆ°á»ng dáº«n'}</th>
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
            <th>${lang==='en'?'Change':'Thay Ä‘á»•i'}</th>
            <th>${lang==='en'?'Current path':'ÄÆ°á»ng dáº«n hiá»‡n táº¡i'}</th>
            <th>${lang==='en'?'Previous path':'ÄÆ°á»ng dáº«n cÅ©'}</th>
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
              <td>${oldPath ? `<code>${escapeHtml(oldPath)}</code>` : '<span class="git-sync-empty-inline">â€”</span>'}</td>
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
  const sectionTitle = lang==='en'
    ? 'Auto pre-sync before pull (server-side only)'
    : 'Auto pre-sync tr\u01b0\u1edbc khi pull (ch\u1ec9 ph\u00eda server)';
  const callout = pushed
    ? (lang==='en'
      ? 'Portal detected meaningful cPanel/server changes, committed them, and pushed them to GitHub before pulling.'
      : 'Portal ph\u00e1t hi\u1ec7n thay \u0111\u1ed5i meaningful tr\u00ean cPanel/server, \u0111\u00e3 commit v\u00e0 \u0111\u1ea9y ch\u00fang l\u00ean GitHub tr\u01b0\u1edbc khi pull.')
    : (lang==='en'
      ? 'No meaningful cPanel/server change needed a pre-sync commit before pull.'
      : 'Kh\u00f4ng c\u00f3 thay \u0111\u1ed5i meaningful tr\u00ean cPanel/server c\u1ea7n pre-sync commit tr\u01b0\u1edbc khi pull.');
  const hasAnything = pushed || files.length || statusEntries.length || String(presync.commit_output||'').trim() || String(presync.push_output||'').trim();
  if(!hasAnything) return '';
  return `
    <section class="git-sync-section">
      <div class="git-sync-section-title">${sectionTitle}</div>
      <div class="git-sync-callout">${callout}</div>
      <div class="git-sync-summary-grid git-sync-summary-grid--compact">
        ${gitSyncRenderSummaryCard(lang==='en'?'Branch':'NhÃ¡nh', String(presync.branch || 'main'))}
        ${gitSyncRenderSummaryCard(lang==='en'?'Files':'Sá»‘ file', String(files.length))}
        ${gitSyncRenderSummaryCard(lang==='en'?'Before':'TrÆ°á»›c', gitSyncShortHash(presync.head_before))}
        ${gitSyncRenderSummaryCard(lang==='en'?'After':'Sau', gitSyncShortHash(presync.head_after))}
      </div>
      ${gitSyncRenderSimpleFileTable(files.map(path=>({status:'SYNC', path})), lang==='en'?'No meaningful file was auto-pushed before pull.':'KhÃ´ng cÃ³ file meaningful nÃ o Ä‘Æ°á»£c auto-push trÆ°á»›c khi pull.')}
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
  const presync = res && typeof res.presync === 'object' ? res.presync : null;
  const pushed = !!(res && res.pushed);
  const pulled = !!(res && res.pulled);
  const beforeHead = String((res && (res.before_head || res.head_before)) || '');
  const afterHead = String((res && (res.after_head || res.head_after)) || '');
  const title = isPull
    ? (lang==='en' ? 'Pull Detail' : 'Chi tiáº¿t Pull')
    : (lang==='en' ? 'Push Detail' : 'Chi tiáº¿t Push');
  const kicker = isPull ? 'GitHub -> Portal' : 'Portal -> GitHub';
  const summaryCards = isPull
    ? [
        gitSyncRenderSummaryCard(lang==='en'?'Branch':'NhÃ¡nh', branch),
        gitSyncRenderSummaryCard(lang==='en'?'Changed files':'File thay Ä‘á»•i', String(changedFiles.length)),
        gitSyncRenderSummaryCard(lang==='en'?'From':'Tá»« commit', gitSyncShortHash(beforeHead)),
        gitSyncRenderSummaryCard(lang==='en'?'To':'Äáº¿n commit', gitSyncShortHash(afterHead)),
      ].join('')
    : [
        gitSyncRenderSummaryCard(lang==='en'?'Branch':'NhÃ¡nh', branch),
        gitSyncRenderSummaryCard(lang==='en'?'Committed files':'File commit', String(files.length)),
        gitSyncRenderSummaryCard(lang==='en'?'Before':'TrÆ°á»›c', gitSyncShortHash(beforeHead)),
        gitSyncRenderSummaryCard(lang==='en'?'After':'Sau', gitSyncShortHash(afterHead)),
      ].join('');
  const pullSummaryMessageBase = (() => {
    const base = String(res && res.message || (pulled ? 'Portal updated.' : 'Already up to date.'));
    if(!pulled && presync && presync.pushed){
      return `${base} ${lang==='en'
        ? 'The pre-sync section below shows server-side changes only; workstation edits appear here only after they are pushed to GitHub.'
        : 'Pháº§n pre-sync bÃªn dÆ°á»›i chá»‰ hiá»ƒn thá»‹ thay Ä‘á»•i phÃ­a server; thay Ä‘á»•i trÃªn mÃ¡y local chá»‰ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y sau khi Ä‘Ã£ Ä‘áº©y lÃªn GitHub.'}`;
    }
    return base;
  })();

  const pullSummaryMessage = (() => {
    const base = String(res && res.message || (pulled ? 'Portal updated.' : 'Already up to date.'));
    if(!pulled && presync && presync.pushed){
      return `${base} ${lang==='en'
        ? 'The pre-sync section below shows server-side changes only; workstation edits appear here only after they are pushed to GitHub.'
        : 'Pháº§n pre-sync bÃªn dÆ°á»›i chá»‰ hiá»ƒn thá»‹ thay Ä‘á»•i phÃ­a server; thay Ä‘á»•i trÃªn mÃ¡y local chá»‰ xuáº¥t hiá»‡n á»Ÿ Ä‘Ã¢y sau khi Ä‘Ã£ Ä‘áº©y lÃªn GitHub.'}`;
    }
    return base;
  })();

  const bodySections = isPull
    ? `
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Pull summary':'TÃ³m táº¯t pull'}</div>
        <div class="git-sync-callout">${escapeHtml(pullSummaryMessage)}</div>
      </section>
      ${gitSyncRenderPresyncSection(presync)}
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Files applied to portal':'Danh sÃ¡ch file Ã¡p dá»¥ng xuá»‘ng portal'}</div>
        ${gitSyncRenderChangedFileTable(changedFiles, lang==='en'?'No remote file change was applied in this pull.':'KhÃ´ng cÃ³ file remote nÃ o Ä‘Æ°á»£c Ã¡p xuá»‘ng trong láº§n pull nÃ y.')}
      </section>
      ${gitSyncRenderOutputBlock(lang==='en'?'Fetch output':'Log fetch', res && res.fetch_output)}
      ${gitSyncRenderOutputBlock(lang==='en'?'Pull output':'Log pull', res && res.pull_output)}
    `
    : `
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Push summary':'TÃ³m táº¯t push'}</div>
        <div class="git-sync-callout">${escapeHtml(String(res && res.message || (pushed ? 'Changes pushed.' : 'Nothing to sync.')))}</div>
      </section>
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Detected meaningful changes before commit':'CÃ¡c thay Ä‘á»•i meaningful Ä‘Æ°á»£c phÃ¡t hiá»‡n trÆ°á»›c khi commit'}</div>
        ${gitSyncRenderSimpleFileTable(statusEntries, lang==='en'?'No meaningful file was detected for a new commit.':'KhÃ´ng phÃ¡t hiá»‡n file meaningful nÃ o Ä‘á»ƒ táº¡o commit má»›i.')}
      </section>
      <section class="git-sync-section">
        <div class="git-sync-section-title">${lang==='en'?'Files included in push':'Danh sÃ¡ch file Ä‘i cÃ¹ng láº§n push'}</div>
        ${gitSyncRenderSimpleFileTable(files.map(path=>({status:'SYNC', path})), lang==='en'?'No new file was included in this push.':'KhÃ´ng cÃ³ file má»›i nÃ o náº±m trong láº§n push nÃ y.')}
      </section>
      ${gitSyncRenderOutputBlock(lang==='en'?'Commit output':'Log commit', res && res.commit_output)}
      ${gitSyncRenderOutputBlock(lang==='en'?'Push output':'Log push', res && res.push_output)}
    `;

  const primaryButton = isPull
    ? `<button class="btn-admin primary" onclick="adminReloadLatestPortal()">${lang==='en'?(pulled?'OK - reload latest portal':'OK - refresh portal'):(pulled?'OK - táº£i láº¡i portal má»›i nháº¥t':'OK - lÃ m má»›i portal')}</button>`
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
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">âœ•</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid">${summaryCards}</div>
        ${bodySections}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en'?'Close':'ÄÃ³ng'}</button>
        ${primaryButton}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

async function adminReloadLatestPortal(){
  closeGitSyncModal();
  showToast(lang==='en' ? 'Refreshing portal with cache-bustingâ€¦' : 'Äang náº¡p láº¡i portal vá»›i cache-bustingâ€¦', 2200);
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
      showToast((resRole && resRole.error) ? ('âš  '+resRole.error) : (lang==='en'?'âš  Save failed':'âš  LÆ°u tháº¥t báº¡i'));
      return;
    }
    const resDocs = await saveDocVisibilityToServer();
    if(!(resDocs && resDocs.ok)){
      showToast((resDocs && resDocs.error) ? ('âš  '+resDocs.error) : (lang==='en'?'âš  Save failed':'âš  LÆ°u tháº¥t báº¡i'));
      return;
    }
  }catch(e){
    showToast(lang==='en'?'âš  Save failed':'âš  LÆ°u tháº¥t báº¡i');
    return;
  }

  adminUnsaved = false;
  showToast(lang==='en'?'âœ… All changes saved successfully':'âœ… ÄÃ£ lÆ°u táº¥t cáº£ thay Ä‘á»•i thÃ nh cÃ´ng');
  renderAdmin();
}

let gitSyncBusyMode = '';
let gitRepoStatusState = {loading:false, loaded:false, error:'', data:null};

function isGitSyncBusy(){
  return gitSyncBusyMode === 'pull' || gitSyncBusyMode === 'push' || gitSyncBusyMode === 'discard';
}

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
  if(!commit || typeof commit !== 'object') return 'â€”';
  const hash = String(commit.short_hash || commit.hash || '').trim();
  const subject = String(commit.subject || '').trim();
  if(!hash && !subject) return 'â€”';
  return `${hash}${subject ? ` ${subject}` : ''}`.trim();
}

function gitRepoCommitMeta(commit){
  if(!commit || typeof commit !== 'object') return '';
  const author = String(commit.author_name || '').trim();
  const committedAt = gitRepoFormatTime(commit.committed_at);
  return [author, committedAt].filter(Boolean).join(' â€¢ ');
}

function gitRepoRelativeState(status){
  if(!status) return {label:'â€”', tone:'neutral'};
  const ahead = Number(status.ahead_count || 0);
  const behind = Number(status.behind_count || 0);
  if(ahead > 0 && behind > 0){
    return {
      label: lang==='en' ? `Diverged (+${ahead} / -${behind})` : `PhÃ¢n ká»³ (+${ahead} / -${behind})`,
      tone: 'warn'
    };
  }
  if(behind > 0){
    return {
      label: lang==='en' ? `Behind ${behind}` : `Cháº­m ${behind} commit`,
      tone: 'info'
    };
  }
  if(ahead > 0){
    return {
      label: lang==='en' ? `Ahead ${ahead}` : `Äi trÆ°á»›c ${ahead} commit`,
      tone: 'good'
    };
  }
  return {
    label: lang==='en' ? 'Up to date' : 'ÄÃ£ Ä‘á»“ng bá»™',
    tone: 'good'
  };
}

function gitRepoWorkingTreeState(status){
  if(!status) return {label:'â€”', tone:'neutral'};
  const dirtyCount = Number(status.meaningful_dirty_count || 0);
  if(dirtyCount > 0){
    return {
      label: lang==='en' ? `${dirtyCount} local change(s)` : `${dirtyCount} thay Ä‘á»•i local`,
      tone: 'warn'
    };
  }
  return {
    label: lang==='en' ? 'Working tree clean' : 'Working tree sáº¡ch',
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

function adminGitPushErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_sync_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'staged_changes_present'){
    return lang==='en'
      ? 'There are staged meaningful changes on the server already. Review them before using Git sync.'
      : 'Server Ä‘ang cÃ³ thay Ä‘á»•i Ä‘Ã£ stage sáºµn. HÃ£y commit hoáº·c unstage trong Terminal trÆ°á»›c khi dÃ¹ng nÃºt Ä‘á»“ng bá»™ Git.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot run git commands.'
      : 'Hosting Ä‘ang cháº·n PHP exec nÃªn portal khÃ´ng thá»ƒ cháº¡y lá»‡nh git.';
  }
  if(error === 'git_push_failed'){
    return lang==='en'
      ? 'Git push failed. Please verify the server can push to GitHub with SSH key or token.'
      : 'Git push tháº¥t báº¡i. HÃ£y kiá»ƒm tra server Ä‘Ã£ cáº¥u hÃ¬nh SSH key hoáº·c token Ä‘á»ƒ Ä‘áº©y lÃªn GitHub chÆ°a.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'ThÆ° má»¥c portal trÃªn server nÃ y khÃ´ng sáºµn sÃ ng nhÆ° má»™t repo git.';
  }
  if(error === 'git_sync_failed' && detail){
    return detail;
  }
  return detail || (lang==='en' ? 'Git sync failed' : 'Äá»“ng bá»™ Git tháº¥t báº¡i');
}

function adminGitPullErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_pull_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'working_tree_dirty' || error === 'staged_changes_present'){
    return lang==='en'
      ? 'The cPanel repository still has meaningful local changes after runtime auto-clean. Review them before pulling from Git.'
      : 'Repo trÃªn cPanel váº«n cÃ²n thay Ä‘á»•i local. HÃ£y commit hoáº·c bá» cÃ¡c thay Ä‘á»•i Ä‘Ã³ trong Terminal trÆ°á»›c khi pull tá»« Git.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot run git commands.'
      : 'Hosting Ä‘ang cháº·n PHP exec nÃªn portal khÃ´ng thá»ƒ cháº¡y lá»‡nh git.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'Git pull failed. Please verify the cPanel server can access the remote repository.'
      : 'Git pull tháº¥t báº¡i. HÃ£y kiá»ƒm tra server cPanel cÃ³ quyá»n truy cáº­p remote repository.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'ThÆ° má»¥c portal trÃªn server nÃ y khÃ´ng sáºµn sÃ ng nhÆ° má»™t repo git.';
  }
  return detail || (lang==='en' ? 'Git pull failed' : 'Git pull tháº¥t báº¡i');
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
      : 'HÃ£y rÃ  soÃ¡t cÃ¡c file Ä‘ang Ä‘Æ°á»£c liá»‡t kÃª. Náº¿u Ä‘Ã³ lÃ  thay Ä‘á»•i há»£p lá»‡, dÃ¹ng Push to Git hoáº·c commit trong Terminal. Náº¿u lÃ  thay Ä‘á»•i táº¡m/sai, hÃ£y bá» chÃºng trÆ°á»›c khi pull.';
  }
  if(error === 'git_push_failed'){
    return lang==='en'
      ? 'The server could not push to GitHub. Check SSH access, remote URL, and whether origin/main has newer commits that require fetch/rebase first.'
      : 'Server khÃ´ng thá»ƒ Ä‘áº©y lÃªn GitHub. HÃ£y kiá»ƒm tra SSH, remote URL vÃ  xem origin/main cÃ³ commit má»›i hÆ¡n cáº§n fetch/rebase trÆ°á»›c hay khÃ´ng.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'The server could not fetch or pull from the remote. Verify network access, SSH key, and remote branch state.'
      : 'Server khÃ´ng thá»ƒ fetch hoáº·c pull tá»« remote. HÃ£y kiá»ƒm tra káº¿t ná»‘i máº¡ng, SSH key vÃ  tráº¡ng thÃ¡i nhÃ¡nh remote.';
  }
  if(error === 'git_add_failed'){
    return lang==='en'
      ? 'Git could not stage one or more paths. This usually means the path no longer exists or was renamed. Rescan the document index, then try again.'
      : 'Git khÃ´ng thá»ƒ stage má»™t hoáº·c nhiá»u Ä‘Æ°á»ng dáº«n. TrÆ°á»ng há»£p nÃ y thÆ°á»ng do file Ä‘Ã£ Ä‘á»•i tÃªn hoáº·c khÃ´ng cÃ²n tá»“n táº¡i. HÃ£y quÃ©t láº¡i danh má»¥c tÃ i liá»‡u rá»“i thá»­ láº¡i.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'Hosting is blocking PHP exec, so portal buttons cannot run git commands. Terminal or hosting configuration is required.'
      : 'Hosting Ä‘ang cháº·n PHP exec nÃªn cÃ¡c nÃºt trÃªn portal khÃ´ng thá»ƒ cháº¡y lá»‡nh git. Cáº§n dÃ¹ng Terminal hoáº·c má»Ÿ cáº¥u hÃ¬nh hosting.';
  }
  return kind === 'pull'
    ? (lang==='en'
      ? 'Review the raw server detail below to decide whether this is a repository state issue, a remote access issue, or a path mismatch.'
      : 'HÃ£y xem log chi tiáº¿t bÃªn dÆ°á»›i Ä‘á»ƒ xÃ¡c Ä‘á»‹nh Ä‘Ã¢y lÃ  lá»—i tráº¡ng thÃ¡i repo, lá»—i truy cáº­p remote hay lá»—i khÃ´ng khá»›p Ä‘Æ°á»ng dáº«n.')
    : (lang==='en'
      ? 'Review the raw server detail below to decide whether this is a staging issue, a commit issue, or a GitHub push issue.'
      : 'HÃ£y xem log chi tiáº¿t bÃªn dÆ°á»›i Ä‘á»ƒ xÃ¡c Ä‘á»‹nh Ä‘Ã¢y lÃ  lá»—i stage, lá»—i commit hay lá»—i Ä‘áº©y lÃªn GitHub.');
}

function openGitSyncErrorModal(kind, res){
  closeGitSyncModal();
  const isPull = kind === 'pull';
  const branch = String((res && res.branch) || 'main');
  const detail = String((res && res.detail) || '').trim();
  const errorCode = String((res && res.error) || (isPull ? 'git_pull_failed' : 'git_sync_failed')).trim();
  const paths = adminGitExtractDetailPaths(detail);
  const title = isPull
    ? (lang==='en' ? 'Pull Failed' : 'Pull tháº¥t báº¡i')
    : (lang==='en' ? 'Push Failed' : 'Push tháº¥t báº¡i');
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
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">âœ•</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid git-sync-summary-grid--compact">
          ${gitSyncRenderSummaryCard(lang==='en'?'Branch':'NhÃ¡nh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en'?'Error code':'MÃ£ lá»—i', errorCode || 'â€”')}
          ${gitSyncRenderSummaryCard(lang==='en'?'Paths found':'Path nháº­n diá»‡n', String(paths.length))}
          ${gitSyncRenderSummaryCard(lang==='en'?'Time':'Thá»i gian', String((res && res.server_time) || 'â€”'))}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Readable summary':'TÃ³m táº¯t dá»… hiá»ƒu'}</div>
          <div class="git-sync-callout is-error">${escapeHtml(summary)}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Recommended handling':'HÆ°á»›ng xá»­ lÃ½ Ä‘á» nghá»‹'}</div>
          <div class="git-sync-callout">${escapeHtml(adminGitErrorGuidance(kind, res))}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en'?'Detected paths from server detail':'CÃ¡c path nháº­n diá»‡n tá»« log server'}</div>
          ${gitSyncRenderSimpleFileTable(paths.map(path=>({status:'PATH', path})), lang==='en'?'No specific path could be extracted from the server detail.':'KhÃ´ng trÃ­ch xuáº¥t Ä‘Æ°á»£c path cá»¥ thá»ƒ nÃ o tá»« log server.')}
        </section>
        ${gitSyncRenderOutputBlock(lang==='en'?'Raw server detail':'Chi tiáº¿t lá»—i gá»‘c tá»« server', detail || errorCode)}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en'?'Close':'ÄÃ³ng'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

async function adminSyncDocsToGit(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const msg = lang==='en'
    ? 'Push allowed document changes from this cPanel server to Git now? Runtime files such as sessions and rate limits will be ignored.'
    : 'Äáº©y ngay cÃ¡c thay Ä‘á»•i tÃ i liá»‡u Ä‘Æ°á»£c cho phÃ©p tá»« server cPanel nÃ y lÃªn Git? CÃ¡c file runtime nhÆ° sessions vÃ  rate limit sáº½ bá»‹ bá» qua.';
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
    : 'KÃ©o commit má»›i nháº¥t tá»« Git xuá»‘ng portal trÃªn cPanel ngay bÃ¢y giá»? Há»‡ thá»‘ng sáº½ tá»± dá»n runtime noise, thá»­ pre-sync thay Ä‘á»•i meaningful trÃªn server, rá»“i má»›i fast-forward cáº­p nháº­t.';
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
          <div class="admin-sync-kicker">${lang==='en'?'Sync Control':'Äiá»u khiá»ƒn Ä‘á»“ng bá»™'}</div>
          <h3>${lang==='en'?'Portal Data Synchronization':'Äá»“ng bá»™ dá»¯ liá»‡u portal'}</h3>
          <p>${lang==='en'?'Use Pull to auto-clean runtime noise, pre-sync meaningful portal-side changes when needed, and update cPanel from Git. Use Push when you want to explicitly publish meaningful server-side changes back to GitHub.':'DÃ¹ng Pull Ä‘á»ƒ tá»± dá»n runtime, pre-sync cÃ¡c thay Ä‘á»•i meaningful trÃªn portal khi cáº§n, rá»“i cáº­p nháº­t cPanel tá»« Git. DÃ¹ng Push khi muá»‘n chá»§ Ä‘á»™ng xuáº¥t báº£n cÃ¡c thay Ä‘á»•i meaningful trÃªn server lÃªn GitHub.'}</p>
        </div>
        <button class="admin-sync-mini" onclick="rescanDocs().then(n=>{showToast('ðŸ”„ Scanned: '+n+' docs');renderAdmin()})">
          <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
          <span>${lang==='en'?'Rescan folders':'QuÃ©t láº¡i thÆ° má»¥c'}</span>
        </button>
      </div>
      <div class="admin-sync-grid">
        <button class="admin-sync-card is-pull ${pullBusy?'is-busy':''}" onclick="adminPullPortalFromGit()" ${(pullBusy || disablePull)?'disabled':''}>
          <span class="admin-sync-badge">GitHub -> Portal</span>
          <span class="admin-sync-icon">${adminGitSyncIcon('pull')}</span>
          <span class="admin-sync-copy">
            <span class="admin-sync-label">${lang==='en'?'Pull To Portal':'Pull to Portal'}</span>
            <span class="admin-sync-desc">${lang==='en'?'Bring the latest committed version from Git into this live cPanel portal.':'KÃ©o phiÃªn báº£n Ä‘Ã£ commit má»›i nháº¥t tá»« Git xuá»‘ng portal Ä‘ang cháº¡y trÃªn cPanel.'}</span>
            <span class="admin-sync-note">${lang==='en'?'Auto-cleans runtime noise, pre-syncs meaningful server changes when possible, then fast-forwards from Git.':'Tá»± dá»n runtime, pre-sync thay Ä‘á»•i meaningful trÃªn server khi cÃ³ thá»ƒ, sau Ä‘Ã³ fast-forward tá»« Git.'}</span>
          </span>
          <span class="admin-sync-arrow">${pullBusy ? (lang==='en'?'Running...':'Äang cháº¡y...') : (lang==='en'?'Update portal':'Cáº­p nháº­t portal')}</span>
        </button>
        <button class="admin-sync-card is-push ${pushBusy?'is-busy':''}" onclick="adminSyncDocsToGit()" ${(pushBusy || disablePush)?'disabled':''}>
          <span class="admin-sync-badge">Portal -> GitHub</span>
          <span class="admin-sync-icon">${adminGitSyncIcon('push')}</span>
          <span class="admin-sync-copy">
            <span class="admin-sync-label">${lang==='en'?'Push To Git':'Push to Git'}</span>
            <span class="admin-sync-desc">${lang==='en'?'Commit meaningful repository changes from cPanel and publish them back to GitHub.':'Commit cÃ¡c thay Ä‘á»•i meaningful trong repo tá»« cPanel vÃ  Ä‘áº©y ngÆ°á»£c trá»Ÿ láº¡i GitHub.'}</span>
            <span class="admin-sync-note">${lang==='en'?'Ignores runtime files such as sessions, rate limits, scan cache, and local user config noise.':'Bá» qua file runtime nhÆ° sessions, rate limits, scan cache vÃ  nhiá»…u do cáº¥u hÃ¬nh user cá»¥c bá»™.'}</span>
          </span>
          <span class="admin-sync-arrow">${pushBusy ? (lang==='en'?'Running...':'Äang cháº¡y...') : (lang==='en'?'Publish changes':'Xuáº¥t báº£n thay Ä‘á»•i')}</span>
        </button>
      </div>
    </section>`;
}

function openRemoteUpdateReportModal(res){
  closeGitSyncModal();
  const branch = String((res && res.branch) || 'main');
  const changedFiles = Array.isArray(res && res.changed_files) ? res.changed_files : [];
  const pulled = !!(res && res.pulled);
  const beforeHead = String((res && (res.before_head || res.head_before)) || '');
  const afterHead = String((res && (res.after_head || res.head_after)) || '');
  const summary = String(res && res.message || (pulled ? 'Repository updated from remote.' : 'Repository is already up to date.'));
  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(lang==='en' ? 'Update from Remote' : 'C\u1eadp nh\u1eadt t\u1eeb remote')}</div>
          <h3>${escapeHtml(lang==='en' ? 'Remote Update Detail' : 'Chi ti\u1ebft c\u1eadp nh\u1eadt remote')}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">x</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid">
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Branch' : 'Nh\u00e1nh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Changed files' : 'File thay \u0111\u1ed5i', String(changedFiles.length))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'From' : 'T\u1eeb commit', gitSyncShortHash(beforeHead))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'To' : '\u0110\u1ebfn commit', gitSyncShortHash(afterHead))}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Remote update summary' : 'T\u00f3m t\u1eaft c\u1eadp nh\u1eadt remote'}</div>
          <div class="git-sync-callout">${escapeHtml(summary)}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Files updated in cPanel' : 'Danh s\u00e1ch file \u0111\u01b0\u1ee3c c\u1eadp nh\u1eadt tr\u00ean cPanel'}</div>
          ${gitSyncRenderChangedFileTable(changedFiles, lang==='en' ? 'No remote file change was applied in this update.' : 'Kh\u00f4ng c\u00f3 file remote n\u00e0o \u0111\u01b0\u1ee3c \u00e1p xu\u1ed1ng trong l\u1ea7n c\u1eadp nh\u1eadt n\u00e0y.')}
        </section>
        ${gitSyncRenderOutputBlock(lang==='en' ? 'Fetch output' : 'Log fetch', res && res.fetch_output)}
        ${gitSyncRenderOutputBlock(lang==='en' ? 'Update output' : 'Log c\u1eadp nh\u1eadt', res && res.pull_output)}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en' ? 'Close' : '\u0110\u00f3ng'}</button>
        <button class="btn-admin primary" onclick="adminReloadLatestPortal()">${lang==='en' ? (pulled ? 'OK - reload latest portal' : 'OK - refresh portal') : (pulled ? 'OK - t\u1ea3i l\u1ea1i portal m\u1edbi nh\u1ea5t' : 'OK - l\u00e0m m\u1edbi portal')}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

function remoteUpdateErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_pull_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'working_tree_dirty' || error === 'staged_changes_present'){
    return lang==='en'
      ? 'The checked-out branch still has local repository changes. Clean or publish those changes before updating from remote.'
      : 'Nh\u00e1nh \u0111ang checkout v\u1eabn c\u00f2n thay \u0111\u1ed5i local. H\u00e3y l\u00e0m s\u1ea1ch ho\u1eb7c xu\u1ea5t b\u1ea3n c\u00e1c thay \u0111\u1ed5i \u0111\u00f3 tr\u01b0\u1edbc khi c\u1eadp nh\u1eadt t\u1eeb remote.';
  }
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot run git commands.'
      : 'Hosting \u0111ang ch\u1eb7n PHP exec n\u00ean portal kh\u00f4ng th\u1ec3 ch\u1ea1y l\u1ec7nh git.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'Remote update failed. Verify the cPanel server can access the remote repository and branch.'
      : 'C\u1eadp nh\u1eadt t\u1eeb remote th\u1ea5t b\u1ea1i. H\u00e3y ki\u1ec3m tra server cPanel c\u00f3 quy\u1ec1n truy c\u1eadp remote repository v\u00e0 nh\u00e1nh \u0111ang theo d\u00f5i.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'Th\u01b0 m\u1ee5c portal tr\u00ean server n\u00e0y kh\u00f4ng s\u1eb5n s\u00e0ng nh\u01b0 m\u1ed9t repo git.';
  }
  return detail || (lang==='en' ? 'Remote update failed' : 'C\u1eadp nh\u1eadt t\u1eeb remote th\u1ea5t b\u1ea1i');
}

function remoteUpdateGuidance(res){
  const error = (res && res.error) ? String(res.error) : '';
  if(error === 'working_tree_dirty' || error === 'staged_changes_present'){
    return lang==='en'
      ? 'This works like cPanel Version Control: update from remote expects a clean checked-out branch. Review the listed files, then push them, commit them in Terminal, or discard them before updating again.'
      : 'Ph\u1ea7n n\u00e0y ho\u1ea1t \u0111\u1ed9ng gi\u1ed1ng cPanel Version Control: c\u1eadp nh\u1eadt t\u1eeb remote y\u00eau c\u1ea7u nh\u00e1nh \u0111ang checkout ph\u1ea3i s\u1ea1ch. H\u00e3y r\u00e0 so\u00e1t c\u00e1c file b\u00ean d\u01b0\u1edbi, r\u1ed3i push, commit trong Terminal, ho\u1eb7c b\u1ecf ch\u00fang tr\u01b0\u1edbc khi c\u1eadp nh\u1eadt l\u1ea1i.';
  }
  if(error === 'git_fetch_failed' || error === 'git_pull_failed'){
    return lang==='en'
      ? 'The server could not fetch or pull from origin. Verify network access, SSH key or token, and the remote branch state.'
      : 'Server kh\u00f4ng th\u1ec3 fetch ho\u1eb7c pull t\u1eeb origin. H\u00e3y ki\u1ec3m tra k\u1ebft n\u1ed1i m\u1ea1ng, SSH key ho\u1eb7c token, v\u00e0 tr\u1ea1ng th\u00e1i nh\u00e1nh remote.';
  }
  return lang==='en'
    ? 'Review the raw server detail below to determine whether this is a repository state issue, a remote access issue, or a branch/path mismatch.'
    : 'H\u00e3y xem log chi ti\u1ebft b\u00ean d\u01b0\u1edbi \u0111\u1ec3 x\u00e1c \u0111\u1ecbnh \u0111\u00e2y l\u00e0 l\u1ed7i tr\u1ea1ng th\u00e1i repo, l\u1ed7i truy c\u1eadp remote, hay l\u1ed7i kh\u00f4ng kh\u1edbp nh\u00e1nh/\u0111\u01b0\u1eddng d\u1eabn.';
}

function discardLocalErrorMessage(res){
  const error = (res && res.error) ? String(res.error) : 'git_discard_failed';
  const detail = (res && res.detail) ? String(res.detail) : '';
  if(error === 'exec_unavailable'){
    return lang==='en'
      ? 'PHP exec is disabled on hosting, so the portal cannot discard git changes itself.'
      : 'Hosting \u0111ang ch\u1eb7n PHP exec n\u00ean portal kh\u00f4ng th\u1ec3 t\u1ef1 h\u1ee7y thay \u0111\u1ed5i Git.';
  }
  if(error === 'not_a_git_repo' || error === 'repo_not_found'){
    return lang==='en'
      ? 'The portal root on this server is not available as a git repository.'
      : 'Th\u01b0 m\u1ee5c portal tr\u00ean server n\u00e0y kh\u00f4ng s\u1eb5n s\u00e0ng nh\u01b0 m\u1ed9t repo git.';
  }
  return detail || (lang==='en' ? 'Discard local changes failed' : 'H\u1ee7y thay \u0111\u1ed5i local th\u1ea5t b\u1ea1i');
}

function openDiscardLocalReportModal(res){
  closeGitSyncModal();
  const branch = String((res && res.branch) || 'main');
  const restoredPaths = Array.isArray(res && res.restored_paths) ? res.restored_paths : [];
  const removedPaths = Array.isArray(res && res.removed_paths) ? res.removed_paths : [];
  const remainingPaths = Array.isArray(res && res.remaining_paths) ? res.remaining_paths : [];
  const cleanedRows = [
    ...restoredPaths.map(path=>({status:'RESTORE', path})),
    ...removedPaths.map(path=>({status:'REMOVE', path}))
  ];
  const summary = String((res && res.message) || '').trim() || (remainingPaths.length
    ? (lang==='en' ? 'Some local changes are still left in the checked-out branch.' : 'Nh\u00e1nh \u0111ang checkout v\u1eabn c\u00f2n m\u1ed9t s\u1ed1 thay \u0111\u1ed5i local.')
    : (lang==='en' ? 'Meaningful local changes were discarded and the branch is clean.' : '\u0110\u00e3 h\u1ee7y c\u00e1c thay \u0111\u1ed5i local meaningful v\u00e0 l\u00e0m s\u1ea1ch nh\u00e1nh hi\u1ec7n t\u1ea1i.'));
  const canUpdate = !remainingPaths.length;
  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(lang==='en' ? 'Discard Local Changes' : 'B\u1ecf thay \u0111\u1ed5i local')}</div>
          <h3>${escapeHtml(lang==='en' ? 'Local Cleanup Detail' : 'Chi ti\u1ebft d\u1ecdn thay \u0111\u1ed5i local')}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">x</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid">
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Branch' : 'Nh\u00e1nh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Restored tracked' : 'Kh\u00f4i ph\u1ee5c tracked', String(restoredPaths.length))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Removed untracked' : 'X\u00f3a untracked', String(removedPaths.length))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Remaining' : 'C\u00f2n l\u1ea1i', String(remainingPaths.length))}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Cleanup summary' : 'T\u00f3m t\u1eaft d\u1ecdn s\u1ea1ch'}</div>
          <div class="git-sync-callout">${escapeHtml(summary)}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Discarded paths' : 'C\u00e1c path \u0111\u00e3 h\u1ee7y'}</div>
          ${gitSyncRenderSimpleFileTable(cleanedRows, lang==='en' ? 'No meaningful local path needed to be discarded.' : 'Kh\u00f4ng c\u00f3 path local meaningful n\u00e0o c\u1ea7n h\u1ee7y.')}
        </section>
        ${remainingPaths.length ? `
          <section class="git-sync-section">
            <div class="git-sync-section-title">${lang==='en' ? 'Remaining local paths' : 'C\u00e1c path local c\u00f2n l\u1ea1i'}</div>
            ${gitSyncRenderSimpleFileTable(remainingPaths.map(path=>({status:'PATH', path})), lang==='en' ? 'The branch is clean now.' : 'Nh\u00e1nh hi\u1ec7n \u0111\u00e3 s\u1ea1ch.')}
          </section>
        ` : ''}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en' ? 'Close' : '\u0110\u00f3ng'}</button>
        ${canUpdate ? `<button class="btn-admin primary" onclick="closeGitSyncModal();adminUpdateFromRemote()">${lang==='en' ? 'Update from Remote' : 'C\u1eadp nh\u1eadt t\u1eeb remote'}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

function openDiscardLocalErrorModal(res){
  closeGitSyncModal();
  const branch = String((res && res.branch) || 'main');
  const detail = String((res && res.detail) || '').trim();
  const errorCode = String((res && res.error) || 'git_discard_failed').trim();
  const paths = adminGitExtractDetailPaths(detail);
  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal is-error">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(lang==='en' ? 'Discard Local Changes' : 'B\u1ecf thay \u0111\u1ed5i local')}</div>
          <h3>${escapeHtml(lang==='en' ? 'Discard Failed' : 'H\u1ee7y thay \u0111\u1ed5i th\u1ea5t b\u1ea1i')}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">x</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid git-sync-summary-grid--compact">
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Branch' : 'Nh\u00e1nh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Error code' : 'M\u00e3 l\u1ed7i', errorCode || '--')}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Detected paths' : 'S\u1ed1 path', String(paths.length))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Server time' : 'Th\u1eddi gian server', gitRepoFormatTime(res && res.server_time) || '--')}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Readable summary' : 'T\u00f3m t\u1eaft d\u1ec5 hi\u1ec3u'}</div>
          <div class="git-sync-callout is-error">${escapeHtml(discardLocalErrorMessage(res))}</div>
        </section>
        ${paths.length ? `
          <section class="git-sync-section">
            <div class="git-sync-section-title">${lang==='en' ? 'Detected paths from server log' : 'C\u00e1c path nh\u1eadn di\u1ec7n t\u1eeb log server'}</div>
            ${gitSyncRenderSimpleFileTable(paths.map(path=>({status:'PATH', path})), lang==='en' ? 'No file path was extracted from the raw server detail.' : 'Kh\u00f4ng tr\u00edch xu\u1ea5t \u0111\u01b0\u1ee3c path n\u00e0o t\u1eeb log l\u1ed7i server.')}
          </section>
        ` : ''}
        ${gitSyncRenderOutputBlock(lang==='en' ? 'Raw server detail' : 'Chi ti\u1ebft l\u1ed7i g\u1ed1c t\u1eeb server', detail || errorCode)}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en' ? 'Close' : '\u0110\u00f3ng'}</button>
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

function openRemoteUpdateErrorModal(res){
  closeGitSyncModal();
  const branch = String((res && res.branch) || 'main');
  const detail = String((res && res.detail) || '').trim();
  const errorCode = String((res && res.error) || 'git_pull_failed').trim();
  const paths = adminGitExtractDetailPaths(detail);
  const canDiscard = errorCode === 'working_tree_dirty' || errorCode === 'staged_changes_present';
  const modal = document.createElement('div');
  modal.id = 'git-sync-modal';
  modal.className = 'modal-overlay';
  modal.innerHTML = `
    <div class="modal git-sync-modal is-error">
      <div class="git-sync-modal-head">
        <div>
          <div class="git-sync-modal-kicker">${escapeHtml(lang==='en' ? 'Update from Remote' : 'C\u1eadp nh\u1eadt t\u1eeb remote')}</div>
          <h3>${escapeHtml(lang==='en' ? 'Remote Update Failed' : 'C\u1eadp nh\u1eadt t\u1eeb remote th\u1ea5t b\u1ea1i')}</h3>
        </div>
        <button class="icon-btn" onclick="closeGitSyncModal()" aria-label="Close">x</button>
      </div>
      <div class="git-sync-modal-body">
        <div class="git-sync-summary-grid git-sync-summary-grid--compact">
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Branch' : 'Nh\u00e1nh', branch)}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Error code' : 'M\u00e3 l\u1ed7i', errorCode || '--')}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Detected paths' : 'S\u1ed1 path', String(paths.length))}
          ${gitSyncRenderSummaryCard(lang==='en' ? 'Server time' : 'Th\u1eddi gian server', gitRepoFormatTime(res && res.server_time) || '--')}
        </div>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Readable summary' : 'T\u00f3m t\u1eaft d\u1ec5 hi\u1ec3u'}</div>
          <div class="git-sync-callout is-error">${escapeHtml(remoteUpdateErrorMessage(res))}</div>
        </section>
        <section class="git-sync-section">
          <div class="git-sync-section-title">${lang==='en' ? 'Recommended handling' : 'H\u01b0\u1edbng x\u1eed l\u00fd \u0111\u1ec1 ngh\u1ecb'}</div>
          <div class="git-sync-callout">${escapeHtml(remoteUpdateGuidance(res))}</div>
        </section>
        ${paths.length ? `
          <section class="git-sync-section">
            <div class="git-sync-section-title">${lang==='en' ? 'Detected paths from server log' : 'C\u00e1c path nh\u1eadn di\u1ec7n t\u1eeb log server'}</div>
            ${gitSyncRenderSimpleFileTable(paths.map(path=>({status:'PATH', path})), lang==='en' ? 'No file path was extracted from the raw server detail.' : 'Kh\u00f4ng tr\u00edch xu\u1ea5t \u0111\u01b0\u1ee3c path n\u00e0o t\u1eeb log l\u1ed7i server.')}
          </section>
        ` : ''}
        ${gitSyncRenderOutputBlock(lang==='en' ? 'Raw server detail' : 'Chi ti\u1ebft l\u1ed7i g\u1ed1c t\u1eeb server', detail)}
      </div>
      <div class="modal-actions git-sync-modal-actions">
        <button class="btn-admin secondary" onclick="closeGitSyncModal()">${lang==='en' ? 'Close' : '\u0110\u00f3ng'}</button>
        ${canDiscard ? `<button class="btn-admin primary" onclick="closeGitSyncModal();adminDiscardLocalChanges()">${lang==='en' ? 'Discard local changes' : 'B\u1ecf thay \u0111\u1ed5i local'}</button>` : ''}
      </div>
    </div>`;
  document.body.appendChild(modal);
  modal.addEventListener('click', e=>{ if(e.target === modal) closeGitSyncModal(); });
}

async function adminPublishRepoChanges(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const msg = lang==='en'
    ? 'Publish meaningful repository changes from this cPanel server back to Git now? Runtime noise will still be ignored.'
    : 'Xu\u1ea5t b\u1ea3n c\u00e1c thay \u0111\u1ed5i meaningful t\u1eeb server cPanel n\u00e0y l\u00ean Git ngay b\u00e2y gi\u1edd? C\u00e1c file runtime v\u1eabn s\u1ebd b\u1ecb b\u1ecf qua.';
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
    adminRefreshGitRepoStatus();
    if(currentPage === 'admin') renderAdmin();
  }
}

async function adminUpdateFromRemote(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const msg = lang==='en'
    ? 'Update the checked-out branch from origin now? This follows cPanel Version Control behavior and will not auto-commit server-side runtime changes before pulling.'
    : 'C\u1eadp nh\u1eadt nh\u00e1nh \u0111ang checkout t\u1eeb origin ngay b\u00e2y gi\u1edd? C\u00e1ch n\u00e0y b\u00e1m theo h\u00e0nh vi cPanel Version Control v\u00e0 s\u1ebd kh\u00f4ng auto-commit c\u00e1c thay \u0111\u1ed5i runtime ph\u00eda server tr\u01b0\u1edbc khi pull.';
  if(!confirm(msg)) return;

  gitSyncBusyMode = 'pull';
  renderAdmin();
  try{
    const res = await apiCall('admin_git_pull', {});
    if(!(res && res.ok)){
      openRemoteUpdateErrorModal(res || {error:'git_pull_failed', detail:''});
      return;
    }
    openRemoteUpdateReportModal(res);
  }catch(e){
    openRemoteUpdateErrorModal({
      error:'git_pull_failed',
      detail:(e && e.message) ? String(e.message) : '',
      server_time:new Date().toISOString()
    });
  }finally{
    gitSyncBusyMode = '';
    adminRefreshGitRepoStatus();
    if(currentPage === 'admin') renderAdmin();
  }
}

async function adminDiscardLocalChanges(){
  if(!isAdmin() || isGitSyncBusy()) return;
  const status = getGitRepoStatus();
  const dirtyCount = Number(status && status.meaningful_dirty_count || 0);
  const msg = lang==='en'
    ? `Discard ${dirtyCount || 'all'} meaningful local change(s) on this cPanel repo now? Tracked edits will be restored to HEAD and untracked files will be deleted so you can update from remote.`
    : `H\u1ee7y ${dirtyCount || 'to\u00e0n b\u1ed9'} thay \u0111\u1ed5i local meaningful tr\u00ean repo cPanel n\u00e0y ngay b\u00e2y gi\u1edd? File \u0111\u00e3 track s\u1ebd \u0111\u01b0\u1ee3c kh\u00f4i ph\u1ee5c v\u1ec1 HEAD, c\u00f2n file ch\u01b0a track s\u1ebd b\u1ecb x\u00f3a \u0111\u1ec3 b\u1ea1n c\u00f3 th\u1ec3 c\u1eadp nh\u1eadt t\u1eeb remote.`;
  if(!confirm(msg)) return;

  gitSyncBusyMode = 'discard';
  renderAdmin();
  try{
    const res = await apiCall('admin_git_discard_local', {});
    if(!(res && res.ok)){
      openDiscardLocalErrorModal(res || {error:'git_discard_failed', detail:''});
      return;
    }
    openDiscardLocalReportModal(res);
  }catch(e){
    openDiscardLocalErrorModal({
      error:'git_discard_failed',
      detail:(e && e.message) ? String(e.message) : '',
      server_time:new Date().toISOString()
    });
  }finally{
    gitSyncBusyMode = '';
    adminRefreshGitRepoStatus();
    if(currentPage === 'admin') renderAdmin();
  }
}

function renderAdminSyncPanelV2(){
  const pullBusy = gitSyncBusyMode === 'pull';
  const pushBusy = gitSyncBusyMode === 'push';
  const discardBusy = gitSyncBusyMode === 'discard';
  const disablePull = (isGitSyncBusy() && !pullBusy) || (gitRepoStatusState.loading && !gitRepoStatusState.loaded);
  const disablePush = (isGitSyncBusy() && !pushBusy) || (gitRepoStatusState.loading && !gitRepoStatusState.loaded);
  const disableDiscard = (isGitSyncBusy() && !discardBusy) || (gitRepoStatusState.loading && !gitRepoStatusState.loaded);
  const status = gitRepoStatusState.data && typeof gitRepoStatusState.data === 'object' ? gitRepoStatusState.data : null;
  const statusError = String(gitRepoStatusState.error || '').trim();
  const relativeState = gitRepoRelativeState(status);
  const workingTreeState = gitRepoWorkingTreeState(status);
  const dirtyEntries = Array.isArray(status && status.meaningful_dirty_entries) ? status.meaningful_dirty_entries : [];
  const fetchError = String((status && status.fetch_error) || '').trim();
  const deployState = !status
    ? {label:'--', tone:'neutral'}
    : status.deploy_ready
      ? {label:(lang==='en' ? 'Deploy-ready' : 'S\u1eb5n s\u00e0ng deploy'), tone:'good'}
      : status.cpanel_yml_exists
        ? {label:(lang==='en' ? 'Deploy blocked' : 'Deploy b\u1ecb ch\u1eb7n'), tone:'warn'}
        : {label:(lang==='en' ? 'No cpanel.yml' : 'Thi\u1ebfu cpanel.yml'), tone:'neutral'};
  const branch = String((status && status.branch) || 'main');
  const remoteBranch = String((status && status.remote_branch) || `origin/${branch}`);
  const repoPath = String((status && status.repo_path) || '--');
  const remoteUrl = String((status && status.remote_url) || '--');
  const headMeta = gitRepoCommitMeta(status && status.head) || (lang==='en' ? 'No local commit metadata available.' : 'Ch\u01b0a \u0111\u1ecdc \u0111\u01b0\u1ee3c metadata commit local.');
  const remoteMeta = gitRepoCommitMeta(status && status.remote_head) || (lang==='en' ? 'No remote commit metadata available.' : 'Ch\u01b0a \u0111\u1ecdc \u0111\u01b0\u1ee3c metadata commit remote.');
  const metaRow = (label, value, code=false) => `
    <div class="admin-sync-meta-row">
      <div class="admin-sync-meta-label">${escapeHtml(label)}</div>
      <div class="admin-sync-meta-value">${code ? `<code>${escapeHtml(value || '--')}</code>` : escapeHtml(value || '--')}</div>
    </div>`;
  const notice = (() => {
    if(gitRepoStatusState.loading && !status){
      return `<div class="admin-sync-callout-bar is-info">${escapeHtml(lang==='en' ? 'Refreshing repository status from the cPanel server...' : '\u0110ang l\u00e0m m\u1edbi tr\u1ea1ng th\u00e1i repo t\u1eeb server cPanel...')}</div>`;
    }
    if(statusError){
      return `<div class="admin-sync-callout-bar is-error">${escapeHtml((lang==='en' ? 'Could not read repository status. ' : 'Kh\u00f4ng \u0111\u1ecdc \u0111\u01b0\u1ee3c tr\u1ea1ng th\u00e1i repo. ') + statusError)}</div>`;
    }
    if(fetchError){
      return `<div class="admin-sync-callout-bar is-warn">${escapeHtml((lang==='en' ? 'Origin fetch returned a warning. Showing the best status available from the server: ' : 'L\u1ec7nh fetch origin tr\u1ea3 v\u1ec1 c\u1ea3nh b\u00e1o. Portal \u0111ang hi\u1ec3n th\u1ecb tr\u1ea1ng th\u00e1i t\u1ed1t nh\u1ea5t \u0111\u1ecdc \u0111\u01b0\u1ee3c t\u1eeb server: ') + fetchError)}</div>`;
    }
    if(status && Number(status.meaningful_dirty_count || 0) > 0){
      return `<div class="admin-sync-callout-bar is-warn">${escapeHtml(lang==='en' ? 'The checked-out branch currently has local repository changes. Update from Remote now behaves like cPanel and expects this working tree to be clean first. Use Discard Local Changes if those edits are temporary or wrong.' : 'Nh\u00e1nh \u0111ang checkout hi\u1ec7n c\u00f2n thay \u0111\u1ed5i local. N\u00fat C\u1eadp nh\u1eadt t\u1eeb remote gi\u1edd s\u1ebd ho\u1ea1t \u0111\u1ed9ng gi\u1ed1ng cPanel v\u00e0 y\u00eau c\u1ea7u working tree ph\u1ea3i s\u1ea1ch tr\u01b0\u1edbc. N\u1ebfu c\u00e1c thay \u0111\u1ed5i n\u00e0y ch\u1ec9 l\u00e0 t\u1ea1m th\u1eddi ho\u1eb7c sai, b\u1ea1n c\u00f3 th\u1ec3 d\u00f9ng B\u1ecf thay \u0111\u1ed5i local.' )}</div>`;
    }
    if(status && Number(status.behind_count || 0) > 0){
      return `<div class="admin-sync-callout-bar is-good">${escapeHtml(lang==='en' ? `Origin has ${Number(status.behind_count || 0)} newer commit(s) ready for this server.` : `Origin \u0111ang c\u00f3 ${Number(status.behind_count || 0)} commit m\u1edbi h\u01a1n s\u1eb5n s\u00e0ng \u00e1p xu\u1ed1ng server n\u00e0y.`)}</div>`;
    }
    return `<div class="admin-sync-callout-bar is-info">${escapeHtml(lang==='en' ? 'This repository is currently aligned with its tracked remote branch.' : 'Repo n\u00e0y hi\u1ec7n \u0111ang kh\u1edbp v\u1edbi nh\u00e1nh remote \u0111\u01b0\u1ee3c theo d\u00f5i.')}</div>`;
  })();

  return `
    <section class="admin-sync-strip admin-sync-strip--cpanel">
      <div class="admin-sync-head admin-sync-head--cpanel">
        <div class="admin-sync-title-wrap">
          <div class="admin-sync-kicker">${lang==='en' ? 'Version control' : '\u0110i\u1ec1u khi\u1ec3n phi\u00ean b\u1ea3n'}</div>
          <h3>${lang==='en' ? 'Repository Update Like cPanel' : 'C\u1eadp nh\u1eadt repo gi\u1ed1ng cPanel'}</h3>
          <p>${lang==='en'
            ? 'This panel follows the checked-out branch on the cPanel server. Update from Remote only pulls from origin and never auto-commits runtime or telemetry files before updating.'
            : 'B\u1ea3ng n\u00e0y b\u00e1m theo nh\u00e1nh \u0111ang checkout tr\u00ean server cPanel. C\u1eadp nh\u1eadt t\u1eeb remote ch\u1ec9 k\u00e9o t\u1eeb origin v\u00e0 kh\u00f4ng bao gi\u1edd auto-commit c\u00e1c file runtime ho\u1eb7c telemetry tr\u01b0\u1edbc khi c\u1eadp nh\u1eadt.'}</p>
        </div>
        <div class="admin-sync-head-actions">
          <button class="admin-sync-mini" onclick="adminRefreshGitRepoStatus()">
            <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
            <span>${lang==='en' ? 'Refresh status' : 'L\u00e0m m\u1edbi tr\u1ea1ng th\u00e1i'}</span>
          </button>
          <button class="admin-sync-mini" onclick="rescanDocs().then(n=>{showToast('Scanned: '+n+' docs');renderAdmin()})">
            <span class="admin-sync-mini-ico">${adminGitSyncIcon('sync')}</span>
            <span>${lang==='en' ? 'Rescan folders' : 'Qu\u00e9t l\u1ea1i th\u01b0 m\u1ee5c'}</span>
          </button>
        </div>
      </div>
      ${notice}
      <div class="admin-sync-cpanel-grid">
        <article class="admin-sync-cpanel-card">
          <div class="admin-sync-panel-title">${lang==='en' ? 'Basic Information' : 'Th\u00f4ng tin c\u01a1 b\u1ea3n'}</div>
          <div class="admin-sync-meta-list">
            ${metaRow(lang==='en' ? 'Repository path' : '\u0110\u01b0\u1eddng d\u1eabn repo', repoPath, true)}
            ${metaRow(lang==='en' ? 'Remote URL' : 'Remote URL', remoteUrl, true)}
            ${metaRow(lang==='en' ? 'Checked-out branch' : 'Nh\u00e1nh \u0111ang checkout', branch)}
            ${metaRow(lang==='en' ? 'Tracked remote branch' : 'Nh\u00e1nh remote \u0111ang theo d\u00f5i', remoteBranch)}
            ${metaRow(lang==='en' ? 'Server time' : 'Th\u1eddi gian server', gitRepoFormatTime(status && status.server_time) || '--')}
          </div>
        </article>
        <article class="admin-sync-cpanel-card">
          <div class="admin-sync-panel-title">${lang==='en' ? 'Remote State' : 'Tr\u1ea1ng th\u00e1i remote'}</div>
          <div class="admin-sync-pill-row">
            ${gitRepoStatusPill(relativeState.label, relativeState.tone)}
            ${gitRepoStatusPill(workingTreeState.label, workingTreeState.tone)}
            ${gitRepoStatusPill(deployState.label, deployState.tone)}
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
          <div class="admin-sync-panel-title">${lang==='en' ? 'Local changes blocking remote update' : 'C\u00e1c thay \u0111\u1ed5i local \u0111ang ch\u1eb7n c\u1eadp nh\u1eadt remote'}</div>
          ${gitSyncRenderSimpleFileTable(dirtyEntries, lang==='en' ? 'The checked-out branch is clean.' : 'Nh\u00e1nh \u0111ang checkout \u0111ang s\u1ea1ch.')}
        </div>
      ` : ''}
      <div class="admin-sync-action-row">
        <button class="admin-sync-action is-primary ${pullBusy?'is-busy':''}" onclick="adminUpdateFromRemote()" ${(pullBusy || disablePull)?'disabled':''}>
          <span class="admin-sync-action-icon">${adminGitSyncIcon('pull')}</span>
          <span class="admin-sync-action-copy">
            <b>${lang==='en' ? 'Update from Remote' : 'C\u1eadp nh\u1eadt t\u1eeb remote'}</b>
            <small>${lang==='en'
              ? 'Works like cPanel Version Control on the checked-out branch and never auto-commits server runtime noise.'
              : 'Ho\u1ea1t \u0111\u1ed9ng gi\u1ed1ng cPanel Version Control tr\u00ean nh\u00e1nh \u0111ang checkout v\u00e0 kh\u00f4ng auto-commit runtime noise ph\u00eda server.'}</small>
          </span>
          <span class="admin-sync-action-arrow">${pullBusy ? (lang==='en' ? 'Running...' : '\u0110ang ch\u1ea1y...') : (lang==='en' ? 'Update now' : 'C\u1eadp nh\u1eadt ngay')}</span>
        </button>
        ${dirtyEntries.length ? `
          <button class="admin-sync-action is-warn ${discardBusy?'is-busy':''}" onclick="adminDiscardLocalChanges()" ${(discardBusy || disableDiscard)?'disabled':''}>
            <span class="admin-sync-action-icon">${adminGitSyncIcon('discard')}</span>
            <span class="admin-sync-action-copy">
              <b>${lang==='en' ? 'Discard Local Changes' : 'B\u1ecf thay \u0111\u1ed5i local'}</b>
              <small>${lang==='en'
                ? 'Restore tracked files back to HEAD and delete untracked local files so this branch becomes clean for remote update.'
                : 'Kh\u00f4i ph\u1ee5c file \u0111\u00e3 track v\u1ec1 HEAD v\u00e0 x\u00f3a file local ch\u01b0a track \u0111\u1ec3 nh\u00e1nh n\u00e0y s\u1ea1ch l\u1ea1i tr\u01b0\u1edbc khi c\u1eadp nh\u1eadt remote.'}</small>
            </span>
            <span class="admin-sync-action-arrow">${discardBusy ? (lang==='en' ? 'Running...' : '\u0110ang ch\u1ea1y...') : (lang==='en' ? 'Discard now' : 'H\u1ee7y ngay')}</span>
          </button>
        ` : ''}
        <button class="admin-sync-action ${pushBusy?'is-busy':''}" onclick="adminPublishRepoChanges()" ${(pushBusy || disablePush)?'disabled':''}>
          <span class="admin-sync-action-icon">${adminGitSyncIcon('push')}</span>
          <span class="admin-sync-action-copy">
            <b>${lang==='en' ? 'Publish Local Changes' : 'Xu\u1ea5t b\u1ea3n thay \u0111\u1ed5i local'}</b>
            <small>${lang==='en'
              ? 'Commit meaningful repository edits from cPanel back to GitHub when you intentionally changed the live repo.'
              : 'Commit c\u00e1c thay \u0111\u1ed5i meaningful trong repo tr\u00ean cPanel l\u00ean GitHub khi b\u1ea1n c\u1ed1 \u00fd s\u1eeda tr\u1ef1c ti\u1ebfp repo \u0111ang ch\u1ea1y.'}</small>
          </span>
          <span class="admin-sync-action-arrow">${pushBusy ? (lang==='en' ? 'Running...' : '\u0110ang ch\u1ea1y...') : (lang==='en' ? 'Push now' : 'Push ngay')}</span>
        </button>
      </div>
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
      <div class="admin-stat"><div class="val">${DEPARTMENTS.length}</div><div class="lbl">${lang==='en'?'Departments':'PhÃ²ng ban'}</div></div>
      <div class="admin-stat"><div class="val">${Object.keys(ROLES).length}</div><div class="lbl">${T('admin_total_roles')}</div></div>
      <div class="admin-stat"><div class="val">${DOCS.length}</div><div class="lbl">${T('admin_total_docs')} <span style="font-size:9px;color:#10b981">â— LIVE</span></div></div>
      <div class="admin-stat"><div class="val">${activeUsers}</div><div class="lbl">Active</div></div>
    </div>
    <div class="admin-tabs-v2">
      <button class="admin-tab-v2 ${adminTab==='users'?'active':''}" onclick="adminTab='users';renderAdmin()"><span class="admin-tab-icon">ðŸ‘¥</span><span class="admin-tab-label">${T('admin_users')}</span><span class="tab-badge">${USERS.length}</span></button>
      <button class="admin-tab-v2 ${adminTab==='dept_title'?'active':''}" onclick="adminTab='dept_title';renderAdmin()"><span class="admin-tab-icon">ðŸ¢</span><span class="admin-tab-label">${lang==='en'?'Dept & Titles':'PhÃ²ng ban & Chá»©c danh'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='roles'?'active':''}" onclick="adminTab='roles';renderAdmin()"><span class="admin-tab-icon">ðŸ›¡</span><span class="admin-tab-label">${T('admin_roles')}</span></button>
      <button class="admin-tab-v2 ${adminTab==='orgchart'?'active':''}" onclick="adminTab='orgchart';renderAdmin()"><span class="admin-tab-icon">ðŸ—</span><span class="admin-tab-label">${lang==='en'?'Org Chart':'SÆ¡ Ä‘á»“ tá»• chá»©c'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='perms'?'active':''}" onclick="adminTab='perms';renderAdmin()"><span class="admin-tab-icon">ðŸ”</span><span class="admin-tab-label">${T('admin_perms')}</span></button>
      <button class="admin-tab-v2 ${adminTab==='activity'?'active':''}" onclick="adminTab='activity';renderAdmin()" ${canViewActivityLog()?'':'style="display:none"'}><span class="admin-tab-icon">ðŸ“Š</span><span class="admin-tab-label">${lang==='en'?'Activity Log':'Kiá»ƒm soÃ¡t hÃ nh vi'}</span><span class="tab-badge">${ACTIVITY_LOG.length}</span></button>
      <button class="admin-tab-v2 ${adminTab==='docs'?'active':''}" onclick="adminTab='docs';renderAdmin()"><span class="admin-tab-icon">ðŸ“„</span><span class="admin-tab-label">${T('admin_effective_docs')}</span></button>
      <button class="admin-tab-v2 ${adminTab==='version_control'?'active':''}" onclick="adminTab='version_control';renderAdmin()"><span class="admin-tab-icon">ðŸ”„</span><span class="admin-tab-label">${lang==='en'?'Version Control':'Äiá»u khiá»ƒn phiÃªn báº£n'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='portal_display'?'active':''}" onclick="adminTab='portal_display';renderAdmin()"><span class="admin-tab-icon">ðŸ§­</span><span class="admin-tab-label">${lang==='en'?'Portal display':'Hiá»ƒn thá»‹ portal'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='retention'?'active':''}" onclick="adminTab='retention';renderAdmin()"><span class="admin-tab-icon">ðŸ“‹</span><span class="admin-tab-label">${lang==='en'?'Retention':'LÆ°u giá»¯'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='manual_runtime'?'active':''}" onclick="adminTab='manual_runtime';renderAdmin()"><span class="admin-tab-icon">ðŸ§¾</span><span class="admin-tab-label">${lang==='en'?'Manual runtime':'Nháº­p tay váº­n hÃ nh'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='data_sources'?'active':''}" onclick="adminTab='data_sources';renderAdmin()"><span class="admin-tab-icon">ðŸ—„</span><span class="admin-tab-label">${lang==='en'?'Data sources':'Nguá»“n dá»¯ liá»‡u'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='metadata_studio'?'active':''}" onclick="adminTab='metadata_studio';renderAdmin()"><span class="admin-tab-label">API &amp; DB Studio</span></button>
      <button class="admin-tab-v2 ${adminTab==='mfa'?'active':''}" onclick="adminTab='mfa';renderAdmin()"><span class="admin-tab-icon">ðŸ”‘</span><span class="admin-tab-label">${lang==='en'?'MFA Security':'Báº£o máº­t MFA'}</span></button>
      <button class="admin-tab-v2 ${adminTab==='appearance'?'active':''}" onclick="adminTab='appearance';renderAdmin()"><span class="admin-tab-icon">ðŸŽ¨</span><span class="admin-tab-label">${lang==='en'?'Appearance':'Giao diá»‡n'}</span></button>
    </div>
    <div class="admin-panel" id="admin-content"></div>`;
  if(adminTab==='version_control' && !gitRepoStatusState.loaded && !gitRepoStatusState.loading && !gitRepoStatusState.error){
    loadGitRepoStatus({silent:true});
  }
  if(adminTab==='users') renderAdminUsers();
  if(adminTab==='dept_title') renderAdminDeptTitle();
  if(adminTab==='perms') renderAdminPerms();
  if(adminTab==='roles') renderAdminRoles();
  if(adminTab==='orgchart') renderAdminOrgChart();
  if(adminTab==='activity') renderAdminActivity();
  if(adminTab==='docs') renderAdminEffectiveDocs();
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
  if(adminTab==='appearance') renderAdminAppearance();
}

/* â”€â”€ Admin: Appearance Settings â€” Enterprise Theme Editor v2 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
var _appSubTab = 'overview';

function renderAdminMetadataStudio(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  if(typeof window._renderAdminMetadataStudio === 'function'){
    window._renderAdminMetadataStudio(el);
    return;
  }
  el.innerHTML='<div class="hm-empty">'+(lang==='en'?'Loading API & DB Studio...':'Dang tai API & DB Studio...')+'</div>';
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
      el.innerHTML='<div class="hm-empty">Failed to initialize metadata studio.</div>';
    })();
    return;
  }
  var script=document.createElement('script');
  script.id='admin-metadata-studio-script';
  script.src='scripts/portal/32-admin-metadata-studio.js?v=20260403';
  script.onload=function(){
    if(typeof window._renderAdminMetadataStudio === 'function'){
      window._renderAdminMetadataStudio(el);
    }
  };
  script.onerror=function(){
    el.innerHTML='<div class="hm-empty">Failed to load metadata studio. Check 32-admin-metadata-studio.js</div>';
  };
  document.head.appendChild(script);
}

function renderAdminAppearance(){
  const el=document.getElementById('admin-content');
  if(!el) return;
  var expectedVersion = '20260405n';
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
  el.innerHTML='<div style="text-align:center;padding:40px;color:var(--text-3)">Äang táº£i cÃ i Ä‘áº·t MFA...</div>';

  apiCall('admin_mfa_settings_get',{},'GET').then(function(res){
    if(!res||!res.ok){
      el.innerHTML='<div style="color:var(--red);padding:20px">Lá»—i táº£i MFA settings: '+(res?res.error:'unknown')+'</div>';
      return;
    }
    const d=res;
    const requireMfa=d.require_mfa;
    const users=d.users_mfa||[];
    const enrolled=d.mfa_enrolled||0;
    const total=d.total_users||0;

    let html='<div style="margin-bottom:24px">';
    html+='<h3 style="font-size:16px;font-weight:700;margin-bottom:12px">'+(lang==='en'?'MFA Security Settings':'CÃ i Ä‘áº·t báº£o máº­t MFA')+'</h3>';

    // Global toggle
    html+='<div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;padding:16px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px">';
    html+='<label style="font-weight:600;flex:1">'+(lang==='en'?'Require MFA for all users':'YÃªu cáº§u MFA cho táº¥t cáº£ ngÆ°á»i dÃ¹ng')+'</label>';
    html+='<button id="mfa-toggle-btn" style="padding:8px 20px;border-radius:6px;border:none;cursor:pointer;font-weight:600;color:#fff;background:'+(requireMfa?'var(--green)':'var(--red)')+'">'+(requireMfa?(lang==='en'?'ON â€” Required':'Báº¬T â€” Báº¯t buá»™c'):(lang==='en'?'OFF â€” Not required':'Táº®T â€” KhÃ´ng báº¯t buá»™c'))+'</button>';
    html+='</div>';

    // Stats
    html+='<div style="display:flex;gap:16px;margin-bottom:20px">';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700">'+total+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'Total users':'Tá»•ng ngÆ°á»i dÃ¹ng')+'</div></div>';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700;color:var(--green)">'+enrolled+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'MFA enrolled':'ÄÃ£ Ä‘Äƒng kÃ½ MFA')+'</div></div>';
    html+='<div style="flex:1;padding:12px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border);border-radius:8px;text-align:center"><div style="font-size:24px;font-weight:700;color:'+(requireMfa?'var(--red)':'var(--text-3)')+'">'+(total-enrolled)+'</div><div style="font-size:12px;color:var(--text-3)">'+(lang==='en'?'Not enrolled':'ChÆ°a Ä‘Äƒng kÃ½')+'</div></div>';
    html+='</div>';

    // User table
    html+='<h4 style="font-size:14px;font-weight:600;margin-bottom:8px">'+(lang==='en'?'Per-User MFA Status':'Tráº¡ng thÃ¡i MFA theo ngÆ°á»i dÃ¹ng')+'</h4>';
    html+='<table style="width:100%;border-collapse:collapse;font-size:13px">';
    html+='<thead><tr style="background:var(--bg-surface-alt,var(--bg));border-bottom:1px solid var(--border)"><th style="padding:8px;text-align:left">'+(lang==='en'?'User':'NgÆ°á»i dÃ¹ng')+'</th><th style="padding:8px;text-align:left">'+(lang==='en'?'Name':'Há» tÃªn')+'</th><th style="padding:8px;text-align:left">'+(lang==='en'?'Role':'Vai trÃ²')+'</th><th style="padding:8px;text-align:center">MFA</th><th style="padding:8px;text-align:center">'+(lang==='en'?'Actions':'Thao tÃ¡c')+'</th></tr></thead><tbody>';

    users.forEach(function(u){
      html+='<tr style="border-bottom:1px solid var(--border)">';
      html+='<td style="padding:8px;font-weight:600">'+String(u.username||'')+'</td>';
      html+='<td style="padding:8px">'+String(u.name||'')+'</td>';
      html+='<td style="padding:8px"><span style="padding:2px 8px;border-radius:4px;font-size:11px;background:var(--bg-surface-alt,var(--bg));border:1px solid var(--border)">'+String(u.role||'')+'</span></td>';
      html+='<td style="padding:8px;text-align:center">'+(u.mfa_enabled?'<span style="color:var(--green);font-weight:700">âœ“ '+('Báº¬T')+'</span>':'<span style="color:var(--text-3)">âœ— '+('Táº®T')+'</span>')+'</td>';
      html+='<td style="padding:8px;text-align:center">';
      if(u.mfa_enabled){
        html+='<button data-mfa-reset="'+String(u.username||'')+'" style="padding:4px 10px;border:1px solid var(--border);border-radius:4px;cursor:pointer;font-size:11px;background:var(--bg-surface,#fff);color:var(--text-primary)">'+(lang==='en'?'Reset':'Äáº·t láº¡i')+'</button> ';
        html+='<button data-mfa-disable="'+String(u.username||'')+'" style="padding:4px 10px;border:1px solid color-mix(in srgb, var(--red) 30%, var(--border));border-radius:4px;cursor:pointer;font-size:11px;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));color:var(--red)">'+(lang==='en'?'Disable':'Táº¯t')+'</button>';
      } else {
        html+='<span style="color:var(--text-3);font-size:11px">'+(lang==='en'?'Will enroll on login':'Sáº½ Ä‘Äƒng kÃ½ khi Ä‘Äƒng nháº­p')+'</span>';
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
        else { alert('Lá»—i: '+(r?r.error:'unknown')); }
      });
    });

    el.querySelectorAll('[data-mfa-reset]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var username=this.getAttribute('data-mfa-reset');
        if(!confirm((lang==='en'?'Reset MFA for ':'Äáº·t láº¡i MFA cho ')+username+'?')) return;
        apiCall('admin_mfa_settings_save',{reset_user:username}).then(function(r){
          if(r&&r.ok) renderAdminMfa();
        });
      });
    });

    el.querySelectorAll('[data-mfa-disable]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var username=this.getAttribute('data-mfa-disable');
        if(!confirm((lang==='en'?'Disable MFA for ':'Táº¯t MFA cho ')+username+'?')) return;
        apiCall('admin_mfa_settings_save',{disable_user:username}).then(function(r){
          if(r&&r.ok) renderAdminMfa();
        });
      });
    });
  });
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
      ? (lang==='en' ? 'Inline page' : 'Trang HTML hiá»ƒn thá»‹ trá»±c tiáº¿p')
      : (lang==='en' ? 'Controlled download / file stream' : 'Tá»‡p Ä‘Æ°á»£c quáº£n lÃ½ vÃ  táº£i qua portal');
    const sourceLabel = customExt.has(ext)
      ? (lang==='en' ? 'Custom' : 'Tá»± thÃªm')
      : (lang==='en' ? 'Built-in' : 'Máº·c Ä‘á»‹nh');
    const removeBtn = customExt.has(ext)
      ? `<button class="btn-admin secondary portal-display-mini-btn" onclick="removePortalDisplayCustomExtension('${ext}')">${lang==='en'?'Remove':'XÃ³a'}</button>`
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
      ? (lang==='en' ? 'Always visible for admin access' : 'LuÃ´n hiá»‡n Ä‘á»ƒ báº£o toÃ n Ä‘Æ°á»ng vÃ o trang quáº£n trá»‹')
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
          <small>${lang==='en'?'Show or hide this whole group in the left sidebar.':'Báº­t hoáº·c áº©n cáº£ nhÃ³m nÃ y trÃªn thanh bÃªn trÃ¡i.'}</small>
        </span>
      </label>
      <div class="portal-display-option-grid">${categories}</div>
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="portal-display-admin">
      <div class="portal-display-hero">
        <div>
          <div class="portal-display-kicker">${lang==='en'?'Portal display control':'Äiá»u khiá»ƒn hiá»ƒn thá»‹ portal'}</div>
          <h3>${lang==='en'?'Choose what the portal shows':'Chá»n nhá»¯ng gÃ¬ portal Ä‘Æ°á»£c hiá»ƒn thá»‹'}</h3>
          <p>${lang==='en'
            ? 'Control which file extensions are indexed on the portal, add extra extensions when needed, and decide which left-sidebar items remain visible to users.'
            : 'Quáº£n lÃ½ cÃ¡c Ä‘uÃ´i file Ä‘Æ°á»£c index trÃªn portal, thÃªm Ä‘uÃ´i má»›i khi cáº§n, vÃ  chá»n cÃ¡c má»¥c nÃ o á»Ÿ thanh bÃªn trÃ¡i sáº½ xuáº¥t hiá»‡n vá»›i ngÆ°á»i dÃ¹ng.'}</p>
          ${isLoadingConfig ? `<div class="portal-display-loading-note">${lang==='en'?'Loading saved configuration from server...':'Äang táº£i cáº¥u hÃ¬nh hiá»ƒn thá»‹ Ä‘Ã£ lÆ°u tá»« server...'}</div>` : ''}
        </div>
      </div>

      <div class="portal-display-grid">
        <section class="portal-display-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en'?'Displayed file extensions':'ÄuÃ´i file hiá»ƒn thá»‹'}</h4>
              <p>${lang==='en'
                ? 'Only enabled extensions are scanned from server folders and shown on the portal. Non-HTML extensions open through controlled download mode.'
                : 'Chá»‰ cÃ¡c Ä‘uÃ´i file Ä‘ang báº­t má»›i Ä‘Æ°á»£c scan tá»« thÆ° má»¥c server vÃ  hiá»ƒn thá»‹ lÃªn portal. CÃ¡c Ä‘uÃ´i khÃ´ng pháº£i HTML sáº½ má»Ÿ qua cháº¿ Ä‘á»™ táº£i tá»‡p Ä‘Æ°á»£c kiá»ƒm soÃ¡t.'}</p>
            </div>
          </div>
          <div class="portal-display-add-row">
            <input id="portal-display-new-ext" class="portal-display-input" placeholder="${lang==='en'?'Add extension, e.g. dwg or msg':'ThÃªm Ä‘uÃ´i file, vÃ­ dá»¥ dwg hoáº·c msg'}">
            <button class="btn-admin primary" onclick="addPortalDisplayCustomExtension()">${lang==='en'?'Add extension':'ThÃªm Ä‘uÃ´i file'}</button>
          </div>
          <div class="portal-display-list">${extRows || `<div class="portal-display-empty">${lang==='en'?'No extensions configured.':'ChÆ°a cÃ³ Ä‘uÃ´i file nÃ o Ä‘Æ°á»£c cáº¥u hÃ¬nh.'}</div>`}</div>
        </section>

        <section class="portal-display-card">
          <div class="portal-display-card-head">
            <div>
              <h4>${lang==='en'?'Left sidebar visibility':'Hiá»ƒn thá»‹ thanh bÃªn trÃ¡i'}</h4>
              <p>${lang==='en'
                ? 'Choose which fixed portal entries and category groups should appear in the left navigation.'
                : 'Chá»n cÃ¡c má»¥c cá»‘ Ä‘á»‹nh vÃ  cÃ¡c nhÃ³m tÃ i liá»‡u nÃ o sáº½ xuáº¥t hiá»‡n á»Ÿ thanh Ä‘iá»u hÆ°á»›ng bÃªn trÃ¡i.'}</p>
            </div>
          </div>
          <div class="portal-display-subtitle">${lang==='en'?'Core portal items':'Má»¥c lÃµi cá»§a portal'}</div>
          <div class="portal-display-option-grid">${coreRows}</div>
          <div class="portal-display-subtitle" style="margin-top:16px">${lang==='en'?'Document groups and categories':'NhÃ³m tÃ i liá»‡u vÃ  chuyÃªn má»¥c'}</div>
          <div class="portal-display-section-stack">${sectionRows}</div>
        </section>
      </div>

      <div class="admin-save-bar" id="portal-display-save-bar" style="${portalDisplayConfigDirty?'display:flex':'display:none'}">
        <span class="save-hint">${portalDisplayConfigDirty
          ? `<b>âš  ${lang==='en'?'Unsaved portal display changes':'CÃ³ thay Ä‘á»•i hiá»ƒn thá»‹ portal chÆ°a lÆ°u'}</b>`
          : (lang==='en'?'Adjust the display configuration, then click Save':'Äiá»u chá»‰nh cáº¥u hÃ¬nh hiá»ƒn thá»‹ rá»“i nháº¥n LÆ°u')}</span>
        <button class="btn-admin secondary" onclick="resetPortalDisplayConfigDraft()">â†© ${lang==='en'?'Reset draft':'KhÃ´i phá»¥c báº£n nhÃ¡p'}</button>
        <button class="btn-admin primary" onclick="savePortalDisplayConfig()" style="padding:8px 24px;font-size:13px">ðŸ’¾ ${lang==='en'?'SAVE':'LÆ¯U'}</button>
      </div>
    </div>`;
}

function adminFormatRuntimeStamp(value){
  const raw = String(value || '').trim();
  if(!raw) return lang==='en' ? 'Not available' : 'ChÆ°a cÃ³ dá»¯ liá»‡u';
  try{
    const dt = new Date(raw);
    if(isNaN(dt.getTime())) return raw;
    return dt.toLocaleString(lang==='en' ? 'en-US' : 'vi-VN');
  }catch(e){
    return raw;
  }
}

function adminManualRuntimeCounts(hierarchy){
  const counts = { so:0, jo:0, wo:0 };
  (Array.isArray(hierarchy) ? hierarchy : []).forEach(so => {
    counts.so += 1;
    (Array.isArray(so.job_orders) ? so.job_orders : []).forEach(jo => {
      counts.jo += 1;
      counts.wo += (Array.isArray(jo.work_orders) ? jo.work_orders.length : 0);
    });
  });
  return counts;
}

function adminManualRuntimeRecentRows(hierarchy){
  const rows = [];
  (Array.isArray(hierarchy) ? hierarchy : []).forEach(so => {
    rows.push({
      type:'SO',
      id:String(so.so_number || ''),
      title:[so.customer_name || so.customer_id || '', so.customer_po ? ('PO ' + so.customer_po) : ''].filter(Boolean).join(' Â· '),
      status:String(so.status || ''),
      updated_at:String(so.updated_at || so.created_at || '')
    });
    (Array.isArray(so.job_orders) ? so.job_orders : []).forEach(jo => {
      rows.push({
        type:'JO',
        id:String(jo.jo_number || ''),
        title:[jo.part_number || '', jo.part_revision || ''].filter(Boolean).join(' / '),
        status:String(jo.status || ''),
        updated_at:String(jo.updated_at || jo.created_at || '')
      });
      (Array.isArray(jo.work_orders) ? jo.work_orders : []).forEach(wo => {
        rows.push({
          type:'WO',
          id:String(wo.wo_number || ''),
          title:['OP' + String(wo.operation_number || '-'), wo.operation_desc || '', wo.machine_id || ''].filter(Boolean).join(' Â· '),
          status:String(wo.status || ''),
          updated_at:String(wo.updated_at || wo.created_at || '')
        });
      });
    });
  });
  return rows.sort((a,b) => String(b.updated_at || '').localeCompare(String(a.updated_at || ''))).slice(0, 10);
}

async function loadAdminManualRuntimeState(options={}){
  if(adminManualRuntimeState.loading && !options.force) return;
  adminManualRuntimeState.loading = true;
  adminManualRuntimeState.error = '';
  if(currentPage === 'admin' && adminTab === 'manual_runtime') renderAdminManualRuntime();
  try{
    const [masterRes, hierarchyRes] = await Promise.all([
      apiCall('master_data_snapshot', null, 'GET'),
      apiCall('order_hierarchy', null, 'GET')
    ]);
    if(!(masterRes && masterRes.ok)) throw new Error((masterRes && masterRes.error) || 'master_data_snapshot_failed');
    if(!(hierarchyRes && hierarchyRes.ok)) throw new Error((hierarchyRes && hierarchyRes.error) || 'order_hierarchy_failed');
    adminManualRuntimeState.master = masterRes.data || {};
    adminManualRuntimeState.hierarchy = hierarchyRes.data || hierarchyRes.hierarchy || [];
    adminManualRuntimeState.lastCreated = adminManualRuntimeRecentRows(adminManualRuntimeState.hierarchy)[0] || null;
    adminManualRuntimeState.loaded = true;
  }catch(e){
    adminManualRuntimeState.error = (e && e.message) ? e.message : (lang==='en' ? 'Unable to load manual runtime data.' : 'KhÃ´ng táº£i Ä‘Æ°á»£c dá»¯ liá»‡u váº­n hÃ nh thá»§ cÃ´ng.');
  }finally{
    adminManualRuntimeState.loading = false;
    if(currentPage === 'admin' && adminTab === 'manual_runtime') renderAdminManualRuntime();
  }
}

function adminOpenMasterEntity(entity){
  if(typeof window._mdOpenControl === 'function'){
    window._mdOpenControl(entity);
    return;
  }
  showToast(lang==='en' ? 'âš  Master Data Control is not ready.' : 'âš  ChÆ°a má»Ÿ Ä‘Æ°á»£c mÃ n hÃ¬nh Dá»¯ liá»‡u ná»n.');
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
    showToast(lang==='en' ? 'âš  Could not open the order create form.' : 'âš  KhÃ´ng má»Ÿ Ä‘Æ°á»£c biá»ƒu máº«u táº¡o Ä‘Æ¡n.');
  })();
}

function adminOpenOrderWorkspace(){
  navigateTo('orders');
}

function renderAdminManualRuntime(){
  const el = document.getElementById('admin-content');
  if(!el) return;

  if(!adminManualRuntimeState.loaded && !adminManualRuntimeState.loading){
    loadAdminManualRuntimeState({force:true});
  }

  if(adminManualRuntimeState.loading && !adminManualRuntimeState.loaded){
    el.innerHTML = `<div style="padding:28px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569)">${lang==='en'?'Loading manual runtime workspace...':'Äang táº£i module nháº­p tay váº­n hÃ nh...'}</div>`;
    return;
  }

  const master = adminManualRuntimeState.master || {};
  const hierarchy = Array.isArray(adminManualRuntimeState.hierarchy) ? adminManualRuntimeState.hierarchy : [];
  const orderCounts = adminManualRuntimeCounts(hierarchy);
  const recentRows = adminManualRuntimeRecentRows(hierarchy);
  const checklist = [
    { label:lang==='en'?'Customers':'KhÃ¡ch hÃ ng', count:(master.customers || []).length, entity:'customers' },
    { label:'Part Number', count:(master.parts || []).length, entity:'parts' },
    { label:'Revision', count:(master.revisions || []).length, entity:'revisions' },
    { label:'Work center', count:(master.work_centers || []).length, entity:'work_centers' },
    { label:lang==='en'?'Machines':'MÃ¡y', count:(master.machines || []).length, entity:'machines' },
    { label:lang==='en'?'Operators':'NgÆ°á»i váº­n hÃ nh', count:(master.operators || []).length, entity:'operators' }
  ];
  const missing = checklist.filter(item => Number(item.count || 0) === 0);
  const stats = [
    { label:lang==='en'?'Customers':'KhÃ¡ch hÃ ng', value:(master.customers || []).length },
    { label:'Part Number', value:(master.parts || []).length },
    { label:'Revision', value:(master.revisions || []).length },
    { label:'SO', value:orderCounts.so },
    { label:'JO', value:orderCounts.jo },
    { label:'WO', value:orderCounts.wo }
  ];

  el.innerHTML = `
    <div style="display:grid;gap:16px">
      <section style="border:1px solid var(--border);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb, var(--brand-2) 6%, var(--bg-surface,#fff)) 0%,color-mix(in srgb, var(--blue) 8%, var(--bg-surface,#fff)) 48%,color-mix(in srgb, var(--amber) 8%, var(--bg-surface,#fff)) 100%);padding:22px 24px">
        <div style="display:flex;justify-content:space-between;gap:16px;align-items:flex-start;flex-wrap:wrap">
          <div style="max-width:760px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#0f4c81">${lang==='en'?'Manual runtime mode':'Cháº¿ Ä‘á»™ váº­n hÃ nh nháº­p tay'}</div>
            <h3 style="margin:8px 0 10px;font-size:24px;line-height:1.2;color:#102a43">${lang==='en'?'Operate while Epicor and CNC are offline':'Váº«n váº­n hÃ nh Ä‘Æ°á»£c khi Epicor vÃ  CNC chÆ°a káº¿t ná»‘i'}</h3>
            <p style="margin:0;color:#334e68;line-height:1.65">${lang==='en'
              ? 'Use this area to seed master data, create SO / JO / WO manually, and keep the internal workflow moving before ERP and machine connectors are ready.'
              : 'DÃ¹ng khu vá»±c nÃ y Ä‘á»ƒ seed dá»¯ liá»‡u ná»n, táº¡o SO / JO / WO báº±ng tay, vÃ  giá»¯ workflow ná»™i bá»™ váº­n hÃ nh trÆ°á»›c khi ERP vÃ  káº¿t ná»‘i mÃ¡y sáºµn sÃ ng.'}</p>
            <div style="margin-top:12px;font-size:13px;color:#486581">${lang==='en'
              ? 'The order create forms now accept manual SO / JO / WO numbers. Leave the field blank if you still want automatic numbering.'
              : 'Biá»ƒu máº«u táº¡o Ä‘Æ¡n hiá»‡n Ä‘Ã£ cho phÃ©p nháº­p sá»‘ SO / JO / WO thá»§ cÃ´ng. Náº¿u Ä‘á»ƒ trá»‘ng, há»‡ thá»‘ng váº«n tá»± sinh mÃ£ nhÆ° trÆ°á»›c.'}</div>
          </div>
          <button class="btn-admin secondary" onclick="loadAdminManualRuntimeState({force:true})">âŸ³ ${lang==='en'?'Refresh':'LÃ m má»›i'}</button>
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
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Seed minimum master data':'Seed dá»¯ liá»‡u ná»n tá»‘i thiá»ƒu'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'Create the reference set first so lookup fields in the order forms work without Epicor.'
            : 'Táº¡o bá»™ dá»¯ liá»‡u tham chiáº¿u trÆ°á»›c Ä‘á»ƒ cÃ¡c trÆ°á»ng lookup trong form Ä‘Æ¡n hÃ ng hoáº¡t Ä‘á»™ng ngay cáº£ khi chÆ°a cÃ³ Epicor.'}</p>
          <div style="display:grid;gap:10px">
            ${checklist.map(item => `
              <button type="button" onclick="adminOpenMasterEntity('${item.entity}')" style="display:flex;justify-content:space-between;align-items:center;padding:12px 14px;border-radius:14px;background:${item.count > 0 ? 'color-mix(in srgb, var(--green) 10%, var(--bg-surface,#fff))' : 'color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff))'};border:1px solid ${item.count > 0 ? 'color-mix(in srgb, var(--green) 28%, var(--border))' : 'color-mix(in srgb, var(--amber) 28%, var(--border))'};cursor:pointer;text-align:left">
                <span>
                  <strong style="display:block;color:#102a43">${escapeHtml(item.label)}</strong>
                  <small style="color:#52667a">${item.count > 0 ? (lang==='en'?'Available':'ÄÃ£ cÃ³ dá»¯ liá»‡u') : (lang==='en'?'Missing baseline':'Äang thiáº¿u dá»¯ liá»‡u ná»n')}</small>
                </span>
                <strong style="font-size:20px;color:#102a43">${escapeHtml(String(item.count))}</strong>
              </button>
            `).join('')}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Manual order input':'Nháº­p tay SO / JO / WO'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'Open the governed order forms directly from Admin so operations can start before Epicor inbound is connected.'
            : 'Má»Ÿ trá»±c tiáº¿p cÃ¡c form Ä‘Æ¡n hÃ ng cÃ³ kiá»ƒm soÃ¡t tá»« Admin Ä‘á»ƒ váº­n hÃ nh cÃ³ thá»ƒ báº¯t Ä‘áº§u trÆ°á»›c khi Epicor inbound Ä‘Æ°á»£c káº¿t ná»‘i.'}</p>
          <div style="display:grid;gap:10px">
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('so')">+ SO</button>
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('jo')">+ JO</button>
            <button class="btn-admin primary" onclick="adminOpenOrderManualCreate('wo')">+ WO</button>
            <button class="btn-admin secondary" onclick="adminOpenOrderWorkspace()">${lang==='en'?'Open Order Management':'Má»Ÿ Quáº£n lÃ½ Ä‘Æ¡n hÃ ng'}</button>
          </div>
          <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px dashed var(--border);color:var(--text-secondary,#475569);font-size:13px;line-height:1.6">
            ${lang==='en'
              ? 'Suggested sequence: Customer -> Part Number -> Revision -> Work center / Machine / Operator -> SO -> JO -> WO.'
              : 'TrÃ¬nh tá»± gá»£i Ã½: KhÃ¡ch hÃ ng -> Part Number -> Revision -> Work center / MÃ¡y / NgÆ°á»i váº­n hÃ nh -> SO -> JO -> WO.'}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Current readiness':'Äá»™ sáºµn sÃ ng hiá»‡n táº¡i'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${missing.length
            ? (lang==='en'
              ? ('Still missing baseline data for: ' + missing.map(item => item.label).join(', ') + '.')
              : ('Hiá»‡n váº«n Ä‘ang thiáº¿u dá»¯ liá»‡u ná»n cho: ' + missing.map(item => item.label).join(', ') + '.'))
            : (lang==='en'
              ? 'The minimum baseline is already in place. You can start creating SO / JO / WO manually now.'
              : 'Bá»™ dá»¯ liá»‡u ná»n tá»‘i thiá»ƒu Ä‘Ã£ sáºµn sÃ ng. Báº¡n cÃ³ thá»ƒ báº¯t Ä‘áº§u táº¡o SO / JO / WO thá»§ cÃ´ng ngay bÃ¢y giá».')}
          </p>
          <div style="display:grid;gap:10px">
            <div style="padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border);color:var(--text-secondary,#334e68);line-height:1.6">
              ${lang==='en'
                ? 'Manual mode keeps the workflow alive: users create orders, operators update progress manually, and evidence still links to WO as usual.'
                : 'Cháº¿ Ä‘á»™ thá»§ cÃ´ng váº«n giá»¯ workflow sá»‘ng: ngÆ°á»i dÃ¹ng táº¡o Ä‘Æ¡n, ngÆ°á»i váº­n hÃ nh cáº­p nháº­t tiáº¿n Ä‘á»™ báº±ng tay, vÃ  há»“ sÆ¡ chá»©ng cá»© váº«n liÃªn káº¿t vá» WO nhÆ° bÃ¬nh thÆ°á»ng.'}
            </div>
            <div style="padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber);line-height:1.6">
              ${lang==='en'
                ? 'Security note: secrets for database and external connectors stay on the server, not in editable frontend fields.'
                : 'LÆ°u Ã½ an toÃ n: secret cho database vÃ  káº¿t ná»‘i ngoÃ i váº«n náº±m á»Ÿ server, khÃ´ng Ä‘áº·t trong cÃ¡c Ã´ frontend cÃ³ thá»ƒ sá»­a.'}
            </div>
          </div>
        </article>
      </section>

      <section style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
        <div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;flex-wrap:wrap">
          <div>
            <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Recent records':'Báº£n ghi gáº§n nháº¥t'}</div>
            <div style="margin-top:6px;color:#52667a">${lang==='en'
              ? 'Quickly verify that manual data is being created in the expected order.'
              : 'Kiá»ƒm tra nhanh xem dá»¯ liá»‡u nháº­p tay Ä‘Ã£ Ä‘Æ°á»£c táº¡o Ä‘Ãºng trÃ¬nh tá»± mong muá»‘n hay chÆ°a.'}</div>
          </div>
          <div style="font-size:12px;color:#486581">${lang==='en'?'Last event':'Láº§n cáº­p nháº­t gáº§n nháº¥t'}: ${escapeHtml(adminFormatRuntimeStamp(adminManualRuntimeState.lastCreated && adminManualRuntimeState.lastCreated.updated_at))}</div>
        </div>
        <div style="margin-top:14px;overflow:auto">
          <table class="admin-table" style="width:100%;font-size:12px">
            <thead>
              <tr style="background:var(--bg-surface-alt,#f8fafc)">
                <th style="padding:10px;text-align:left">${lang==='en'?'Type':'Loáº¡i'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Number':'MÃ£'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Description':'MÃ´ táº£'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Status':'Tráº¡ng thÃ¡i'}</th>
                <th style="padding:10px;text-align:left">${lang==='en'?'Updated':'Cáº­p nháº­t'}</th>
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
              `).join('') : `<tr><td colspan="5" style="padding:14px;color:var(--text-secondary)">${lang==='en'?'No SO / JO / WO records yet.':'ChÆ°a cÃ³ SO / JO / WO nÃ o Ä‘Æ°á»£c táº¡o.'}</td></tr>`}
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
    adminDataSourceState.error = (e && e.message) ? e.message : (lang==='en' ? 'Unable to load data source configuration.' : 'KhÃ´ng táº£i Ä‘Æ°á»£c cáº¥u hÃ¬nh nguá»“n dá»¯ liá»‡u.');
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
    showToast(lang==='en' ? 'âœ… Data source configuration saved.' : 'âœ… ÄÃ£ lÆ°u cáº¥u hÃ¬nh nguá»“n dá»¯ liá»‡u.');
  }catch(e){
    adminDataSourceState.loading = false;
    renderAdminDataSources();
    showToast('âš  ' + ((e && e.message) ? e.message : (lang==='en' ? 'Save failed.' : 'LÆ°u cáº¥u hÃ¬nh tháº¥t báº¡i.')));
  }
}

function renderAdminDataSources(){
  const el = document.getElementById('admin-content');
  if(!el) return;

  if(!adminDataSourceState.loaded && !adminDataSourceState.loading){
    loadAdminDataSourceState({force:true});
  }

  if(adminDataSourceState.loading && !adminDataSourceState.loaded){
    el.innerHTML = `<div style="padding:28px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff);color:var(--text-secondary,#475569)">${lang==='en'?'Loading data source diagnostics...':'Äang táº£i cháº©n Ä‘oÃ¡n nguá»“n dá»¯ liá»‡u...'}</div>`;
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

  el.innerHTML = `
    <div style="display:grid;gap:16px">
      <section style="border:1px solid var(--border);border-radius:22px;background:linear-gradient(135deg,color-mix(in srgb, var(--amber) 7%, var(--bg-surface,#fff)) 0%,color-mix(in srgb, var(--blue) 8%, var(--bg-surface,#fff)) 55%,color-mix(in srgb, var(--purple) 8%, var(--bg-surface,#fff)) 100%);padding:22px 24px">
        <div style="display:flex;justify-content:space-between;gap:16px;flex-wrap:wrap;align-items:flex-start">
          <div style="max-width:760px">
            <div style="font-size:11px;font-weight:700;letter-spacing:.08em;text-transform:uppercase;color:#7c2d12">${lang==='en'?'Data source and database control':'Nguá»“n dá»¯ liá»‡u vÃ  Database'}</div>
            <h3 style="margin:8px 0 10px;font-size:24px;line-height:1.2;color:#102a43">${lang==='en'?'Inspect and tune the runtime data layer from frontend':'Kiá»ƒm tra vÃ  chá»‰nh lá»›p dá»¯ liá»‡u runtime ngay trÃªn frontend'}</h3>
            <p style="margin:0;color:#334e68;line-height:1.65">${lang==='en'
              ? 'This panel exposes the active JSON / PostgreSQL runtime mode, shadow-sync health, and the connection profile you can safely adjust without touching server code.'
              : 'Panel nÃ y hiá»ƒn thá»‹ cháº¿ Ä‘á»™ runtime JSON / PostgreSQL Ä‘ang hoáº¡t Ä‘á»™ng, sá»©c khá»e shadow-sync, vÃ  bá»™ cáº¥u hÃ¬nh káº¿t ná»‘i mÃ  báº¡n cÃ³ thá»ƒ chá»‰nh an toÃ n mÃ  khÃ´ng cáº§n sá»­a code server.'}</p>
          </div>
          <button class="btn-admin secondary" onclick="loadAdminDataSourceState({force:true,forceDraftSync:true})">âŸ³ ${lang==='en'?'Refresh diagnostics':'LÃ m má»›i cháº©n Ä‘oÃ¡n'}</button>
        </div>
      </section>

      ${adminDataSourceState.error ? `<div style="padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 12%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber)">${escapeHtml(adminDataSourceState.error)}</div>` : ''}

      <section style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px">
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Runtime mode':'Cháº¿ Ä‘á»™ runtime'}</div>
          <div id="admin-data-source-mode-preview" style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(adminDataSourceModePreview(draft))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'Applied to new requests immediately':'Ãp dá»¥ng ngay cho cÃ¡c request má»›i'}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">PostgreSQL</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:${runtimeMode.postgres_reachable ? '#0f766e' : '#b45309'}">${runtimeMode.postgres_reachable ? (lang==='en'?'Reachable':'Káº¿t ná»‘i Ä‘Æ°á»£c') : (draft.use_postgres ? (lang==='en'?'Unavailable':'ChÆ°a káº¿t ná»‘i') : 'JSON')}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${escapeHtml(runtimeMode.postgres_error || (lang==='en'?'No PostgreSQL error reported':'KhÃ´ng cÃ³ lá»—i PostgreSQL Ä‘Æ°á»£c bÃ¡o'))}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Shadow-sync failures':'Lá»—i shadow-sync'}</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(String(shadowFailures))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'JSON fallback reads':'LÆ°á»£t fallback vá» JSON'}: ${escapeHtml(String(fallbackReads))}</div>
        </div>
        <div style="padding:16px;border:1px solid var(--border);border-radius:18px;background:var(--bg-surface,#fff)">
          <div style="font-size:12px;color:#486581">${lang==='en'?'Connector alerts':'Cáº£nh bÃ¡o connector'}</div>
          <div style="margin-top:6px;font-size:28px;font-weight:700;color:#102a43">${escapeHtml(String(connectorFailures))}</div>
          <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'WO launch blockers':'WO bá»‹ cháº·n'}: ${escapeHtml(String(launchBlockers))}</div>
        </div>
      </section>

      <section style="display:grid;grid-template-columns:minmax(340px,1.25fr) minmax(280px,.95fr);gap:16px">
        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px">
          <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'PostgreSQL runtime profile':'Há»“ sÆ¡ runtime PostgreSQL'}</div>
          <p style="margin:8px 0 14px;color:#52667a;line-height:1.6">${lang==='en'
            ? 'Switch between JSON-only, shadow-write, PostgreSQL-primary, and PostgreSQL-only here. Passwords remain on the server and are not exposed in frontend.'
            : 'Chuyá»ƒn giá»¯a JSON-only, shadow-write, PostgreSQL-primary vÃ  PostgreSQL-only ngay táº¡i Ä‘Ã¢y. Máº­t kháº©u váº«n Ä‘Æ°á»£c giá»¯ á»Ÿ server vÃ  khÃ´ng lá»™ ra frontend.'}</p>
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
              <span style="font-size:12px;color:#486581">${lang==='en'?'Username':'TÃ i khoáº£n'}</span>
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
              <span style="font-size:12px;color:#486581">${lang==='en'?'Connect timeout (s)':'Timeout káº¿t ná»‘i (giÃ¢y)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.connect_timeout || 5))}" oninput="adminDataSourceSetField('connect_timeout', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Statement timeout (ms)':'Statement timeout (ms)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.statement_timeout || 30000))}" oninput="adminDataSourceSetField('statement_timeout', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Read retry count':'Sá»‘ láº§n retry khi Ä‘á»c'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.read_retry_count || 3))}" oninput="adminDataSourceSetField('read_retry_count', Number(this.value || 0))">
            </label>
            <label style="display:grid;gap:6px">
              <span style="font-size:12px;color:#486581">${lang==='en'?'Read retry delay (ms)':'Äá»™ trá»… retry khi Ä‘á»c (ms)'}</span>
              <input class="sj-input" type="number" value="${escapeHtml(String(draft.read_retry_delay_ms || 150))}" oninput="adminDataSourceSetField('read_retry_delay_ms', Number(this.value || 0))">
            </label>
          </div>
          <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:12px;margin-top:14px">
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.use_postgres ? 'checked' : ''} onchange="adminDataSourceSetField('use_postgres', this.checked)">
              <span><strong>use_postgres</strong><br><small>${lang==='en'?'Enable PostgreSQL path':'Báº­t Ä‘Æ°á»ng Ä‘á»c/ghi PostgreSQL'}</small></span>
            </label>
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.shadow_write ? 'checked' : ''} onchange="adminDataSourceSetField('shadow_write', this.checked)">
              <span><strong>shadow_write</strong><br><small>${lang==='en'?'Write JSON + PostgreSQL in parallel':'Ghi song song JSON + PostgreSQL'}</small></span>
            </label>
            <label style="display:flex;gap:10px;align-items:flex-start;padding:12px 14px;border-radius:14px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
              <input type="checkbox" ${draft.json_fallback ? 'checked' : ''} onchange="adminDataSourceSetField('json_fallback', this.checked)">
              <span><strong>json_fallback</strong><br><small>${lang==='en'?'Fallback to JSON if PostgreSQL read fails':'Fallback vá» JSON náº¿u Ä‘á»c PostgreSQL lá»—i'}</small></span>
            </label>
          </div>
          <div style="margin-top:14px;padding:12px 14px;border-radius:14px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));color:var(--amber);line-height:1.6;font-size:13px">
            ${lang==='en'
              ? 'Frontend edits only non-secret parameters. Database passwords and external connector tokens remain in server environment variables.'
              : 'Frontend chá»‰ chá»‰nh cÃ¡c tham sá»‘ khÃ´ng chá»©a bÃ­ máº­t. Máº­t kháº©u database vÃ  token káº¿t ná»‘i ngoÃ i váº«n náº±m trong biáº¿n mÃ´i trÆ°á»ng cá»§a server.'}
          </div>
        </article>

        <article style="border:1px solid var(--border);border-radius:20px;background:var(--bg-surface,#fff);padding:18px;display:grid;gap:12px">
          <div>
            <div style="font-size:18px;font-weight:700;color:#102a43">${lang==='en'?'Integration diagnostics':'Cháº©n Ä‘oÃ¡n tÃ­ch há»£p'}</div>
            <p style="margin:8px 0 0;color:#52667a;line-height:1.6">${lang==='en'
              ? 'Use these cards to judge whether manual mode is still necessary or whether Epicor / CNC links are healthy enough to rely on.'
              : 'DÃ¹ng cÃ¡c tháº» nÃ y Ä‘á»ƒ Ä‘Ã¡nh giÃ¡ xem cÃ³ cÃ²n cáº§n cháº¿ Ä‘á»™ nháº­p tay hay khÃ´ng, hoáº·c Epicor / CNC Ä‘Ã£ Ä‘á»§ khá»e Ä‘á»ƒ dá»±a vÃ o káº¿t ná»‘i hay chÆ°a.'}</p>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">Epicor</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${epicorHealth.configured ? (lang==='en'?'Configured':'ÄÃ£ cáº¥u hÃ¬nh') : (lang==='en'?'Not configured':'ChÆ°a cáº¥u hÃ¬nh')}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${epicorHealth.dry_run ? (lang==='en'?'Dry-run is active while transport is incomplete.':'Äang á»Ÿ cháº¿ Ä‘á»™ dry-run khi transport chÆ°a cáº¥u hÃ¬nh Ä‘á»§.') : (lang==='en'?'Live transport is active.':'Transport thá»±c Ä‘ang hoáº¡t Ä‘á»™ng.')}</div>
            <div style="margin-top:8px;font-size:12px;color:#52667a">${lang==='en'?'Company':'Company'}: ${escapeHtml(String(epicorHealth.company || '-'))} Â· Plant: ${escapeHtml(String(epicorHealth.plant || '-'))}</div>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">${lang==='en'?'CNC connectors':'Káº¿t ná»‘i CNC'}</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${escapeHtml(String(connectorKpis.connectors_healthy || 0))}/${escapeHtml(String(connectorKpis.connectors_total || 0))} ${lang==='en'?'healthy':'á»•n Ä‘á»‹nh'}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${lang==='en'?'Manual bridges':'Manual bridge'}: ${escapeHtml(String(connectorKpis.manual_bridges || 0))} Â· ${lang==='en'?'Stale links':'Link stale'}: ${escapeHtml(String(connectorKpis.connectors_stale || 0))}</div>
          </div>

          <div style="padding:14px;border-radius:16px;background:var(--bg-surface-alt,#f8fafc);border:1px solid var(--border)">
            <div style="font-size:12px;color:#486581">${lang==='en'?'Shadow observability':'Quan sÃ¡t shadow'}</div>
            <div style="margin-top:6px;font-size:22px;font-weight:700;color:#102a43">${escapeHtml(String(shadowFailures))} ${lang==='en'?'failures':'lá»—i'}</div>
            <div style="margin-top:6px;font-size:13px;color:#52667a">${lang==='en'?'JSON fallback reads':'LÆ°á»£t fallback vá» JSON'}: ${escapeHtml(String(fallbackReads))}</div>
            <div style="margin-top:6px;font-size:12px;color:#52667a">${lang==='en'?'Last config update':'Láº§n lÆ°u cáº¥u hÃ¬nh gáº§n nháº¥t'}: ${escapeHtml(adminFormatRuntimeStamp((cfgRes.override_meta || {}).updated || ''))}</div>
          </div>
        </article>
      </section>

      <div class="admin-save-bar" id="admin-data-source-save-bar" style="${adminDataSourceState.dirty ? 'display:flex' : 'display:none'}">
        <span class="save-hint"><b>âš  ${lang==='en'?'Unsaved data source changes':'CÃ³ thay Ä‘á»•i nguá»“n dá»¯ liá»‡u chÆ°a lÆ°u'}</b></span>
        <button class="btn-admin secondary" onclick="adminDataSourceResetDraft()">${lang==='en'?'Reset draft':'KhÃ´i phá»¥c báº£n nhÃ¡p'}</button>
        <button class="btn-admin primary" onclick="saveAdminDataSourceConfig()">${adminDataSourceState.loading ? (lang==='en'?'Saving...':'Äang lÆ°u...') : (lang==='en'?'Save configuration':'LÆ°u cáº¥u hÃ¬nh')}</button>
      </div>
    </div>`;
}

function renderAdminUsers(){
  // Fallback: if no users from server, use demo data
  if(!USERS.length && typeof DEMO_USERS !== 'undefined') USERS = JSON.parse(JSON.stringify(DEMO_USERS));
  const el = document.getElementById('admin-content');
  const deptMap = {};
  DEPARTMENTS.forEach(d=>deptMap[d.code]=d);
  
  const viewToggle = `<div style="display:flex;border:1px solid var(--border);border-radius:6px;overflow:hidden;background:var(--bg-surface,#fff)">
    <button onclick="adminUserViewMode='cards';renderAdminUsers()" style="padding:5px 10px;font-size:11px;border:none;cursor:pointer;background:${adminUserViewMode==='cards'?'var(--brand-2)':'var(--bg-surface,#fff)'};color:${adminUserViewMode==='cards'?'var(--text-inverse,#fff)':'var(--text-secondary,#666)'};transition:all .15s" title="Card view">&#9638;</button>
    <button onclick="adminUserViewMode='list';renderAdminUsers()" style="padding:5px 10px;font-size:11px;border:none;border-left:1px solid var(--border);cursor:pointer;background:${adminUserViewMode==='list'?'var(--brand-2)':'var(--bg-surface,#fff)'};color:${adminUserViewMode==='list'?'var(--text-inverse,#fff)':'var(--text-secondary,#666)'};transition:all .15s" title="List view">â˜°</button>
  </div>`;

  let usersHtml = '';
  if(adminUserViewMode === 'list'){
    usersHtml = `<div style="overflow-x:auto"><table class="admin-table" id="user-list-table" style="width:100%;font-size:12px">
      <thead><tr style="background:var(--bg-surface-alt,#f8fafc)">
        <th style="padding:8px 10px;text-align:left;font-size:11px">#</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Status':'TT'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Name':'Há» tÃªn'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">Username</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Department':'PhÃ²ng ban'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Title':'Chá»©c danh'}</th>
        <th style="padding:8px 10px;text-align:left;font-size:11px">${lang==='en'?'Role':'Vai trÃ²'}</th>
        <th style="padding:8px 10px;text-align:center;font-size:11px">${lang==='en'?'Actions':'Thao tÃ¡c'}</th>
      </tr></thead>
      <tbody>
      ${USERS.map((u,idx) => {
        const r = ROLES[u.role];
        const dept = deptMap[u.dept];
        return `<tr class="user-list-row" data-name="${escapeHtml((u.name||'').toLowerCase())}" data-dept="${escapeHtml(u.dept||'')}" style="border-bottom:1px solid color-mix(in srgb, var(--border) 78%, transparent);${u.active===false?'opacity:.5;background:color-mix(in srgb, var(--red) 8%, var(--bg-surface,#fff))':''}">
          <td style="padding:6px 10px;color:var(--text-3)">${idx+1}</td>
          <td style="padding:6px 10px">${u.active!==false?'ðŸŸ¢':'ðŸ”´'}</td>
          <td style="padding:6px 10px;font-weight:600">${escapeHtml(u.name)}</td>
          <td style="padding:6px 10px;font-family:var(--mono);font-size:11px;color:var(--text-3)">@${escapeHtml(u.username)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${dept?dept.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${dept?dept.color:'var(--text-secondary,#666)'}">${u.dept}${dept?' '+(lang==='en'?dept.labelEn:dept.label):''}</span></td>
          <td style="padding:6px 10px;font-size:11px">${escapeHtml(u.title)}</td>
          <td style="padding:6px 10px"><span style="font-size:10px;padding:2px 6px;border-radius:4px;background:${r?r.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${r?r.color:'var(--text-secondary,#666)'}">${r?r.icon:''} ${r?r.label:u.role}</span></td>
          <td style="padding:6px 10px;text-align:center;white-space:nowrap">
            <button onclick="showUserModal('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">âœ</button>
            <button onclick="editUserPerms('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">ðŸ”</button>
            <button onclick="toggleUserActive('${u.id}')" class="btn-admin secondary sm" style="padding:3px 8px;font-size:10px">${u.active!==false?'â¸':'â–¶'}</button>
            <button onclick="deleteUserConfirm('${u.id}')" class="btn-admin danger sm" style="padding:3px 8px;font-size:10px">ðŸ—‘</button>
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
              <div class="uc-title">${escapeHtml(u.title)} Â· @${escapeHtml(u.username)}</div>
            </div>
            <span style="font-size:18px">${u.active!==false?'ðŸŸ¢':'ðŸ”´'}</span>
          </div>
          <div class="uc-meta">
            <span class="tag" style="background:${colorBg}15;color:${colorBg}">${r?r.icon:''} ${r?r.label:u.role}</span>
            <span class="tag" style="background:${dept?dept.color+'15':'var(--bg-surface-alt,#f1f3f5)'};color:${dept?dept.color:'var(--text-secondary,#666)'}">${u.dept} ${dept?(lang==='en'?dept.labelEn:dept.label):''}</span>
          </div>
          <div class="uc-actions">
            <button onclick="showUserModal('${u.id}')">âœ ${T('admin_edit')}</button>
            <button onclick="editUserPerms('${u.id}')">ðŸ” Quyá»n</button>
            <button class="danger" onclick="toggleUserActive('${u.id}')">${u.active!==false?'â¸ KhÃ³a':'â–¶ Má»Ÿ'}</button>
            <button class="danger" onclick="deleteUserConfirm('${u.id}')">ðŸ—‘</button>
          </div>
        </div>`;
      }).join('')}
    </div>`;
  }

  el.innerHTML = `
    <div class="admin-toolbar">
      <input type="text" placeholder="${lang==='en'?'Search users...':'TÃ¬m ngÆ°á»i dÃ¹ng...'}" oninput="filterAdminUserCards(this.value)" id="admin-user-search">
      <select id="admin-user-dept-filter" onchange="filterAdminUserCards(document.getElementById('admin-user-search').value)" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;min-width:140px;background:var(--bg-surface,#fff);color:var(--text-primary)">
        <option value="">${lang==='en'?'All departments':'Táº¥t cáº£ phÃ²ng ban'}</option>
        ${DEPARTMENTS.map(d=>`<option value="${d.code}">${d.code} â€” ${lang==='en'?d.labelEn:d.label}</option>`).join('')}
      </select>
      ${viewToggle}
      <button class="btn-admin primary" onclick="showUserModal()">+ ${T('admin_add_user')}</button>
      ${canExportUsersData() ? `
      <button class="btn-admin secondary" onclick="exportUsersExcel()" title="${lang==='en'?'Export to Excel':'Xuáº¥t Excel'}">ðŸ“¥ Excel</button>
      <label class="btn-admin secondary" style="cursor:pointer" title="${lang==='en'?'Import from Excel':'Nháº­p tá»« Excel'}">
        ðŸ“¤ ${lang==='en'?'Import':'Nháº­p'}
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// EXCEL EXPORT / IMPORT USERS
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function exportUsersExcel(){
  if(!canExportUsersData()){
    showToast('ðŸ”’ '+(lang==='en'?'No permission to export user data':'KhÃ´ng cÃ³ quyá»n xuáº¥t dá»¯ liá»‡u ngÆ°á»i dÃ¹ng'));
    return;
  }
  // Build CSV with BOM for Excel compatibility (Vietnamese)
  const headers = ['ID','Username','Password','Há» tÃªn / Name','CCCD / Citizen ID','Sá»‘ ÄT / Phone','Email cÃ¡ nhÃ¢n / Personal Email','PhÃ²ng ban / Dept','Chá»©c danh / Title','Vai trÃ² / Role','Role Key','Tráº¡ng thÃ¡i / Status','MFA'];
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
  showToast('âœ… '+(lang==='en'?'Exported '+USERS.length+' users':'ÄÃ£ xuáº¥t '+USERS.length+' ngÆ°á»i dÃ¹ng'));
}

function importUsersExcel(input){
  if(!canExportUsersData()){
    showToast('ðŸ”’ '+(lang==='en'?'No permission to import user data':'KhÃ´ng cÃ³ quyá»n nháº­p dá»¯ liá»‡u ngÆ°á»i dÃ¹ng'));
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
        showToast('âš  '+(lang==='en'?'File is empty or has no data rows':'File trá»‘ng hoáº·c khÃ´ng cÃ³ dá»¯ liá»‡u'));
        return;
      }
      
      // Parse header
      const headerLine = lines[0];
      const headers = parseCSVRow(headerLine);
      
      // Find column indices (flexible matching)
      const colMap = {};
      headers.forEach((h,i)=>{
        const hl = h.toLowerCase().trim();
        if(hl.includes('username') || hl === 'tÃ i khoáº£n') colMap.username = i;
        else if(hl.includes('password') || hl.includes('máº­t kháº©u')) colMap.password = i;
        else if(hl.includes('há» tÃªn') || hl.includes('name') || hl === 'full name') colMap.name = i;
        else if(hl.includes('cccd') || hl.includes('citizen') || hl.includes('cmnd') || hl.includes('cÄƒn cÆ°á»›c')) colMap.cccd = i;
        else if(hl.includes('sá»‘ Ä‘t') || hl.includes('phone') || hl.includes('Ä‘iá»‡n thoáº¡i') || hl.includes('sdt')) colMap.phone = i;
        else if(hl.includes('email cÃ¡ nhÃ¢n') || hl.includes('personal email') || hl.includes('personal_email')) colMap.personal_email = i;
        else if(hl.includes('phÃ²ng ban') || hl.includes('dept')) colMap.dept = i;
        else if(hl.includes('chá»©c danh') || hl.includes('title')) colMap.title = i;
        else if(hl.includes('role key') || hl === 'vai trÃ² key') colMap.role = i;
        else if((hl.includes('vai trÃ²') || hl.includes('role')) && !colMap.role) colMap.roleLabel = i;
        else if(hl.includes('email') && !colMap.personal_email) colMap.email = i;
        else if(hl.includes('tráº¡ng thÃ¡i') || hl.includes('status')) colMap.status = i;
      });
      
      if(!colMap.username && colMap.name === undefined){
        showToast('âš  '+(lang==='en'?'Cannot find Username or Name column':'KhÃ´ng tÃ¬m tháº¥y cá»™t Username hoáº·c Há» tÃªn'));
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
      
      showToast('âœ… '+(lang==='en'
        ?`Imported ${imported} users${skipped?' ('+skipped+' skipped)':''}`
        :`ÄÃ£ nháº­p ${imported} ngÆ°á»i dÃ¹ng${skipped?' ('+skipped+' bá» qua)':''}`));
      
      markUnsaved();
      renderAdmin();
    }catch(err){
      console.error('Import error:', err);
      showToast('âš  '+(lang==='en'?'Import failed: ':'Nháº­p tháº¥t báº¡i: ')+err.message);
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
        <div class="modal-title">${lang==='en'?'Remove user':'XÃ³a ngÆ°á»i dÃ¹ng'}: ${escapeHtml(u.name)}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">âœ•</button>
      </div>
      <div class="modal-body" style="padding:20px 24px;display:flex;flex-direction:column;gap:12px">
        <div style="font-size:12px;color:var(--text-2);margin-bottom:4px">@${escapeHtml(u.username)} Â· ${escapeHtml(u.dept)} Â· ${escapeHtml(u.title)}</div>
        <button onclick="doSoftDeleteUser('${u.id}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:10px;cursor:pointer;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='var(--amber)'" onmouseout="this.style.borderColor='color-mix(in srgb, var(--amber) 28%, var(--border))'">
          <span style="font-size:22px">â¸</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--amber)">${lang==='en'?'Deactivate (Soft delete)':'VÃ´ hiá»‡u hÃ³a (XÃ³a má»m)'}</div><div style="font-size:11px;color:color-mix(in srgb, var(--amber) 72%, var(--text-secondary));margin-top:2px">${lang==='en'?'User becomes inactive but data is preserved. Can be reactivated later.':'NgÆ°á»i dÃ¹ng bá»‹ khÃ³a nhÆ°ng dá»¯ liá»‡u Ä‘Æ°á»£c giá»¯ láº¡i. CÃ³ thá»ƒ kÃ­ch hoáº¡t láº¡i sau.'}</div></div>
        </button>
        <button onclick="doHardDeleteUser('${u.id}','${escapeHtml(u.username)}','${escapeHtml(u.name)}')" style="display:flex;align-items:center;gap:12px;padding:14px 18px;border:2px solid color-mix(in srgb, var(--red) 28%, var(--border));border-radius:10px;cursor:pointer;background:color-mix(in srgb, var(--red) 10%, var(--bg-surface,#fff));text-align:left;width:100%;font-family:var(--font);transition:all .15s" onmouseover="this.style.borderColor='var(--red)'" onmouseout="this.style.borderColor='color-mix(in srgb, var(--red) 28%, var(--border))'">
          <span style="font-size:22px">ðŸ—‘</span>
          <div><div style="font-size:13px;font-weight:700;color:var(--red)">${lang==='en'?'Delete permanently':'XÃ³a hoÃ n toÃ n'}</div><div style="font-size:11px;color:color-mix(in srgb, var(--red) 72%, var(--text-secondary));margin-top:2px">${lang==='en'?'Completely removes the user from the system. This action cannot be undone.':'XÃ³a hoÃ n toÃ n ngÆ°á»i dÃ¹ng khá»i há»‡ thá»‘ng. HÃ nh Ä‘á»™ng nÃ y khÃ´ng thá»ƒ hoÃ n tÃ¡c.'}</div></div>
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
      showToast(lang==='en'?'âœ… Deactivated':'âœ… ÄÃ£ vÃ´ hiá»‡u hÃ³a');
      await loadUsersFromServerIfAdmin();
      renderAdmin();
    } else {
      showToast('\u26A0 '+((res&&res.error)?res.error:'error'));
    }
  }catch(e){ showToast('\u26A0 Server error'); }
}

async function doHardDeleteUser(userId,username,name){
  if(!confirm((lang==='en'?'âš  PERMANENTLY DELETE ':'âš  XÃ“A VÄ¨NH VIá»„N ')+name+'?\n\n'+(lang==='en'?'This will completely remove the user from the database. This action CANNOT be undone!':'Äiá»u nÃ y sáº½ xÃ³a hoÃ n toÃ n ngÆ°á»i dÃ¹ng khá»i cÆ¡ sá»Ÿ dá»¯ liá»‡u. HÃ nh Ä‘á»™ng nÃ y KHÃ”NG THá»‚ hoÃ n tÃ¡c!'))) return;
  closeModal();
  try{
    const res = await apiCall('admin_user_delete', { username: username });
    if(res && res.ok){
      showToast(lang==='en'?'âœ… User permanently deleted':'âœ… ÄÃ£ xÃ³a hoÃ n toÃ n ngÆ°á»i dÃ¹ng');
      await loadUsersFromServerIfAdmin();
      renderAdmin();
    } else {
      const errMsg = res&&res.error==='cannot_delete_self' ? (lang==='en'?'Cannot delete yourself':'KhÃ´ng thá»ƒ xÃ³a chÃ­nh mÃ¬nh') : ((res&&res.error)?res.error:'error');
      showToast('\u26A0 '+errMsg);
    }
  }catch(e){ showToast('\u26A0 Server error'); }
}

function showUserModal(userId){
  const isEdit = !!userId;
  const u0 = isEdit ? USERS.find(x=>String(x.id)===String(userId)) : {id:'',name:'',username:'',dept:'',title:'',role:'employee',active:true,mfa_enabled:false,cccd:'',phone:'',personal_email:''};
  if(isEdit && !u0){
    showToast(lang==='en'?'âš  User not found':'âš  KhÃ´ng tÃ¬m tháº¥y ngÆ°á»i dÃ¹ng');
    return;
  }

  closeModal();

  // Reset modal state
  window.__um_state = { tempPassword: '' };

  const roleKeys = Object.keys(ROLES||{});
  const roleOptions = roleKeys.map(k=>`<option value="${k}" ${String(u0.role)===String(k)?'selected':''}>${escapeHtml((ROLES[k]?.icon||'')+' '+(ROLES[k]?.label||k))}</option>`).join('');
  
  const deptOptions = DEPARTMENTS.map(d=>`<option value="${d.code}" ${u0.dept===d.code?'selected':''}>${d.code} â€” ${lang==='en'?d.labelEn:d.label}</option>`).join('');
  
  const scopedTitles = titlesForDept(u0.dept)||[];
  const titleOptions = scopedTitles.map(t=>`<option value="${escapeHtml(t)}" ${u0.title===t?'selected':''}>${escapeHtml(t)}</option>`).join('');

  const modal=document.createElement('div');
  modal.id='user-modal';
  modal.className='modal-overlay';
  modal.innerHTML=`
    <div class="modal" style="max-width:760px">
      <div class="modal-header">
        <div class="modal-title">${lang==='en'?(isEdit?'Edit user':'Create user'):(isEdit?'Sá»­a ngÆ°á»i dÃ¹ng':'Táº¡o ngÆ°á»i dÃ¹ng')}</div>
        <button class="icon-btn" onclick="closeModal()" aria-label="Close">âœ•</button>
      </div>

      <div class="modal-body">
        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Full name':'Há» tÃªn'}</label>
            <input id="um-name" type="text" value="${escapeHtml(u0.name||'')}" placeholder="${lang==='en'?'Full name':'Há» tÃªn'}">
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Username':'TÃªn Ä‘Äƒng nháº­p'}</label>
            <input id="um-username" type="text" value="${escapeHtml(u0.username||'')}" ${isEdit?'':''}  placeholder="ten.ho">
            ${isEdit?'<div class="help-text" style="color:#d97706;font-size:10px">'+( lang==='en'?'âš  Changing username will create a new account':'âš  Äá»•i username sáº½ táº¡o tÃ i khoáº£n má»›i')+'</div>':''}
          </div>
        </div>

        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Department':'PhÃ²ng ban'} â–¾</label>
            <select id="um-dept" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
              <option value="">â€” ${lang==='en'?'Select department':'Chá»n phÃ²ng ban'} â€”</option>
              ${deptOptions}
            </select>
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Title':'Chá»©c danh'} â–¾</label>
            <select id="um-title" style="width:100%;padding:10px 14px;border:1.5px solid var(--border);border-radius:8px;font-size:14px">
              <option value="">â€” ${lang==='en'?'Select title':'Chá»n chá»©c danh'} â€”</option>
              ${titleOptions}
            </select>
            ${!TITLES.includes(u0.title||'') && u0.title ? '<div class="help-text" style="font-size:10px;color:#d97706">âš  "'+escapeHtml(u0.title)+'" '+( lang==='en'?'not in standard list â€” will be kept':'khÃ´ng cÃ³ trong danh sÃ¡ch â€” sáº½ Ä‘Æ°á»£c giá»¯ láº¡i')+'</div>':''}
          </div>
        </div>

        <div class="modal-grid-2">
          <div class="modal-field">
            <label>${lang==='en'?'Role':'Vai trÃ²'} â–¾</label>
            <select id="um-role">${roleOptions}</select>
          </div>

          <div class="modal-field">
            <label>${lang==='en'?'Status':'Tráº¡ng thÃ¡i'}</label>
            <select id="um-active">
              <option value="1" ${u0.active!==false?'selected':''}>${lang==='en'?'Active':'Hoáº¡t Ä‘á»™ng'}</option>
              <option value="0" ${u0.active===false?'selected':''}>${lang==='en'?'Inactive':'KhÃ³a'}</option>
            </select>
          </div>
        </div>

        <div style="border-top:1px solid var(--border-light,#e2e8f0);margin:14px 0;padding-top:14px">
          <div style="font-size:12px;font-weight:700;color:var(--text-2);margin-bottom:10px">ðŸ“‹ ${lang==='en'?'Personal Information':'ThÃ´ng tin cÃ¡ nhÃ¢n'}</div>
          <div class="modal-grid-2">
            <div class="modal-field">
              <label>${lang==='en'?'Citizen ID (CCCD)':'Sá»‘ CCCD / CMND'}</label>
              <input id="um-cccd" type="text" value="${escapeHtml(u0.cccd||'')}" placeholder="${lang==='en'?'e.g. 079123456789':'VD: 079123456789'}" maxlength="12">
            </div>
            <div class="modal-field">
              <label>${lang==='en'?'Phone number':'Sá»‘ Ä‘iá»‡n thoáº¡i'}</label>
              <input id="um-phone" type="tel" value="${escapeHtml(u0.phone||'')}" placeholder="${lang==='en'?'e.g. 0901234567':'VD: 0901234567'}">
            </div>
          </div>
          <div class="modal-field">
            <label>${lang==='en'?'Personal email':'Email cÃ¡ nhÃ¢n'}</label>
            <input id="um-personal-email" type="email" value="${escapeHtml(u0.personal_email||'')}" placeholder="name@gmail.com">
          </div>
        </div>

        <div class="modal-field">
          <label>${lang==='en'?'Password':'Máº­t kháº©u'}</label>
          <input id="um-password" type="text" autocomplete="new-password"
            placeholder="${lang==='en'?'Set a new password (leave blank to keep unchanged)':'Táº¡o máº­t kháº©u má»›i (Ä‘á»ƒ trá»‘ng náº¿u khÃ´ng Ä‘á»•i)'}">
          <div class="help-text">
            ${lang==='en'
              ?'Reset will generate a temporary password and clear 2FA enrollment.'
              :'Reset sáº½ táº¡o máº­t kháº©u táº¡m thá»i vÃ  xoÃ¡ Ä‘Äƒng kÃ½ 2FA.'}
          </div>

          <div id="um-tempwrap" style="display:none;margin-top:10px;padding:10px;border:1px solid var(--ln2);border-radius:12px;background:#f9fbff">
            <div style="font-weight:700;margin-bottom:6px">${lang==='en'?'Temporary password':'Máº­t kháº©u táº¡m thá»i'}</div>
            <div id="um-temppw" style="font-family:ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;"></div>
          </div>
        </div>

        <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
          ${isEdit ? `<button class="btn-admin" onclick="resetPasswordFromModal('${escapeHtml(u0.username||'')}')">${lang==='en'?'Reset password':'Reset password'}</button>` : ''}
          <button class="btn-admin" onclick="copyLoginInfoFromModal()">${lang==='en'?'Copy login info':'Copy thÃ´ng tin Ä‘Äƒng nháº­p'}</button>
          <button class="btn-admin" onclick="downloadLoginInfoFromModal()">${lang==='en'?'Download .txt':'Táº£i .txt'}</button>
        </div>
      </div>

      <div class="modal-actions">
        <button class="btn-admin" onclick="closeModal()">${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="saveUserFromModal(${isEdit?`'${escapeHtml(u0.id)}'`:"''"})">${lang==='en'?'Save':'LÆ°u'}</button>
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
    titleSel.innerHTML = '<option value="">-- Chá»n chá»©c danh --</option>' + list.map(t=>`<option value="${escapeHtml(t)}">${escapeHtml(t)}</option>`).join('');
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
      showToast(lang==='en'?'âš  Username is required':'âš  Username lÃ  báº¯t buá»™c');
      return;
    }
    if(!name){
      showToast(lang==='en'?'âš  Full name is required':'âš  Há» tÃªn lÃ  báº¯t buá»™c');
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
      showToast(lang==='en'?'âœ… Saved':'âœ… ÄÃ£ lÆ°u');
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

      showToast(lang==='en'?'âœ… Password reset':'âœ… ÄÃ£ reset password');
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
    : `ThÃ´ng tin Ä‘Äƒng nháº­p HESEM QMS\n\nLink: ${link}\nTÃ i khoáº£n: ${username}\nMáº­t kháº©u: ${password}\n`);
}

async function copyLoginInfoFromModal(){
  try{
    const username = String(document.getElementById('um-username')?.value||'').trim();
    const passwordInput = String(document.getElementById('um-password')?.value||'').trim();
    const temp = (window.__um_state && window.__um_state.tempPassword) ? window.__um_state.tempPassword : '';
    const password = passwordInput || temp;

    if(!username || !password){
      showToast(lang==='en'?'âš  Please set/reset a password first':'âš  HÃ£y Ä‘áº·t/reset password trÆ°á»›c');
      return;
    }

    const info = composeLoginInfo(username, password);
    await navigator.clipboard.writeText(info);
    showToast(lang==='en'?'âœ… Copied':'âœ… ÄÃ£ copy');
  }catch(e){
    console.error(e);
    showToast(lang==='en'?'âš  Cannot copy':'âš  KhÃ´ng copy Ä‘Æ°á»£c');
  }
}

function downloadLoginInfoFromModal(){
  const username = String(document.getElementById('um-username')?.value||'').trim();
  const passwordInput = String(document.getElementById('um-password')?.value||'').trim();
  const temp = (window.__um_state && window.__um_state.tempPassword) ? window.__um_state.tempPassword : '';
  const password = passwordInput || temp;

  if(!username || !password){
    showToast(lang==='en'?'âš  Please set/reset a password first':'âš  HÃ£y Ä‘áº·t/reset password trÆ°á»›c');
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
  if(!name||!username){alert(lang==='en'?'Name and username required':'Cáº§n nháº­p tÃªn vÃ  username');return;}
  if(existingId){
    const u=USERS.find(x=>String(x.id)===String(existingId));
    if(u){Object.assign(u,{name,username,pin,title,role,dept});}
  } else {
    const newId='U'+String(USERS.length+1).padStart(3,'0');
    USERS.push({id:newId,name,username,pin,role,dept,title,avatar:'ðŸ§‘',active:true});
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
      showToast(lang==='en'?'âœ… Updated':'âœ… ÄÃ£ cáº­p nháº­t');
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
    showToast(lang==='en'?'â„¹ï¸ Already inactive':'â„¹ï¸ ÄÃ£ bá»‹ khÃ³a');
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
      showToast(lang==='en'?'âœ… Locked':'âœ… ÄÃ£ khÃ³a');
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
    <h3>ðŸ” ${lang==='en'?'Permissions for':'PhÃ¢n quyá»n cho'}: ${u.name}</h3>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px">
      ${lang==='en'?'Role':'Vai trÃ²'}: <b>${ROLES[u.role]?ROLES[u.role].label:u.role}</b> |
      ${lang==='en'?'Base access':'Quyá»n máº·c Ä‘á»‹nh'}: <b>${roleDocs==='ALL'?DOCS.length:DOCS.filter(d=>docMatchesRole(d.code,u.role)).length}</b>/${DOCS.length} |
      ${lang==='en'?'Check/uncheck to override role defaults':'ÄÃ¡nh dáº¥u/bá» Ä‘Ã¡nh dáº¥u Ä‘á»ƒ ghi Ä‘Ã¨ quyá»n máº·c Ä‘á»‹nh'}
    </div>
    <div style="max-height:55vh;overflow-y:auto;border:1px solid var(--border);border-radius:6px;padding:8px 12px;background:var(--bg-surface,#fff)">
      ${catHtml}
    </div>
    <div class="modal-actions">
      <button class="btn-admin danger" onclick="resetUserPerms('${u.id}')">â†© Reset</button>
      <button class="btn-admin secondary" onclick="closeModal()">âœ• ${T('admin_cancel')}</button>
      <button class="btn-admin primary" onclick="closeModal();renderAdmin()">âœ“ OK</button>
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
                ? '<span style="color:#16a34a;font-weight:700;width:16px;display:inline-block">âœ“</span>'
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
              ? '<span style="color:#16a34a;font-weight:700;width:16px;display:inline-block">âœ“</span>'
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
        <div style="padding:8px 12px;font-size:10px;font-weight:700;color:var(--text-3);border-bottom:1px solid var(--border)">${lang==='en'?'SELECT ROLE':'CHá»ŒN VAI TRÃ’'}</div>
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
            ?'<span style="color:#16a34a;font-weight:700">âœ… FULL ACCESS â€” '+(lang==='en'?'All':'Táº¥t cáº£')+' '+DOCS.length+' '+(lang==='en'?'documents':'tÃ i liá»‡u')+'</span>'
            :'<span>'+(lang==='en'?'Access':'Quyá»n')+': <b>'+DOCS.filter(d=>docMatchesRole(d.code,adminEditRole)).length+'</b>/'+DOCS.length+' '+(lang==='en'?'documents â€” check/uncheck to modify':'tÃ i liá»‡u â€” Ä‘Ã¡nh dáº¥u Ä‘á»ƒ thay Ä‘á»•i')+'</span>'}
        </div>
        ${catHtml}
      </div>
    </div>
    <div class="admin-save-bar" id="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>âš  '+(lang==='en'?'Unsaved changes':'CÃ³ thay Ä‘á»•i chÆ°a lÆ°u')+'</b>':lang==='en'?'Edit permissions then click Save':'Chá»‰nh phÃ¢n quyá»n rá»“i nháº¥n LÆ°u'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.removeItem('hesem_role_docs');location.reload()">â†© Reset</button>
      <button class="btn-admin primary" onclick="adminSaveAll()" style="padding:8px 24px;font-size:13px">ðŸ’¾ ${lang==='en'?'SAVE':'LÆ¯U'}</button>
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// DOM HELPER: el(tag, attrs, children) â€” lightweight DOM builder
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN TAB: DEPARTMENTS & TITLES
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderAdminDeptTitle(){
  adminPanel.innerHTML='';
  const totalTitles = Object.values(DEPT_TITLES||{}).reduce((n,list)=>n+(Array.isArray(list)?list.length:0),0);
  const card=el('div',{class:'card'},[]);
  const header=el('div',{style:'display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;'},[
    el('div',{},[
      el('div',{style:'font-weight:800;font-size:16px;line-height:1.2;'},'PhÃ²ng ban â†’ Chá»©c danh (JD Tree)'),
      el('div',{class:'muted',style:'margin-top:4px;'},'Má»™t cá»­a sá»• duy nháº¥t mÃ´ phá»ng Ä‘Ãºng cáº¥u trÃºc thÆ° má»¥c JD. Chá»©c danh náº±m bÃªn trong phÃ²ng ban; khi sá»­a ngÆ°á»i dÃ¹ng, danh sÃ¡ch chá»©c danh sáº½ tá»± lá»c theo phÃ²ng ban vÃ  Ã´ Vai trÃ² sáº½ tá»± nháº­n theo chá»©c danh.')
    ]),
    el('div',{style:'display:flex;gap:8px;flex-wrap:wrap;align-items:center;'},[
      el('div',{class:'muted',style:'font-size:12px;'},`${DEPARTMENTS.length} phÃ²ng ban â€¢ ${totalTitles} chá»©c danh`),
      el('button',{class:'btn',onclick:()=>{
        if(!confirm('Reset PhÃ²ng ban & Chá»©c danh theo SSOT (máº·c Ä‘á»‹nh)?'))return;
        DEPARTMENTS=JSON.parse(JSON.stringify(DEFAULT_DEPARTMENTS));
        DEPT_TITLES=JSON.parse(JSON.stringify(DEFAULT_DEPT_TITLES));
        syncTitlesFromDept();
        saveDepartments();saveDeptTitles();saveTitles();
        renderAdminDeptTitle();
      }},'Reset theo JD SSOT'),
      el('button',{class:'btn',onclick:()=>{
        const code=(prompt('MÃ£ phÃ²ng ban (VD: ENG, PRO, QA, ...):','')||'').trim().toUpperCase();
        if(!code)return;
        if(DEPARTMENTS.some(d=>d.code===code)){alert('MÃ£ phÃ²ng ban Ä‘Ã£ tá»“n táº¡i.');return;}
        const label=(prompt('TÃªn phÃ²ng ban (VN):','')||'').trim();
        if(!label)return;
        const labelEn=(prompt('TÃªn phÃ²ng ban (EN):','')||'').trim()||label;
        DEPARTMENTS.push({code,label,labelEn,color:'#94a3b8'});
        DEPT_TITLES[code]=DEPT_TITLES[code]||[];
        syncTitlesFromDept();saveDepartments();saveDeptTitles();saveTitles();
        renderAdminDeptTitle();
      }},'ThÃªm phÃ²ng ban')
    ])
  ]);

  const body=el('div',{style:'margin-top:12px;border:1px solid var(--border,var(--ln));border-radius:14px;background:var(--bg-surface,#fff);overflow:hidden;'},[]);
  const tree=el('div',{style:'padding:10px;display:flex;flex-direction:column;gap:8px;background:var(--bg-surface-alt,#f8fafc);'},[]);

  DEPARTMENTS.forEach(d=>{
    const titles=titlesForDept(d.code)||[];
    const usersInDept = USERS.filter(u=>u.dept===d.code).length;
    const folder=el('details',{open:true,class:'fm-folder',style:`border:1px solid color-mix(in srgb, ${d.color} 24%, var(--border));background:var(--bg-surface,#fff);border-radius:12px;overflow:hidden;`},[]);
    const summary=el('summary',{style:'list-style:none;cursor:pointer;padding:10px 12px;display:flex;align-items:center;justify-content:space-between;gap:12px;background:linear-gradient(180deg,var(--bg-surface,#fff),var(--bg-surface-alt,#f8fafc));'},[
      el('div',{style:'display:flex;align-items:center;gap:10px;'},[
        el('div',{class:'fm-icon',style:`width:36px;height:36px;border-radius:10px;background:${d.color}18;border:1px solid color-mix(in srgb, ${d.color} 28%, var(--border));display:flex;align-items:center;justify-content:center;font-size:18px;color:${d.color};`},'ðŸ“'),
        el('div',{},[
          el('div',{style:'font-weight:800;'},`${d.code} â€” ${d.label}`),
          el('div',{class:'muted',style:'margin-top:2px;font-size:11px;'},`${titles.length} chá»©c danh â€¢ ${usersInDept} ngÆ°á»i dÃ¹ng`)
        ])
      ]),
      el('div',{style:'display:flex;gap:6px;flex-wrap:wrap;align-items:center;'},[
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          const t=(prompt(`ThÃªm chá»©c danh cho ${d.code}:`,'')||'').trim();
          if(!t)return;
          DEPT_TITLES[d.code]=DEPT_TITLES[d.code]||[];
          if(DEPT_TITLES[d.code].includes(t)){alert('Chá»©c danh Ä‘Ã£ tá»“n táº¡i trong phÃ²ng ban nÃ y.');return;}
          DEPT_TITLES[d.code].push(t);
          syncTitlesFromDept();saveDeptTitles();saveTitles();
          renderAdminDeptTitle();
        }},'ThÃªm chá»©c danh'),
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          const nl=(prompt(`Äá»•i tÃªn phÃ²ng ban ${d.code}:`,d.label)||'').trim();
          if(!nl)return;
          d.label=nl; saveDepartments(); renderAdminDeptTitle();
        }},'Sá»­a'),
        el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
          if(!confirm(`XÃ³a phÃ²ng ban ${d.code}? (NgÆ°á»i dÃ¹ng thuá»™c phÃ²ng ban nÃ y sáº½ bá»‹ xÃ³a mapping phÃ²ng ban/chá»©c danh)`))return;
          DEPARTMENTS=DEPARTMENTS.filter(x=>x.code!==d.code);
          delete DEPT_TITLES[d.code];
          USERS.forEach(u=>{if(u.dept===d.code){u.dept='';u.title='';}});
          syncTitlesFromDept();saveDepartments();saveDeptTitles();saveTitles();
          renderAdminDeptTitle(); renderAdminUsers();
        }},'XÃ³a')
      ])
    ]);
    folder.appendChild(summary);

    const list=el('div',{style:'padding:8px 10px 10px;display:flex;flex-direction:column;gap:6px;background:var(--bg-surface,#fff);'},[]);
    if(!titles.length){
      list.appendChild(el('div',{class:'muted',style:'padding:8px 10px;'},'ChÆ°a cÃ³ chá»©c danh trong phÃ²ng ban nÃ y.'));
    }else{
      titles.forEach(t=>{
        const count = USERS.filter(u=>u.dept===d.code && u.title===t).length;
        const row=el('div',{class:'fm-file-row',style:'display:flex;align-items:center;justify-content:space-between;gap:10px;padding:8px 10px;border:1px solid var(--border,var(--ln));border-radius:10px;background:var(--bg-surface-alt,#f8fafc);'},[
          el('div',{style:'display:flex;align-items:center;gap:10px;min-width:0;'},[
            el('div',{class:'fm-file-icon',style:'width:30px;height:34px;display:flex;align-items:center;justify-content:center;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--brand-2) 24%, var(--border));border-radius:8px;font-size:15px;'},'ðŸ“„'),
            el('div',{style:'min-width:0;'},[
              el('div',{style:'font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;'},t),
              el('div',{class:'muted',style:'font-size:11px;margin-top:1px;'},`${d.code}/${t}`)
            ])
          ]),
          el('div',{style:'display:flex;align-items:center;gap:6px;flex-wrap:wrap;'},[
            el('span',{style:'font-size:10px;padding:2px 8px;border-radius:999px;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));color:var(--brand-2);border:1px solid color-mix(in srgb, var(--brand-2) 24%, var(--border));'},`${count} user`+(count===1?'':'s')),
            el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
              const nt=(prompt('Äá»•i tÃªn chá»©c danh:',t)||'').trim();
              if(!nt||nt===t)return;
              DEPT_TITLES[d.code]=DEPT_TITLES[d.code].map(x=>x===t?nt:x);
              USERS.forEach(u=>{if(u.dept===d.code && u.title===t)u.title=nt;});
              syncTitlesFromDept();saveDeptTitles();saveTitles(); renderAdminDeptTitle(); renderAdminUsers();
            }},'Sá»­a'),
            el('button',{class:'btn',onclick:(e)=>{e.preventDefault();e.stopPropagation();
              if(!confirm(`XÃ³a chá»©c danh "${t}" khá»i ${d.code}?`))return;
              DEPT_TITLES[d.code]=DEPT_TITLES[d.code].filter(x=>x!==t);
              USERS.forEach(u=>{if(u.dept===d.code && u.title===t)u.title='';});
              syncTitlesFromDept();saveDeptTitles();saveTitles(); renderAdminDeptTitle(); renderAdminUsers();
            }},'XÃ³a')
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
  if(!code||!label){showToast('âš  Nháº­p mÃ£ vÃ  tÃªn phÃ²ng ban');return;}
  if(DEPARTMENTS.find(d=>d.code===code)){showToast('âš  MÃ£ Ä‘Ã£ tá»“n táº¡i');return;}
  DEPARTMENTS.push({code, label, labelEn:label, color});
  saveDepartments();
  showToast('âœ… ÄÃ£ thÃªm phÃ²ng ban '+code);
  renderAdminDeptTitle();
}

function editDept(idx){
  const d = DEPARTMENTS[idx];
  if(!d) return;
  const newLabel = prompt((lang==='en'?'Edit name for ':'Sá»­a tÃªn cho ')+d.code+':', lang==='en'?d.labelEn:d.label);
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
    showToast('âš  '+d.code+' '+(lang==='en'?'has':'cÃ³')+' '+usersInDept+' '+(lang==='en'?'users â€” reassign first':'ngÆ°á»i dÃ¹ng â€” hÃ£y chuyá»ƒn trÆ°á»›c'));
    return;
  }
  if(!confirm((lang==='en'?'Delete department ':'XÃ³a phÃ²ng ban ')+d.code+'?')) return;
  DEPARTMENTS.splice(idx,1);
  saveDepartments();
  showToast('âœ… ÄÃ£ xÃ³a');
  renderAdminDeptTitle();
}

function addTitle(){
  const name = (document.getElementById('new-title-name').value||'').trim();
  if(!name){showToast('âš  Nháº­p chá»©c danh');return;}
  if(TITLES.includes(name)){showToast('âš  ÄÃ£ tá»“n táº¡i');return;}
  TITLES.push(name);
  saveTitles();
  showToast('âœ… ÄÃ£ thÃªm: '+name);
  renderAdminDeptTitle();
}

function editTitle(idx){
  const old = TITLES[idx];
  const newName = prompt((lang==='en'?'Edit title':'Sá»­a chá»©c danh')+':', old);
  if(newName !== null && newName.trim() && newName.trim() !== old){
    TITLES[idx] = newName.trim();
    saveTitles();
    renderAdminDeptTitle();
  }
}

function deleteTitle(idx){
  const t = TITLES[idx];
  if(!confirm((lang==='en'?'Delete title: ':'XÃ³a chá»©c danh: ')+t+'?')) return;
  TITLES.splice(idx,1);
  saveTitles();
  renderAdminDeptTitle();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN TAB: ORG CHART
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
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
    const levelLabel = lv==='0' ? 'Ban GiÃ¡m Äá»‘c' : lv==='1' ? 'Quáº£n lÃ½ cáº¥p cao' : lv==='2' ? 'TrÆ°á»Ÿng phÃ²ng' : lv==='3' ? 'ChuyÃªn viÃªn / NhÃ¢n viÃªn' : lv==='4' ? 'NhÃ¢n viÃªn' : 'Thá»±c táº­p';
    
    chartHtml += `<div style="margin-bottom:8px">
      <div style="font-size:10px;font-weight:700;color:var(--text-3);letter-spacing:1px;margin-bottom:8px;text-transform:uppercase">Level ${lv} â€” ${levelLabel}</div>
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
          <div style="font-size:16px">${r?r.icon:'ðŸ‘¤'}</div>
          <div class="on-name">${escapeHtml(u.name)}</div>
          <div class="on-title">${escapeHtml(u.title)}</div>
          <div class="on-dept" style="background:${borderColor}15;color:${borderColor}">${escapeHtml(u.dept)}</div>
        </div>`;
      });
    });
    
    chartHtml += '</div>';
    
    // Connector line between levels
    if(li < levels.length - 1){
      chartHtml += '<div style="width:2px;height:20px;background:var(--border);margin:0 auto"></div>';
    }
    
    chartHtml += '</div>';
  });
  
  chartHtml += '</div></div>';
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px">
      <h3 style="font-size:14px;font-weight:700;margin:0">ðŸ— ${lang==='en'?'Organization Chart':'SÆ¡ Ä‘á»“ Tá»• chá»©c CÃ´ng ty'}</h3>
      <div style="display:flex;gap:8px">
        <button class="btn-admin secondary" onclick="exportOrgChartSVG()">ðŸ“¥ ${lang==='en'?'Export SVG':'Xuáº¥t SVG'}</button>
        <button class="btn-admin secondary" onclick="window.print()">ðŸ–¨ ${lang==='en'?'Print':'In'}</button>
      </div>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:16px">
      ${lang==='en'
        ?'Auto-generated from user database. Grouped by role level and department.'
        :'Tá»± Ä‘á»™ng táº¡o tá»« cÆ¡ sá»Ÿ dá»¯ liá»‡u ngÆ°á»i dÃ¹ng. NhÃ³m theo cáº¥p vai trÃ² vÃ  phÃ²ng ban.'}
    </div>
    <div style="border:1px solid var(--border);border-radius:10px;overflow:auto;background:var(--bg-surface-alt,#fafbfc);max-height:600px">
      ${chartHtml}
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      ${DEPARTMENTS.map(d=>`<span style="display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:3px 8px;border-radius:6px;background:${d.color}10;color:${d.color};border:1px solid ${d.color}30">
        <span style="width:8px;height:8px;border-radius:50%;background:${d.color}"></span>
        ${d.code} â€” ${lang==='en'?d.labelEn:d.label}
      </span>`).join('')}
    </div>`;
}

function exportOrgChartSVG(){
  showToast(lang==='en'?'ðŸ’¡ Use Print (Ctrl+P) to save as PDF':'ðŸ’¡ DÃ¹ng In (Ctrl+P) Ä‘á»ƒ lÆ°u PDF');
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN TAB: ACTIVITY LOG (User Behavior)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderAdminActivity(){
  const el = document.getElementById('admin-content');
  
  // Permission check
  if(!canViewActivityLog()){
    el.innerHTML = '<div style="text-align:center;padding:60px;color:var(--text-3)">â›” '+(lang==='en'?'You do not have permission to view this tab. Contact the General Manager (EXE-01).':'Báº¡n khÃ´ng cÃ³ quyá»n xem tab nÃ y. LiÃªn há»‡ General Manager (EXE-01).')+'</div>';
    return;
  }
  
  // Sort by most recent first
  const logs = [...ACTIVITY_LOG].reverse();
  
  const uniqueUsers = [...new Set(logs.map(l=>l.user))];
  
  el.innerHTML = `
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;flex-wrap:wrap;gap:8px">
      <h3 style="font-size:14px;font-weight:700;margin:0">ðŸ“Š ${lang==='en'?'User Activity Monitor':'Kiá»ƒm soÃ¡t HÃ nh vi NgÆ°á»i dÃ¹ng'}</h3>
      <div style="display:flex;gap:8px;align-items:center">
        <button class="btn-admin secondary" onclick="document.getElementById('ds-panel').style.display=document.getElementById('ds-panel').style.display==='none'?'':'none'">âš™ï¸ ${lang==='en'?'Settings':'CÃ i Ä‘áº·t'}</button>
      <div style="display:flex;gap:8px;align-items:center">
        <select id="activity-user-filter" onchange="filterActivityLog()" style="padding:5px 10px;border:1px solid var(--border);border-radius:6px;font-size:11px;background:var(--bg-surface,#fff);color:var(--text-primary)">
          <option value="">${lang==='en'?'All users':'Táº¥t cáº£'}</option>
          ${uniqueUsers.map(u=>`<option value="${escapeHtml(u)}">${escapeHtml(u)}</option>`).join('')}
        </select>
        <button class="btn-admin secondary" onclick="exportActivityCSV()">ðŸ“¥ CSV</button>
        <button class="btn-admin danger" onclick="clearActivityLog()">ðŸ—‘ ${lang==='en'?'Clear':'XÃ³a log'}</button>
      </div>
    </div>
    <div id="ds-panel" style="display:none;margin-bottom:16px;border:1px solid var(--border);border-radius:10px;overflow:hidden;background:var(--bg-surface,#fff)">
      <div style="padding:12px 16px;font-weight:700;font-size:13px;background:var(--bg-surface-alt,#f8fafc);border-bottom:1px solid var(--border)">âš™ï¸ ${lang==='en'?'Data Collection Settings':'CÃ i Ä‘áº·t Thu tháº­p Dá»¯ liá»‡u'}</div>
      ${(function(){
        const items=[
          {k:'collect_gps',i:'ðŸ“',v:'Tá»a Ä‘á»™ GPS',e:'GPS',dv:'Náº¿u táº¯t, ngÆ°á»i dÃ¹ng khÃ´ng cáº§n cho phÃ©p vá»‹ trÃ­ khi Ä‘Äƒng nháº­p.',de:'If OFF, users skip location permission on login.'},
          {k:'collect_ip',i:'ðŸŒ',v:'Äá»‹a chá»‰ IP',e:'IP Address',dv:'Ghi nháº­n IP cÃ´ng khai.',de:'Record public IP.'},
          {k:'collect_device',i:'ðŸ“±',v:'Thiáº¿t bá»‹',e:'Device',dv:'User-Agent, OS, trÃ¬nh duyá»‡t, mÃ n hÃ¬nh.',de:'User-Agent, OS, browser, screen.'},
          {k:'collect_navigation',i:'ðŸ“„',v:'Lá»‹ch sá»­ trang',e:'Navigation',dv:'Ghi láº¡i trang truy cáº­p, thá»i Ä‘iá»ƒm, thá»i lÆ°á»£ng.',de:'Track page views with timestamps.'},
          {k:'collect_connection',i:'ðŸ“¶',v:'Káº¿t ná»‘i',e:'Network',dv:'Loáº¡i káº¿t ná»‘i, mÃºi giá».',de:'Connection type, timezone.'},
          {k:'require_consent',i:'ðŸ“‹',v:'YÃªu cáº§u Ä‘á»“ng Ã½',e:'Consent',dv:'Náº¿u táº¯t, Ä‘Äƒng nháº­p khÃ´ng cáº§n Ä‘á»“ng Ã½ Ä‘iá»u khoáº£n.',de:'If OFF, login skips consent dialog.'},
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
        <button class="btn-admin secondary" onclick="cancelDataSettingsDraft()" style="padding:6px 16px;font-size:12px">â†© ${lang==='en'?'Cancel':'Há»§y'}</button>
        <button class="btn-admin primary" onclick="saveDataSettingsDraft()" style="padding:6px 16px;font-size:12px">ðŸ’¾ ${lang==='en'?'Save':'LÆ°u'}</button>
      </div>
      <div style="padding:10px 14px;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));font-size:11px;color:var(--brand-2)">ðŸ’¡ ${lang==='en'?'Toggle options then click Save. Changes take effect on next login.':'Báº­t/táº¯t tÃ¹y chá»n rá»“i nháº¥n LÆ°u. Thay Ä‘á»•i cÃ³ hiá»‡u lá»±c tá»« láº§n Ä‘Äƒng nháº­p káº¿.'}</div>
    </div>
    <div style="font-size:11px;color:var(--text-3);margin-bottom:12px;padding:10px;background:color-mix(in srgb, var(--amber) 10%, var(--bg-surface,#fff));border:1px solid color-mix(in srgb, var(--amber) 28%, var(--border));border-radius:8px">
      ðŸ›¡ <b>${lang==='en'?'Security Audit Log':'Nháº­t kÃ½ Kiá»ƒm toÃ¡n Báº£o máº­t'}:</b> 
      ${lang==='en'
        ?'Records session data: login time, IP, GPS coordinates, device fingerprint, detailed page-by-page navigation with exact timestamps and viewing duration.'
        :'Ghi nháº­n dá»¯ liá»‡u phiÃªn: thá»i gian Ä‘Äƒng nháº­p, IP, tá»a Ä‘á»™ GPS, vÃ¢n tay thiáº¿t bá»‹, Ä‘iá»u hÆ°á»›ng chi tiáº¿t tá»«ng trang vá»›i thá»i Ä‘iá»ƒm chÃ­nh xÃ¡c vÃ  thá»i lÆ°á»£ng xem.'}
    </div>
    <div id="activity-sessions-list" style="max-height:550px;overflow-y:auto">
      ${logs.length === 0 
        ? '<div style="text-align:center;padding:40px;color:var(--text-3)">'+( lang==='en'?'No activity recorded yet':'ChÆ°a cÃ³ hoáº¡t Ä‘á»™ng nÃ o Ä‘Æ°á»£c ghi')+'</div>'
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
                <span style="font-size:9px;padding:1px 6px;border-radius:6px;background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff));color:var(--brand-2)">${escapeHtml(s.role||'')}</span>
                <span style="font-size:10px;color:var(--text-2)">ðŸ• ${dateStr}</span>
              </div>
              <button class="btn-admin secondary sm" onclick="this.parentElement.parentElement.querySelector('.al-detail').style.display=this.parentElement.parentElement.querySelector('.al-detail').style.display==='none'?'':'none';this.textContent=this.textContent.includes('â–¾')?'â–´ Thu gá»n':'â–¾ Chi tiáº¿t'">
                â–¾ ${lang==='en'?'Detail':'Chi tiáº¿t'}
              </button>
            </div>
            <!-- Summary row -->
            <div style="display:flex;gap:10px;flex-wrap:wrap;font-size:10px;color:var(--text-3);margin:6px 0;padding:8px;background:var(--bg-surface-alt,#f8fafc);border-radius:6px">
              <span>ðŸŒ <b>IP:</b> ${escapeHtml(s.ip||'â€”')}</span>
              <span>ðŸ“ <b>GPS:</b> ${escapeHtml(s.location||'â€”')} ${s.location_accuracy&&s.location_accuracy!=='â€”'?'(Â±'+escapeHtml(s.location_accuracy)+')':''}</span>
              <span>ðŸ“± <b>${lang==='en'?'Device':'Thiáº¿t bá»‹'}:</b> ${escapeHtml(s.device_short||s.platform||'â€”')}</span>
              <span>ðŸ–¥ <b>${lang==='en'?'Screen':'MÃ n hÃ¬nh'}:</b> ${escapeHtml(s.screen||'â€”')}</span>
              <span>ðŸ”² <b>Viewport:</b> ${escapeHtml(s.viewport||'â€”')}</span>
              <span>ðŸŒ <b>TZ:</b> ${escapeHtml(s.timezone||'â€”')}</span>
              <span>ðŸ“¶ <b>Net:</b> ${escapeHtml(s.connection_type||'â€”')}</span>
              <span>ðŸ“„ <b>${totalPages}</b> ${lang==='en'?'pages':'trang'} Â· <b>${formatDuration(totalTime)}</b></span>
            </div>
            <!-- Detailed page-by-page log (hidden by default) -->
            <div class="al-detail" style="display:none">
              <div style="font-size:10px;font-weight:700;margin:8px 0 6px;color:var(--text-2);border-bottom:1px solid var(--border);padding-bottom:4px">
                ðŸ“‹ ${lang==='en'?'Page-by-page navigation log':'Nháº­t kÃ½ Ä‘iá»u hÆ°á»›ng tá»«ng trang'} (${totalPages} ${lang==='en'?'entries':'má»¥c'})
              </div>
              <table style="width:100%;border-collapse:collapse;font-size:10px">
                <thead><tr style="background:color-mix(in srgb, var(--brand-2) 10%, var(--bg-surface,#fff))">
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">#</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Page / Document':'Trang / TÃ i liá»‡u'}</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Started viewing':'Báº¯t Ä‘áº§u xem'}</th>
                  <th style="text-align:left;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Left at':'Rá»i lÃºc'}</th>
                  <th style="text-align:right;padding:4px 8px;font-weight:600;color:var(--text-2)">${lang==='en'?'Duration':'Thá»i lÆ°á»£ng'}</th>
                </tr></thead>
                <tbody>
                ${(s.pages||[]).map((p,pi)=>{
                  const entered = new Date(p.entered_at);
                  const enteredStr = entered.toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
                  const leftStr = p.left_at ? new Date(p.left_at).toLocaleTimeString('vi-VN',{hour:'2-digit',minute:'2-digit',second:'2-digit'}) : 'â€”';
                  const isDoc = (p.page_id||p.page||'').startsWith('doc/');
                  const durColor = (p.duration_sec||0) > 300 ? '#dc2626' : (p.duration_sec||0) > 60 ? '#d97706' : '#16a34a';
                  return `<tr style="border-bottom:1px solid color-mix(in srgb, var(--border) 78%, transparent)">
                    <td style="padding:3px 8px;color:var(--text-3)">${pi+1}</td>
                    <td style="padding:3px 8px">
                      ${isDoc?'ðŸ“„':'ðŸ“'} <b>${escapeHtml(p.page_title||p.page_id||p.page||'â€”')}</b>
                      <span style="font-family:var(--mono);font-size:9px;color:var(--text-3);margin-left:4px">${escapeHtml(p.page_id||p.page||'')}</span>
                    </td>
                    <td style="padding:3px 8px;font-family:var(--mono)">${enteredStr}</td>
                    <td style="padding:3px 8px;font-family:var(--mono)">${leftStr}</td>
                    <td style="padding:3px 8px;text-align:right;font-weight:600;color:${durColor}">${formatDuration(p.duration_sec||0)}</td>
                  </tr>`;
                }).join('')}
                </tbody>
              </table>
              <div style="margin-top:8px;font-size:9px;color:var(--text-3);padding:6px 8px;background:var(--bg-surface-alt,#f8fafc);border-radius:4px">
                <b>Full User-Agent:</b> ${escapeHtml(s.device||'â€”')}<br>
                <b>Language:</b> ${escapeHtml(s.language||'â€”')} Â· <b>Cookies:</b> ${s.cookies_enabled?'Yes':'No'} Â· <b>Online:</b> ${s.online?'Yes':'No'}
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
  showToast('âœ… '+(lang==='en'?'Exported':'ÄÃ£ xuáº¥t'));
}

function clearActivityLog(){
  if(!confirm(lang==='en'?'Clear all activity log?':'XÃ³a toÃ n bá»™ log hoáº¡t Ä‘á»™ng?')) return;
  ACTIVITY_LOG.length = 0;
  saveActivityLog();
  showToast('âœ… '+(lang==='en'?'Cleared':'ÄÃ£ xÃ³a'));
  renderAdminActivity();
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
// ADMIN TAB: ROLES (original, kept)
// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
function renderAdminRoles(){
  const el=document.getElementById('admin-content');
  const roleOpts=Object.entries(ROLES).map(([k,v])=>'<option value="'+k+'">'+v.icon+' '+v.label+'</option>').join('');
  el.innerHTML=`
    <div style="overflow-x:auto">
      <table class="admin-table">
        <thead><tr>
          <th></th><th>${lang==='en'?'Role':'Vai trÃ²'}</th><th>Level</th>
          <th>${lang==='en'?'Edit':'Sá»­a'}</th>
          <th>${lang==='en'?'Create':'Táº¡o má»›i'}</th>
          <th>${lang==='en'?'Approve':'Duyá»‡t'}</th><th>Admin</th>
          <th title="${lang==='en'?'Can view Activity Log tab':'Xem Ä‘Æ°á»£c tab Kiá»ƒm soÃ¡t hÃ nh vi'}">ðŸ‘ ${lang==='en'?'Activity':'HÃ nh vi'}</th>
          <th title="${lang==='en'?'Can export/import user Excel':'Xuáº¥t/nháº­p Excel ngÆ°á»i dÃ¹ng'}">ðŸ“¥ Excel</th>
          <th>${lang==='en'?'Documents':'TÃ i liá»‡u'}</th>
          <th>${lang==='en'?'Members':'ThÃ nh viÃªn'}</th>
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
                <input type="checkbox" ${v.canViewActivity?'checked':''} onchange="ROLES['${k}'].canViewActivity=this.checked;markUnsaved();renderAdminRoles()" title="${lang==='en'?'Allow this role to view Activity Log':'Cho phÃ©p vai trÃ² nÃ y xem Kiá»ƒm soÃ¡t hÃ nh vi'}">
              </td>
              <td style="text-align:center">
                <input type="checkbox" ${v.canExportUsers?'checked':''} onchange="ROLES['${k}'].canExportUsers=this.checked;markUnsaved();renderAdminRoles()" title="${lang==='en'?'Allow this role to export/import user Excel':'Cho phÃ©p vai trÃ² nÃ y xuáº¥t/nháº­p Excel ngÆ°á»i dÃ¹ng'}">
              </td>
              <td>
                <div style="display:flex;align-items:center;gap:6px">
                  <div style="flex:1;background:var(--bg-surface-alt,#e2e8f0);border:1px solid color-mix(in srgb, var(--border) 65%, transparent);border-radius:3px;height:8px;overflow:hidden">
                    <div style="width:${pct}%;height:100%;background:${v.color};border-radius:3px"></div>
                  </div>
                  <span style="font-size:10px;font-family:var(--mono);min-width:50px">${cnt}/${DOCS.length}</span>
                </div>
              </td>
              <td style="min-width:160px">
                ${roleUsers.length>0
                  ? roleUsers.map(u=>'<div style="font-size:10px;padding:2px 0"><span style="color:var(--text-3)">'+u.id+'</span> '+u.name+'</div>').join('')
                  : '<span style="font-size:10px;color:var(--text-3);font-style:italic">'+(lang==='en'?'No members':'ChÆ°a cÃ³')+'</span>'}
              </td>
            </tr>`;
          }).join('')}
        </tbody>
      </table>
    </div>
    <div style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
      <h3 style="font-size:13px;font-weight:700;margin-bottom:10px">${lang==='en'?'Reassign User Role':'Thay Ä‘á»•i vai trÃ² ngÆ°á»i dÃ¹ng'}</h3>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <select id="role-reassign-user" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;min-width:180px;background:var(--bg-surface,#fff);color:var(--text-primary)">
          ${USERS.filter(u=>u.active).map(u=>'<option value="'+u.id+'">'+u.name+' ('+u.role+')</option>').join('')}
        </select>
        <span style="font-size:11px;color:var(--text-3)">â†’</span>
        <select id="role-reassign-role" style="padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;min-width:180px;background:var(--bg-surface,#fff);color:var(--text-primary)">
          ${roleOpts}
        </select>
        <button class="btn-admin primary" onclick="reassignUserRole()">${lang==='en'?'Apply':'Ãp dá»¥ng'}</button>
      </div>
    </div>
    <div class="admin-save-bar">
      <span class="save-hint">${adminUnsaved?'<b>âš  '+(lang==='en'?'Unsaved changes':'CÃ³ thay Ä‘á»•i chÆ°a lÆ°u')+'</b>':lang==='en'?'Make changes then click Save':'Thay Ä‘á»•i rá»“i nháº¥n LÆ°u'}</span>
      <button class="btn-admin secondary" onclick="sessionStorage.clear();location.reload()">â†© Reset All</button>
      <button class="btn-admin primary" onclick="adminSaveAll()" style="padding:8px 24px;font-size:13px">ðŸ’¾ ${lang==='en'?'SAVE':'LÆ¯U'}</button>
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
    showToast(lang==='en'?'âœ… Role changed for '+u.name:'âœ… ÄÃ£ Ä‘á»•i vai trÃ² cho '+u.name);
    renderAdminRoles();
  }
}


// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•

