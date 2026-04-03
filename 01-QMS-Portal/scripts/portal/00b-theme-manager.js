/* ============================================================================
   HESEM QMS — ThemeManager v2.0
   Enterprise-grade theme management with 150+ configurable properties.

   Architecture (SAP Fiori + Atlassian + Material Theme Builder pattern):
     Admin org defaults → qms-data/config/design-system-config.json
     User prefs → localStorage hesem_user_appearance
     Applied as: data-* attributes + CSS custom properties on <html>

   Cascade: System CSS defaults → Admin config → User prefs → inline override
   Load order: AFTER 00a-registry-service.js, BEFORE 00-block-engine.js
   ============================================================================ */
(function(){
'use strict';

var STORAGE_KEY = 'hesem_user_appearance';
var ADMIN_STORAGE_KEY = 'hesem_admin_appearance_cache';
var ROOT = document.documentElement;

/* ── Default values ─────────────────────────────────────────────────────── */
var DEFAULTS = {
  /* Presets */
  density:   'default',
  colorMode: 'light',
  radius:    'rounded',
  motion:    'normal',
  fontSize:  0,
  /* Scheduled dark mode */
  colorSchedule: null  /* { darkFrom:'18:00', darkTo:'06:00' } or null */
};

var _adminConfig = null;
var _userPrefs = null;
var _listeners = [];
var _scheduleTimer = null;

/* ── Load/Save ──────────────────────────────────────────────────────────── */
function _loadUserPrefs(){
  if(_userPrefs) return _userPrefs;
  try { var raw = localStorage.getItem(STORAGE_KEY); _userPrefs = raw ? JSON.parse(raw) : {}; }
  catch(e){ _userPrefs = {}; }
  return _userPrefs;
}

function _saveUserPrefs(){
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_userPrefs || {})); } catch(e){}
}

function _loadAdminConfig(callback){
  if(_adminConfig){ if(callback) callback(_adminConfig); return; }
  /* Try cached first */
  try { var cached = localStorage.getItem(ADMIN_STORAGE_KEY); if(cached) _adminConfig = JSON.parse(cached); } catch(e){}

  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'api.php?action=admin_design_config', true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status >= 200 && xhr.status < 300){
      try {
        var resp = JSON.parse(xhr.responseText);
        _adminConfig = (resp && resp.data) ? resp.data : (resp && resp.config) ? resp.config : (_adminConfig || {});
        try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(_adminConfig)); } catch(e){}
        if(callback) callback(_adminConfig);
        return;
      } catch(e){}
    }
    /* Fallback: direct JSON file */
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', 'qms-data/config/design-system-config.json', true);
    xhr2.onreadystatechange = function(){
      if(xhr2.readyState !== 4) return;
      try { _adminConfig = JSON.parse(xhr2.responseText) || (_adminConfig || {}); } catch(e){ _adminConfig = _adminConfig || {}; }
      if(callback) callback(_adminConfig);
    };
    xhr2.send();
  };
  xhr.send();
}

/* ── Resolve: user → admin → default ────────────────────────────────────── */
function _resolve(key){
  var userPrefs = _loadUserPrefs();
  if(userPrefs[key] !== undefined && userPrefs[key] !== null && userPrefs[key] !== '') return userPrefs[key];
  if(_adminConfig && _adminConfig[key] !== undefined) return _adminConfig[key];
  return DEFAULTS[key];
}

/** Deep resolve for nested keys like 'typography.heading.family' */
function _resolveDeep(path){
  var parts = path.split('.');
  var userPrefs = _loadUserPrefs();
  /* Check user prefs */
  var val = userPrefs;
  for(var i = 0; i < parts.length; i++){
    if(val && typeof val === 'object') val = val[parts[i]];
    else { val = undefined; break; }
  }
  if(val !== undefined && val !== null && val !== '') return val;
  /* Check admin config */
  val = _adminConfig;
  for(var j = 0; j < parts.length; j++){
    if(val && typeof val === 'object') val = val[parts[j]];
    else { val = undefined; break; }
  }
  return val !== undefined ? val : undefined;
}

/* ── Apply ALL settings ─────────────────────────────────────────────────── */
function _apply(){
  var density = _resolve('density');
  var colorMode = _resolve('colorMode');
  var radius = _resolve('radius');
  var motion = _resolve('motion');

  /* Handle scheduled dark mode */
  var schedule = _resolveDeep('colorSchedule');
  if(colorMode === 'schedule' && schedule && schedule.darkFrom && schedule.darkTo){
    colorMode = _isInDarkSchedule(schedule.darkFrom, schedule.darkTo) ? 'dark' : 'light';
    _startScheduleTimer(schedule);
  } else {
    _stopScheduleTimer();
  }

  ROOT.setAttribute('data-density', density);
  ROOT.setAttribute('data-color-mode', colorMode);
  ROOT.setAttribute('data-radius', radius);
  ROOT.setAttribute('data-motion', motion);

  /* Apply ALL custom CSS variables from config */
  _applyCustomVars();

  _emit('change', { density: density, colorMode: colorMode, radius: radius, motion: motion });
}

/** Inject custom CSS variables from admin config + user prefs */
function _applyCustomVars(){
  var cfg = _mergedConfig();

  /* Typography — font families per context */
  _setVar('--font-display', cfg, 'typography.display.family');
  _setVar('--font-heading', cfg, 'typography.heading.family');
  _setVar('--font-body', cfg, 'typography.body.family');
  _setVar('--font', cfg, 'typography.body.family'); /* legacy alias */
  _setVar('--font-label', cfg, 'typography.label.family');
  _setVar('--font-mono', cfg, 'typography.mono.family');

  /* Typography — weights */
  _setVarPx('--font-display-weight', cfg, 'typography.display.weight');
  _setVarPx('--font-heading-weight', cfg, 'typography.heading.weight');
  _setVarPx('--font-body-weight', cfg, 'typography.body.weight');
  _setVarPx('--font-label-weight', cfg, 'typography.label.weight');

  /* Typography — font sizes */
  _setVarPx('--text-xs', cfg, 'fontScale.xs');
  _setVarPx('--text-sm', cfg, 'fontScale.sm');
  _setVarPx('--text-base', cfg, 'fontScale.base');
  _setVarPx('--text-md', cfg, 'fontScale.md');
  _setVarPx('--text-lg', cfg, 'fontScale.lg');
  _setVarPx('--text-xl', cfg, 'fontScale.xl');
  _setVarPx('--text-2xl', cfg, 'fontScale.2xl');
  _setVarPx('--text-3xl', cfg, 'fontScale.3xl');

  /* Line heights */
  _setVar('--leading-tight', cfg, 'lineHeight.tight');
  _setVar('--leading-normal', cfg, 'lineHeight.normal');
  _setVar('--leading-relaxed', cfg, 'lineHeight.relaxed');

  /* Label styling */
  _setVar('--label-letter-spacing', cfg, 'typography.label.spacing');
  _setVar('--label-transform', cfg, 'typography.label.transform');

  /* Brand colors */
  _setVar('--brand-2', cfg, 'brand.primary');
  _setVar('--brand-light', cfg, 'brand.light');
  _setVar('--brand', cfg, 'brand.dark');
  _setVar('--brand-dark', cfg, 'brand.darkest');
  _setVar('--accent', cfg, 'brand.accent');
  _setVar('--accent-light', cfg, 'brand.accentLight');
  _setVar('--bg-sidebar', cfg, 'brand.sidebarBg');

  /* Status colors — light */
  _setVar('--green', cfg, 'statusColors.success');
  _setVar('--red', cfg, 'statusColors.error');
  _setVar('--amber', cfg, 'statusColors.warning');
  _setVar('--blue', cfg, 'statusColors.info');
  _setVar('--purple', cfg, 'statusColors.purple');
  _setVar('--cyan', cfg, 'statusColors.cyan');

  /* Light theme surfaces */
  _setVar('--bg-page', cfg, 'colorsLight.bgPage');
  _setVar('--bg-surface', cfg, 'colorsLight.bgSurface');
  _setVar('--bg-surface-alt', cfg, 'colorsLight.bgSurfaceAlt');
  _setVar('--bg-header', cfg, 'colorsLight.bgHeader');
  _setVar('--bg-modal', cfg, 'colorsLight.bgModal');
  _setVar('--bg-hover', cfg, 'colorsLight.bgHover');

  /* Light theme text */
  _setVar('--text-primary', cfg, 'colorsLight.textPrimary');
  _setVar('--text-secondary', cfg, 'colorsLight.textSecondary');
  _setVar('--text-tertiary', cfg, 'colorsLight.textTertiary');
  _setVar('--text-link', cfg, 'colorsLight.textLink');
  _setVar('--text-inverse', cfg, 'colorsLight.textInverse');

  /* Light theme borders */
  _setVar('--border', cfg, 'colorsLight.border');
  _setVar('--border-focus', cfg, 'colorsLight.borderFocus');
  _setVar('--border-error', cfg, 'colorsLight.borderError');
  _setVar('--border-success', cfg, 'colorsLight.borderSuccess');

  /* Layout */
  _setVarPx('--sidebar-w', cfg, 'layout.sidebarW');
  _setVarPx('--sidebar-w-collapsed', cfg, 'layout.sidebarCollapsed');
  _setVarPx('--header-h', cfg, 'layout.headerH');
  _setVarPx('--content-max-w', cfg, 'layout.contentMaxW');
  _setVarPx('--modal-max-w', cfg, 'layout.modalMaxW');
  _setVarPx('--modal-sm-max-w', cfg, 'layout.modalSmMaxW');

  /* Spacing */
  _setVarPx('--space-1', cfg, 'spacing.1');
  _setVarPx('--space-2', cfg, 'spacing.2');
  _setVarPx('--space-3', cfg, 'spacing.3');
  _setVarPx('--space-4', cfg, 'spacing.4');
  _setVarPx('--space-5', cfg, 'spacing.5');
  _setVarPx('--space-6', cfg, 'spacing.6');
  _setVarPx('--space-8', cfg, 'spacing.8');
  _setVarPx('--space-10', cfg, 'spacing.10');
  _setVarPx('--space-12', cfg, 'spacing.12');
  _setVarPx('--space-16', cfg, 'spacing.16');

  /* Effects — focus ring */
  _setVarPx('--focus-ring-width', cfg, 'effects.focusRingWidth');
  _setVar('--focus-ring-color', cfg, 'effects.focusRingColor');
  _setVarPx('--focus-ring-offset', cfg, 'effects.focusRingOffset');

  /* Effects — selection */
  _setVar('--selection-bg', cfg, 'effects.selectionBg');
  _setVar('--selection-color', cfg, 'effects.selectionColor');

  /* Effects — caret + placeholder */
  _setVar('--caret-color', cfg, 'effects.caretColor');
  _setVar('--placeholder-color', cfg, 'effects.placeholderColor');

  /* Effects — disabled */
  _setVar('--disabled-opacity', cfg, 'effects.disabledOpacity');

  /* Effects — scrollbar */
  _setVarPx('--scrollbar-width', cfg, 'effects.scrollbarWidth');
  _setVar('--scrollbar-track', cfg, 'effects.scrollbarTrack');
  _setVar('--scrollbar-thumb', cfg, 'effects.scrollbarThumb');
  _setVarPx('--scrollbar-radius', cfg, 'effects.scrollbarRadius');

  /* Effects — backdrop */
  _setVarPx('--backdrop-blur', cfg, 'effects.backdropBlur');
  _setVar('--overlay-opacity', cfg, 'effects.overlayOpacity');

  /* Effects — motion */
  _setVarMs('--transition-fast', cfg, 'effects.motionFast');
  _setVarMs('--transition-normal', cfg, 'effects.motionNormal');
  _setVarMs('--transition-slow', cfg, 'effects.motionSlow');
  _setVarMs('--transition-spring', cfg, 'effects.motionSpring');

  /* Custom CSS injection */
  var customCSS = _resolveDeep('advanced.customCSS');
  _applyCustomCSS(customCSS || '');
}

/** Merge admin + user into one config (user wins) */
function _mergedConfig(){
  var merged = {};
  _deepMerge(merged, _adminConfig || {});
  _deepMerge(merged, _loadUserPrefs() || {});
  return merged;
}

function _deepMerge(target, source){
  Object.keys(source || {}).forEach(function(key){
    if(key === '_meta') return;
    var val = source[key];
    if(val && typeof val === 'object' && !Array.isArray(val)){
      if(!target[key] || typeof target[key] !== 'object') target[key] = {};
      _deepMerge(target[key], val);
    } else if(val !== undefined && val !== null && val !== ''){
      target[key] = val;
    }
  });
  return target;
}

/** Set CSS variable from nested config path (string value) */
function _setVar(varName, cfg, path){
  var parts = path.split('.');
  var val = cfg;
  for(var i = 0; i < parts.length; i++){
    if(val && typeof val === 'object') val = val[parts[i]];
    else { val = undefined; break; }
  }
  if(val !== undefined && val !== null && val !== ''){
    ROOT.style.setProperty(varName, String(val));
  }
}

/** Set CSS variable with px unit */
function _setVarPx(varName, cfg, path){
  var parts = path.split('.');
  var val = cfg;
  for(var i = 0; i < parts.length; i++){
    if(val && typeof val === 'object') val = val[parts[i]];
    else { val = undefined; break; }
  }
  if(val !== undefined && val !== null && val !== ''){
    var num = parseFloat(val);
    if(!isNaN(num)) ROOT.style.setProperty(varName, num + 'px');
  }
}

/** Set CSS variable with ms unit (for transitions) */
function _setVarMs(varName, cfg, path){
  var parts = path.split('.');
  var val = cfg;
  for(var i = 0; i < parts.length; i++){
    if(val && typeof val === 'object') val = val[parts[i]];
    else { val = undefined; break; }
  }
  if(val !== undefined && val !== null && val !== ''){
    var num = parseFloat(val);
    if(!isNaN(num)) ROOT.style.setProperty(varName, num + 'ms ease');
  }
}

/** Inject custom CSS into a <style> tag */
function _applyCustomCSS(css){
  var id = 'hm-theme-custom-css';
  var el = document.getElementById(id);
  if(!css){
    if(el) el.remove();
    return;
  }
  if(!el){
    el = document.createElement('style');
    el.id = id;
    document.head.appendChild(el);
  }
  el.textContent = css;
}

/* ── Scheduled dark mode ────────────────────────────────────────────────── */
function _isInDarkSchedule(from, to){
  var now = new Date();
  var h = now.getHours();
  var m = now.getMinutes();
  var current = h * 60 + m;
  var fp = from.split(':'); var fromMin = parseInt(fp[0],10) * 60 + parseInt(fp[1]||0,10);
  var tp = to.split(':'); var toMin = parseInt(tp[0],10) * 60 + parseInt(tp[1]||0,10);
  if(fromMin <= toMin) return current >= fromMin && current < toMin;
  return current >= fromMin || current < toMin; /* crosses midnight */
}

function _startScheduleTimer(schedule){
  _stopScheduleTimer();
  _scheduleTimer = setInterval(function(){
    var shouldDark = _isInDarkSchedule(schedule.darkFrom, schedule.darkTo);
    var current = ROOT.getAttribute('data-color-mode');
    var target = shouldDark ? 'dark' : 'light';
    if(current !== target) ROOT.setAttribute('data-color-mode', target);
  }, 60000); /* check every minute */
}

function _stopScheduleTimer(){
  if(_scheduleTimer){ clearInterval(_scheduleTimer); _scheduleTimer = null; }
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

function init(callback){
  _loadUserPrefs();
  _loadAdminConfig(function(){
    _apply();
    if(callback) callback();
  });
  _apply();
}

function get(key){ return _resolve(key); }
function getDeep(path){ return _resolveDeep(path); }

function set(key, value){
  _loadUserPrefs();
  _userPrefs[key] = value;
  _saveUserPrefs();
  _apply();
}

/** Set a nested value: setDeep('typography.heading.family', 'Roboto') */
function setDeep(path, value){
  _loadUserPrefs();
  var parts = path.split('.');
  var obj = _userPrefs;
  for(var i = 0; i < parts.length - 1; i++){
    if(!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
  _saveUserPrefs();
  _apply();
}

/** Set a CSS variable directly (for real-time slider preview) */
function setVar(varName, value){
  ROOT.style.setProperty(varName, value);
}

function setAll(prefs){
  _loadUserPrefs();
  _deepMerge(_userPrefs, prefs);
  _saveUserPrefs();
  _apply();
}

function reset(){
  _userPrefs = {};
  _saveUserPrefs();
  /* Remove all inline style overrides */
  ROOT.removeAttribute('style');
  _apply();
}

function getAll(){
  return {
    density: _resolve('density'),
    colorMode: _resolve('colorMode'),
    radius: _resolve('radius'),
    motion: _resolve('motion'),
    fontSize: _resolve('fontSize')
  };
}

/** Get full merged config (for admin panel display) */
function getFullConfig(){
  return _mergedConfig();
}

function on(event, callback){ _listeners.push({ event: event, callback: callback }); }
function off(event, callback){ _listeners = _listeners.filter(function(l){ return !(l.event === event && l.callback === callback); }); }

function isDark(){
  var mode = _resolve('colorMode');
  if(mode === 'dark') return true;
  if(mode === 'auto' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) return true;
  if(mode === 'schedule'){
    var schedule = _resolveDeep('colorSchedule');
    if(schedule) return _isInDarkSchedule(schedule.darkFrom, schedule.darkTo);
  }
  return false;
}

function getAdminConfig(){ return _adminConfig || {}; }

function saveAdminConfig(config, callback){
  _adminConfig = config;
  try { localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(config)); } catch(e){}
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'api.php?action=admin_design_config_save', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if(typeof csrfToken !== 'undefined' && csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    _apply();
    if(callback) callback(xhr.status >= 200 && xhr.status < 300);
  };
  xhr.send(JSON.stringify({ config: config }));
}

/** WCAG contrast ratio calculator */
function contrastRatio(hex1, hex2){
  function luminance(hex){
    var r = parseInt(hex.slice(1,3),16)/255;
    var g = parseInt(hex.slice(3,5),16)/255;
    var b = parseInt(hex.slice(5,7),16)/255;
    r = r <= 0.03928 ? r/12.92 : Math.pow((r+0.055)/1.055, 2.4);
    g = g <= 0.03928 ? g/12.92 : Math.pow((g+0.055)/1.055, 2.4);
    b = b <= 0.03928 ? b/12.92 : Math.pow((b+0.055)/1.055, 2.4);
    return 0.2126*r + 0.7152*g + 0.0722*b;
  }
  var l1 = luminance(hex1);
  var l2 = luminance(hex2);
  var lighter = Math.max(l1, l2);
  var darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Export current theme as JSON */
function exportTheme(){
  return JSON.stringify(_mergedConfig(), null, 2);
}

/** Import theme from JSON string */
function importTheme(jsonStr){
  try {
    var config = JSON.parse(jsonStr);
    _adminConfig = config;
    _apply();
    return true;
  } catch(e){ return false; }
}

/* ── EXPOSE ────────────────────────────────────────────────────────────── */
window.HmTheme = {
  init: init,
  get: get,
  getDeep: getDeep,
  set: set,
  setDeep: setDeep,
  setVar: setVar,
  setAll: setAll,
  getAll: getAll,
  getFullConfig: getFullConfig,
  reset: reset,
  on: on,
  off: off,
  isDark: isDark,
  getAdminConfig: getAdminConfig,
  saveAdminConfig: saveAdminConfig,
  contrastRatio: contrastRatio,
  exportTheme: exportTheme,
  importTheme: importTheme,
  DEFAULTS: DEFAULTS
};

})();
