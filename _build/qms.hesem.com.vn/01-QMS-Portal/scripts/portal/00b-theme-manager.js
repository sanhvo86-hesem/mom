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
var _colorSchemeMedia = null;
var _colorSchemeListenerBound = false;

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
  var effectiveColorMode = colorMode;

  /* Handle scheduled dark mode */
  var schedule = _resolveDeep('colorSchedule');
  if(colorMode === 'schedule' && schedule && schedule.darkFrom && schedule.darkTo){
    effectiveColorMode = _isInDarkSchedule(schedule.darkFrom, schedule.darkTo) ? 'dark' : 'light';
    colorMode = effectiveColorMode;
    _startScheduleTimer(schedule);
  } else {
    _stopScheduleTimer();
  }
  if(effectiveColorMode === 'auto'){
    effectiveColorMode = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  ROOT.setAttribute('data-density', density);
  ROOT.setAttribute('data-color-mode', colorMode);
  ROOT.setAttribute('data-color-scheme-active', effectiveColorMode);
  ROOT.setAttribute('data-radius', radius);
  ROOT.setAttribute('data-motion', motion);

  /* Apply ALL custom CSS variables from config */
  _applyCustomVars();

  _emit('change', { density: density, colorMode: colorMode, effectiveColorMode: effectiveColorMode, radius: radius, motion: motion });
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
  _setVarNumber('--font-display-weight', cfg, 'typography.display.weight');
  _setVarNumber('--font-heading-weight', cfg, 'typography.heading.weight');
  _setVarNumber('--font-body-weight', cfg, 'typography.body.weight');
  _setVarNumber('--font-label-weight', cfg, 'typography.label.weight');

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
  _setVarNumber('--leading-tight', cfg, 'lineHeight.tight');
  _setVarNumber('--leading-normal', cfg, 'lineHeight.normal');
  _setVarNumber('--leading-relaxed', cfg, 'lineHeight.relaxed');

  /* Label styling */
  _setVarEm('--label-letter-spacing', cfg, 'typography.label.spacing');
  _setVar('--label-transform', cfg, 'typography.label.transform');

  /* Brand colors */
  _setVar('--brand-2', cfg, 'brand.primary');
  _setVar('--brand-light', cfg, 'brand.light');
  _setVar('--brand', cfg, 'brand.dark');
  _setVar('--brand-dark', cfg, 'brand.darkest');
  _setVar('--accent', cfg, 'brand.accent');
  _setVar('--accent-light', cfg, 'brand.accentLight');
  _setVar('--bg-sidebar-light', cfg, 'brand.sidebarBg');
  _setVar('--bg-sidebar-dark', cfg, 'colorsDark.sidebarBg');

  /* Status colors — light + dark variants */
  _setVar('--green-light', cfg, 'statusColors.success');
  _setVar('--red-light', cfg, 'statusColors.error');
  _setVar('--amber-light', cfg, 'statusColors.warning');
  _setVar('--blue-light', cfg, 'statusColors.info');
  _setVar('--purple-light', cfg, 'statusColors.purple');
  _setVar('--cyan-light', cfg, 'statusColors.cyan');
  _setVar('--green-dark', cfg, 'statusColorsDark.success');
  _setVar('--red-dark', cfg, 'statusColorsDark.error');
  _setVar('--amber-dark', cfg, 'statusColorsDark.warning');
  _setVar('--blue-dark', cfg, 'statusColorsDark.info');
  _setVar('--purple-dark', cfg, 'statusColorsDark.purple');
  _setVar('--cyan-dark', cfg, 'statusColorsDark.cyan');

  /* Light theme semantic tokens + light/dark variants */
  _setVar('--bg-page-light', cfg, 'colorsLight.bgPage');
  _setVar('--bg-surface-light', cfg, 'colorsLight.bgSurface');
  _setVar('--bg-surface-alt-light', cfg, 'colorsLight.bgSurfaceAlt');
  _setVar('--bg-header-light', cfg, 'colorsLight.bgHeader');
  _setVar('--bg-modal-light', cfg, 'colorsLight.bgModal');
  _setVar('--bg-hover-light', cfg, 'colorsLight.bgHover');
  _setVar('--bg-page-dark', cfg, 'colorsDark.bgPage');
  _setVar('--bg-surface-dark', cfg, 'colorsDark.bgSurface');
  _setVar('--bg-surface-alt-dark', cfg, 'colorsDark.bgSurfaceAlt');
  _setVar('--bg-header-dark', cfg, 'colorsDark.bgHeader');
  _setVar('--bg-modal-dark', cfg, 'colorsDark.bgModal');
  _setVar('--bg-hover-dark', cfg, 'colorsDark.bgHover');

  /* Text — light + dark variants */
  _setVar('--text-primary-light', cfg, 'colorsLight.textPrimary');
  _setVar('--text-secondary-light', cfg, 'colorsLight.textSecondary');
  _setVar('--text-tertiary-light', cfg, 'colorsLight.textTertiary');
  _setVar('--text-link-light', cfg, 'colorsLight.textLink');
  _setVar('--text-inverse-light', cfg, 'colorsLight.textInverse');
  _setVar('--text-primary-dark', cfg, 'colorsDark.textPrimary');
  _setVar('--text-secondary-dark', cfg, 'colorsDark.textSecondary');
  _setVar('--text-tertiary-dark', cfg, 'colorsDark.textTertiary');
  _setVar('--text-inverse-dark', cfg, 'colorsDark.textInverse');
  _setVar('--text-link-dark', cfg, 'colorsDark.textLink');

  /* Borders — light + dark variants */
  _setVar('--border-light', cfg, 'colorsLight.border');
  _setVar('--border-focus-light', cfg, 'colorsLight.borderFocus');
  _setVar('--border-error-light', cfg, 'colorsLight.borderError');
  _setVar('--border-success-light', cfg, 'colorsLight.borderSuccess');
  _setVar('--border-dark', cfg, 'colorsDark.border');
  _setVar('--border-focus-dark', cfg, 'colorsDark.borderFocus');
  _setVar('--border-error-dark', cfg, 'colorsDark.borderError');
  _setVar('--border-success-dark', cfg, 'colorsDark.borderSuccess');

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

  /* Density */
  _setVarPx('--hds-control-h', cfg, 'density.controlH');
  _setVarPx('--hds-control-h-sm', cfg, 'density.controlHSm');
  _setVarPx('--hds-control-h-lg', cfg, 'density.controlHLg');
  _setVarPx('--hds-control-px', cfg, 'density.controlPx');
  _setVarPx('--hds-control-font', cfg, 'density.controlFont');
  _setVarPx('--hds-control-gap', cfg, 'density.controlGap');
  _setVarPx('--hds-icon-sm', cfg, 'density.iconSm');
  _setVarPx('--hds-icon-md', cfg, 'density.iconMd');
  _setVarPx('--hds-table-row-h', cfg, 'density.tableRowH');
  _setVarPx('--hds-table-cell-px', cfg, 'density.tableCellPx');
  _setVarPx('--hds-table-cell-py', cfg, 'density.tableCellPy');
  _setVarPx('--hds-table-head-font', cfg, 'density.tableHeadFont');
  _setVarPx('--hds-table-body-font', cfg, 'density.tableBodyFont');

  /* Radius */
  _setVarPx('--radius-sm', cfg, 'radius.sm');
  _setVarPx('--radius-md', cfg, 'radius.md');
  _setVarPx('--radius-lg', cfg, 'radius.lg');
  _setVarPx('--radius-xl', cfg, 'radius.xl');
  _setVarPx('--radius-2xl', cfg, 'radius.2xl');

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
  _setVarNumber('--overlay-opacity', cfg, 'effects.overlayOpacity');

  /* Effects — motion */
  _setVarMs('--transition-fast', cfg, 'effects.motionFast');
  _setVarMs('--transition-normal', cfg, 'effects.motionNormal');
  _setVarMs('--transition-slow', cfg, 'effects.motionSlow');
  _setVarMs('--transition-spring', cfg, 'effects.motionSpring');

  /* Components — buttons */
  _setVarPx('--btn-padding-y', cfg, 'components.btn.paddingY');
  _setVarPx('--btn-padding-x', cfg, 'components.btn.paddingX');
  _setVarPx('--btn-gap', cfg, 'components.btn.gap');
  _setVarNumber('--btn-font-weight', cfg, 'components.btn.fontWeight');
  _setVarEm('--btn-letter-spacing', cfg, 'components.btn.letterSpacing');
  _setVarPx('--btn-border-width', cfg, 'components.btn.borderWidth');
  _setVarPx('--btn-min-width', cfg, 'components.btn.minWidth');

  /* Components — table */
  _setVar('--table-header-bg', cfg, 'components.table.headerBg');
  _setVarNumber('--table-header-font-weight', cfg, 'components.table.headerFontWeight');
  _setVarEm('--table-header-letter-spacing', cfg, 'components.table.headerLetterSpacing');
  _setVar('--table-row-stripe', cfg, 'components.table.stripeBg');
  _setVar('--table-row-stripe-alt', cfg, 'components.table.stripeAltBg');
  _setVarPx('--table-border-width', cfg, 'components.table.borderWidth');

  /* Components — card */
  _setVarPx('--card-border-width', cfg, 'components.card.borderWidth');
  _setVar('--card-header-bg', cfg, 'components.card.headerBg');
  _setVarPx('--card-header-padding-v', cfg, 'components.card.headerPadding');
  _setVarPx('--card-body-padding', cfg, 'components.card.bodyPadding');

  /* Components — badge */
  _setVarNumber('--badge-font-weight', cfg, 'components.badge.fontWeight');
  _setVarEm('--badge-letter-spacing', cfg, 'components.badge.letterSpacing');
  _setVarPx('--badge-border-width', cfg, 'components.badge.borderWidth');
  _setVarPx('--badge-min-width', cfg, 'components.badge.minWidth');

  /* Components — input */
  _setVarPx('--input-border-width', cfg, 'components.input.borderWidth');
  _setVarPx('--input-padding-y', cfg, 'components.input.paddingY');
  _setVar('--input-bg', cfg, 'components.input.bg');

  /* Components — tabs */
  _setVarPx('--tab-border-width', cfg, 'components.tab.borderWidth');
  _setVarNumber('--tab-font-weight', cfg, 'components.tab.fontWeight');
  _setVarPx('--tab-gap', cfg, 'components.tab.gap');
  _setVar('--tab-active-indicator', cfg, 'components.tab.activeIndicator');

  /* Components — modal */
  _setVarPx('--modal-border-radius', cfg, 'components.modal.radius');
  _setVarPx('--modal-padding', cfg, 'components.modal.padding');
  _setVarPx('--modal-header-padding-v', cfg, 'components.modal.headerPadding');

  /* Components — flow */
  _setVar('--flow-node-bg', cfg, 'components.flow.nodeBg');
  _setVarPx('--flow-node-border-w', cfg, 'components.flow.nodeBorderW');
  _setVar('--flow-node-border-color', cfg, 'components.flow.nodeBorderColor');
  _setVarPx('--flow-node-radius', cfg, 'components.flow.nodeRadius');
  _setVarPx('--flow-node-padding', cfg, 'components.flow.nodePadding');
  _setVar('--flow-connector-color', cfg, 'components.flow.connectorColor');
  _setVarPx('--flow-connector-width', cfg, 'components.flow.connectorWidth');
  _setVarPx('--flow-arrow-size', cfg, 'components.flow.arrowSize');

  /* Components — ISO document */
  _setVar('--iso-box-bg', cfg, 'components.isoBox.bg');
  _setVarPx('--iso-box-border-w', cfg, 'components.isoBox.borderW');
  _setVarPx('--iso-box-radius', cfg, 'components.isoBox.radius');
  _setVar('--iso-box-header-bg', cfg, 'components.isoBox.headerBg');
  _setVarPx('--iso-box-header-padding', cfg, 'components.isoBox.headerPadding');
  _setVarPx('--iso-box-body-padding', cfg, 'components.isoBox.bodyPadding');
  _setVarPx('--iso-box-font-size', cfg, 'components.isoBox.fontSize');

  /* Components — ISO note */
  _setVar('--iso-note-bg', cfg, 'components.isoNote.bg');
  _setVar('--iso-note-border-color', cfg, 'components.isoNote.borderColor');
  _setVar('--iso-note-border-left-color', cfg, 'components.isoNote.borderLeftColor');
  _setVarPx('--iso-note-border-left-w', cfg, 'components.isoNote.borderLeftW');
  _setVarPx('--iso-note-radius', cfg, 'components.isoNote.radius');
  _setVarPx('--iso-note-padding', cfg, 'components.isoNote.padding');
  _setVarPx('--iso-note-font-size', cfg, 'components.isoNote.fontSize');
  _setVarPx('--iso-note-icon-size', cfg, 'components.isoNote.iconSize');

  /* Components — KPI and progress */
  _setVarPx('--kpi-border-width', cfg, 'components.kpi.borderWidth');
  _setVarPx('--kpi-icon-size', cfg, 'components.kpi.iconSize');
  _setVarPx('--kpi-trend-font-size', cfg, 'components.kpi.trendFontSize');
  _setVarPx('--progress-height', cfg, 'components.progress.height');
  _setVarPx('--progress-radius', cfg, 'components.progress.radius');
  _setVar('--progress-bg', cfg, 'components.progress.bg');

  /* Components — tooltip & dropdown */
  _setVar('--tooltip-bg', cfg, 'components.tooltip.bg');
  _setVar('--tooltip-color', cfg, 'components.tooltip.color');
  _setVarPx('--tooltip-padding-y', cfg, 'components.tooltip.paddingY');
  _setVarPx('--tooltip-padding-x', cfg, 'components.tooltip.paddingX');
  _setVarPx('--tooltip-radius', cfg, 'components.tooltip.radius');
  _setVarPx('--tooltip-font-size', cfg, 'components.tooltip.fontSize');
  _setVarPx('--tooltip-max-width', cfg, 'components.tooltip.maxWidth');
  _setVarPx('--dropdown-radius', cfg, 'components.dropdown.radius');
  _setVarPx('--dropdown-item-padding', cfg, 'components.dropdown.itemPadding');
  _setVarPx('--dropdown-item-font-size', cfg, 'components.dropdown.itemFontSize');
  _setVar('--dropdown-item-hover-bg', cfg, 'components.dropdown.hoverBg');

  /* Components — navigation & pagination */
  _setVarPx('--nav-item-height', cfg, 'components.nav.height');
  _setVarPx('--nav-item-font-size', cfg, 'components.nav.fontSize');
  _setVarPx('--nav-item-icon-size', cfg, 'components.nav.iconSize');
  _setVarPx('--nav-item-gap', cfg, 'components.nav.gap');
  _setVarPx('--nav-item-radius', cfg, 'components.nav.radius');
  _setVarPx('--pagination-btn-size', cfg, 'components.pagination.btnSize');
  _setVarPx('--pagination-btn-radius', cfg, 'components.pagination.radius');
  _setVarPx('--pagination-font-size', cfg, 'components.pagination.fontSize');
  _setVarPx('--pagination-gap', cfg, 'components.pagination.gap');

  /* Components — empty state, form field, breadcrumb */
  _setVarPx('--empty-icon-size', cfg, 'components.empty.iconSize');
  _setVarNumber('--empty-icon-opacity', cfg, 'components.empty.iconOpacity');
  _setVarPx('--empty-title-font-size', cfg, 'components.empty.titleFontSize');
  _setVarPx('--empty-desc-font-size', cfg, 'components.empty.descFontSize');
  _setVarPx('--field-gap', cfg, 'components.field.gap');
  _setVarPx('--field-label-gap', cfg, 'components.field.labelGap');
  _setVarPx('--field-group-gap', cfg, 'components.field.groupGap');
  _setVarPx('--field-helper-font-size', cfg, 'components.field.helperFontSize');
  _setVarPx('--breadcrumb-font-size', cfg, 'components.breadcrumb.fontSize');
  _setVarPx('--breadcrumb-gap', cfg, 'components.breadcrumb.gap');
  _setVar('--breadcrumb-color', cfg, 'components.breadcrumb.color');
  _setVar('--breadcrumb-active-color', cfg, 'components.breadcrumb.activeColor');

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

function _getPathValue(cfg, path){
  var parts = path.split('.');
  var val = cfg;
  for(var i = 0; i < parts.length; i++){
    if(val && typeof val === 'object') val = val[parts[i]];
    else { val = undefined; break; }
  }
  return val;
}

/** Set CSS variable from nested config path (string value) */
function _setVar(varName, cfg, path){
  var val = _getPathValue(cfg, path);
  if(val !== undefined && val !== null && val !== '') ROOT.style.setProperty(varName, String(val));
}

function _setVarNumber(varName, cfg, path){
  var val = _getPathValue(cfg, path);
  if(val === undefined || val === null || val === '') return;
  var num = parseFloat(val);
  if(!isNaN(num)) ROOT.style.setProperty(varName, String(num));
  else ROOT.style.setProperty(varName, String(val));
}

function _setVarUnit(varName, cfg, path, unit){
  var val = _getPathValue(cfg, path);
  if(val === undefined || val === null || val === '') return;
  var str = String(val).trim();
  if(unit && /^-?\d*\.?\d+$/.test(str)) str += unit;
  ROOT.style.setProperty(varName, str);
}

/** Set CSS variable with px unit */
function _setVarPx(varName, cfg, path){
  _setVarUnit(varName, cfg, path, 'px');
}

function _setVarEm(varName, cfg, path){
  _setVarUnit(varName, cfg, path, 'em');
}

/** Set CSS variable with ms unit (for transitions) */
function _setVarMs(varName, cfg, path){
  var val = _getPathValue(cfg, path);
  if(val === undefined || val === null || val === '') return;
  var str = String(val).trim();
  if(/^-?\d*\.?\d+$/.test(str)) str += 'ms';
  if(!/(^|\s)(ease|linear|ease-in|ease-out|ease-in-out|cubic-bezier\()/i.test(str)) str += ' ease';
  ROOT.style.setProperty(varName, str);
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
    ROOT.setAttribute('data-color-scheme-active', target);
  }, 60000); /* check every minute */
}

function _stopScheduleTimer(){
  if(_scheduleTimer){ clearInterval(_scheduleTimer); _scheduleTimer = null; }
}

function _ensureColorSchemeListener(){
  if(_colorSchemeListenerBound || !window.matchMedia) return;
  _colorSchemeMedia = window.matchMedia('(prefers-color-scheme: dark)');
  var handler = function(){
    if(_resolve('colorMode') === 'auto') _apply();
  };
  if(_colorSchemeMedia.addEventListener) _colorSchemeMedia.addEventListener('change', handler);
  else if(_colorSchemeMedia.addListener) _colorSchemeMedia.addListener(handler);
  _colorSchemeListenerBound = true;
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
  _ensureColorSchemeListener();
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
