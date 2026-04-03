/* ============================================================================
   HESEM QMS — ThemeManager v1.0
   Manages density, color mode, radius, motion preferences.

   Architecture (SAP Fiori + Atlassian pattern):
     Admin defaults → qms-data/config/design-system-config.json (server)
     User prefs → localStorage hesem_user_appearance (client)
     Applied as data-* attributes on <html>

   Load order: AFTER 00a-registry-service.js, BEFORE 00-block-engine.js
   ============================================================================ */
(function(){
'use strict';

var STORAGE_KEY = 'hesem_user_appearance';
var ROOT = document.documentElement;

/* ── Default values (overridden by admin config then user prefs) ────────── */
var DEFAULTS = {
  density:   'default',     /* compact | default | comfortable */
  colorMode: 'light',       /* light | dark | auto */
  radius:    'rounded',     /* sharp | rounded | pill */
  motion:    'normal',      /* normal | reduced | off */
  fontSize:  0              /* -1, 0, +1, +2 adjustment */
};

var _adminConfig = null;    /* loaded from server */
var _userPrefs = null;      /* loaded from localStorage */
var _listeners = [];

/* ── Load user preferences from localStorage ────────────────────────────── */
function _loadUserPrefs(){
  if(_userPrefs) return _userPrefs;
  try {
    var raw = localStorage.getItem(STORAGE_KEY);
    _userPrefs = raw ? JSON.parse(raw) : {};
  } catch(e) {
    _userPrefs = {};
  }
  return _userPrefs;
}

/* ── Save user preferences to localStorage ──────────────────────────────── */
function _saveUserPrefs(){
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(_userPrefs || {}));
  } catch(e) {}
}

/* ── Load admin config from server ──────────────────────────────────────── */
function _loadAdminConfig(callback){
  if(_adminConfig){
    if(callback) callback(_adminConfig);
    return;
  }

  /* Try API first */
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'api.php?action=admin_design_config', true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status >= 200 && xhr.status < 300){
      try {
        var resp = JSON.parse(xhr.responseText);
        _adminConfig = (resp && resp.data) ? resp.data : (resp && resp.config) ? resp.config : {};
        if(callback) callback(_adminConfig);
        return;
      } catch(e){}
    }
    /* Fallback: try direct JSON file */
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', 'qms-data/config/design-system-config.json', true);
    xhr2.onreadystatechange = function(){
      if(xhr2.readyState !== 4) return;
      try {
        _adminConfig = JSON.parse(xhr2.responseText) || {};
      } catch(e){
        _adminConfig = {};
      }
      if(callback) callback(_adminConfig);
    };
    xhr2.send();
  };
  xhr.send();
}

/* ── Resolve final value: admin default → user override ─────────────────── */
function _resolve(key){
  var userPrefs = _loadUserPrefs();
  if(userPrefs[key] !== undefined && userPrefs[key] !== null && userPrefs[key] !== '') return userPrefs[key];
  if(_adminConfig && _adminConfig[key] !== undefined) return _adminConfig[key];
  return DEFAULTS[key];
}

/* ── Apply all settings to <html> data-* attributes ─────────────────────── */
function _apply(){
  var density = _resolve('density');
  var colorMode = _resolve('colorMode');
  var radius = _resolve('radius');
  var motion = _resolve('motion');
  var fontSize = _resolve('fontSize');

  ROOT.setAttribute('data-density', density);
  ROOT.setAttribute('data-color-mode', colorMode);
  ROOT.setAttribute('data-radius', radius);
  ROOT.setAttribute('data-motion', motion);

  /* Font size adjustment */
  if(fontSize && fontSize !== 0){
    var base = 14 + (parseInt(fontSize, 10) || 0);
    ROOT.style.setProperty('--text-base', base + 'px');
    ROOT.style.setProperty('--text-sm', (base - 1) + 'px');
    ROOT.style.setProperty('--text-xs', (base - 3) + 'px');
    ROOT.style.setProperty('--text-md', (base + 2) + 'px');
  } else {
    ROOT.style.removeProperty('--text-base');
    ROOT.style.removeProperty('--text-sm');
    ROOT.style.removeProperty('--text-xs');
    ROOT.style.removeProperty('--text-md');
  }

  /* Apply admin brand overrides */
  if(_adminConfig){
    if(_adminConfig.brandPrimary) ROOT.style.setProperty('--brand-2', _adminConfig.brandPrimary);
    if(_adminConfig.brandAccent) ROOT.style.setProperty('--accent', _adminConfig.brandAccent);
    if(_adminConfig.sidebarBg) ROOT.style.setProperty('--bg-sidebar', _adminConfig.sidebarBg);
    if(_adminConfig.fontFamily) ROOT.style.setProperty('--font', _adminConfig.fontFamily);
  }

  _emit('change', { density: density, colorMode: colorMode, radius: radius, motion: motion });
}

/* ── Event system ────────────────────────────────────────────────────────── */
function _emit(event, detail){
  _listeners.forEach(function(l){
    if(l.event === event || l.event === '*'){
      try { l.callback(detail); } catch(e){}
    }
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   PUBLIC API
   ══════════════════════════════════════════════════════════════════════════ */

/** Initialize theme — call once at app startup */
function init(callback){
  _loadUserPrefs();
  _loadAdminConfig(function(){
    _apply();
    if(callback) callback();
  });

  /* Also apply immediately with defaults (before admin config loads) */
  _apply();
}

/** Get current resolved value for a setting */
function get(key){
  return _resolve(key);
}

/** Set user preference (persists to localStorage, applies immediately) */
function set(key, value){
  _loadUserPrefs();
  _userPrefs[key] = value;
  _saveUserPrefs();
  _apply();
}

/** Set multiple preferences at once */
function setAll(prefs){
  _loadUserPrefs();
  Object.keys(prefs || {}).forEach(function(k){
    _userPrefs[k] = prefs[k];
  });
  _saveUserPrefs();
  _apply();
}

/** Reset user prefs to admin defaults */
function reset(){
  _userPrefs = {};
  _saveUserPrefs();
  _apply();
}

/** Get all current settings (for display in settings UI) */
function getAll(){
  return {
    density: _resolve('density'),
    colorMode: _resolve('colorMode'),
    radius: _resolve('radius'),
    motion: _resolve('motion'),
    fontSize: _resolve('fontSize')
  };
}

/** Subscribe to changes */
function on(event, callback){
  _listeners.push({ event: event, callback: callback });
}

function off(event, callback){
  _listeners = _listeners.filter(function(l){
    return !(l.event === event && l.callback === callback);
  });
}

/** Check if dark mode is active (for JS code that needs to know) */
function isDark(){
  var mode = _resolve('colorMode');
  if(mode === 'dark') return true;
  if(mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
  return false;
}

/** Get admin config (for admin panel display) */
function getAdminConfig(){
  return _adminConfig || {};
}

/** Save admin config to server */
function saveAdminConfig(config, callback){
  _adminConfig = config;
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'api.php?action=admin_design_config_save', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if(typeof csrfToken !== 'undefined' && csrfToken){
    xhr.setRequestHeader('X-CSRF-Token', csrfToken);
  }
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    _apply();
    if(callback) callback(xhr.status >= 200 && xhr.status < 300);
  };
  xhr.send(JSON.stringify({ config: config }));
}

/* ── EXPOSE ────────────────────────────────────────────────────────────── */
window.HmTheme = {
  init: init,
  get: get,
  set: set,
  setAll: setAll,
  getAll: getAll,
  reset: reset,
  on: on,
  off: off,
  isDark: isDark,
  getAdminConfig: getAdminConfig,
  saveAdminConfig: saveAdminConfig,
  DEFAULTS: DEFAULTS
};

})();
