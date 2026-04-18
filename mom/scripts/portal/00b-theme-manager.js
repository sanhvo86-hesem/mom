/* ============================================================================
   HESEM MOM — ThemeManager v2.0
   Enterprise-grade theme management with 150+ configurable properties.

   Architecture (SAP Fiori + Atlassian + Material Theme Builder pattern):
     Admin org defaults → backend admin_design_config / data/config/design-system-config.json
     User prefs → localStorage hesem_user_appearance
     Template registry authority → backend graphics governance endpoints
     Template preview cache → localStorage hesem_graphics_template_preview_cache
     Applied as: data-* attributes + CSS custom properties on <html>

   Cascade: System CSS defaults → Admin config → user preview prefs → inline preview override
   Inline overrides are runtime previews only; they are not an authority path for
   module visuals and cannot replace backend graphics governance.
   Load order: AFTER 00a-registry-service.js, BEFORE 00-block-engine.js
   ============================================================================ */
(function(){
'use strict';

var STORAGE_KEY = 'hesem_user_appearance';
var ADMIN_STORAGE_KEY = 'hesem_admin_appearance_cache'; /* legacy key; no longer written as authority/cache */
var TEMPLATE_PREVIEW_CACHE_KEY = 'hesem_graphics_template_preview_cache';
var FORBIDDEN_TEMPLATE_AUTHORITY_KEYS = ['hesem_layout_templates', 'hesem_module_template_binding'];
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
var _adminConfigVersion = '';
var _adminConfigEtag = '';
var _adminConfigAuthorityState = 'unknown';
var _adminConfigPreviewDirty = false;
var _adminConfigPreviewReason = '';
var _userPrefs = null;
var _previewPrefs = null;
var _templateStore = null;
var _listeners = [];
var _scheduleTimer = null;
var _colorSchemeMedia = null;
var _colorSchemeListenerBound = false;
var _previewCssVarsApplied = {};

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

function _loadTemplatePreviewCache(){
  if(_templateStore) return _templateStore;
  try {
    var raw = localStorage.getItem(TEMPLATE_PREVIEW_CACHE_KEY);
    _templateStore = raw ? JSON.parse(raw) : {};
  } catch(e){
    _templateStore = {};
  }
  return _templateStore;
}

function _saveTemplatePreviewCache(){
  try { localStorage.setItem(TEMPLATE_PREVIEW_CACHE_KEY, JSON.stringify(_templateStore || {})); } catch(e){}
}

function _purgeForbiddenTemplateAuthorityKeys(){
  if(!window.localStorage) return;
  FORBIDDEN_TEMPLATE_AUTHORITY_KEYS.forEach(function(key){
    try {
      if(localStorage.getItem(key) !== null){
        localStorage.removeItem(key);
        _emit('template-authority-key-purged', {
          key: key,
          reason: 'browser-storage-template-authority-forbidden',
          replacementAuthority: 'backend_graphics_governance_template_registry'
        });
      }
    } catch(e){}
  });
}

function _loadAdminConfig(callback){
  if(_adminConfig){ if(callback) callback(_adminConfig); return; }
  var xhr = new XMLHttpRequest();
  xhr.open('GET', 'api.php?action=admin_design_config', true);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    if(xhr.status >= 200 && xhr.status < 300){
      try {
        var resp = JSON.parse(xhr.responseText);
        _adminConfig = (resp && resp.data) ? resp.data : (resp && resp.config) ? resp.config : (_adminConfig || {});
        _adminConfigVersion = String((resp && resp.version) || (_adminConfig && _adminConfig._meta && _adminConfig._meta.version) || '');
        _adminConfigEtag = String((resp && resp.etag) || '');
        _adminConfigAuthorityState = 'backend-attested';
        _adminConfigPreviewDirty = false;
        _adminConfigPreviewReason = '';
        if(callback) callback(_adminConfig);
        return;
      } catch(e){}
    }
    /* Fallback: direct JSON file for runtime preview/bootstrap only. This state
       is not publish/apply authority and must be surfaced by admin UI. */
    var xhr2 = new XMLHttpRequest();
    xhr2.open('GET', 'data/config/design-system-config.json', true);
    xhr2.onreadystatechange = function(){
      if(xhr2.readyState !== 4) return;
      try {
        _adminConfig = JSON.parse(xhr2.responseText) || (_adminConfig || {});
        _adminConfigVersion = String((_adminConfig && _adminConfig._meta && _adminConfig._meta.version) || '');
        _adminConfigEtag = '';
        _adminConfigAuthorityState = 'backend-unavailable-preview-only';
        _adminConfigPreviewDirty = false;
        _adminConfigPreviewReason = '';
      } catch(e){
        _adminConfig = _adminConfig || {};
        _adminConfigAuthorityState = 'backend-unavailable-preview-only';
        _adminConfigPreviewDirty = false;
        _adminConfigPreviewReason = '';
      }
      if(callback) callback(_adminConfig);
    };
    xhr2.send();
  };
  xhr.send();
}

function _loadPreviewPrefs(){
  if(!_previewPrefs) _previewPrefs = {};
  return _previewPrefs;
}

function _markPreviewDirty(reason){
  _adminConfigPreviewDirty = true;
  _adminConfigPreviewReason = reason || 'admin-preview-overrides';
  if(_adminConfigAuthorityState === 'backend-attested'){
    _adminConfigAuthorityState = 'preview-overridden';
  }
}

function _hasPreviewOverrides(){
  var prefs = _previewPrefs || {};
  return Object.keys(prefs).some(function(key){
    if(key === '_cssVarPreviewOverrides'){
      return Object.keys(prefs[key] || {}).length > 0;
    }
    return prefs[key] !== undefined && prefs[key] !== null && prefs[key] !== '';
  });
}

function _clearPreviewOverrideDirty(){
  if(_hasPreviewOverrides()) return;
  if(_adminConfigPreviewReason === 'admin-preview-overrides' || _adminConfigPreviewReason === 'inline-css-var-preview'){
    _adminConfigPreviewDirty = false;
    _adminConfigPreviewReason = '';
    if(_adminConfigAuthorityState === 'preview-overridden'){
      _adminConfigAuthorityState = (_adminConfigVersion || _adminConfigEtag) ? 'backend-attested' : 'unknown';
    }
  }
}

/* ── Resolve: preview → user → admin → default ──────────────────────────── */
function _resolve(key){
  var previewPrefs = _loadPreviewPrefs();
  if(previewPrefs[key] !== undefined && previewPrefs[key] !== null && previewPrefs[key] !== '') return previewPrefs[key];
  var userPrefs = _loadUserPrefs();
  if(userPrefs[key] !== undefined && userPrefs[key] !== null && userPrefs[key] !== '') return userPrefs[key];
  if(_adminConfig && _adminConfig[key] !== undefined) return _adminConfig[key];
  return DEFAULTS[key];
}

/** Deep resolve for nested keys like 'typography.heading.family' */
function _resolveDeep(path){
  var parts = path.split('.');
  var previewPrefs = _loadPreviewPrefs();
  var userPrefs = _loadUserPrefs();
  /* Check in-memory preview overrides first. These never write localStorage. */
  var val = previewPrefs;
  for(var p = 0; p < parts.length; p++){
    if(val && typeof val === 'object') val = val[parts[p]];
    else { val = undefined; break; }
  }
  if(val !== undefined && val !== null && val !== '') return val;
  /* Check user prefs */
  val = userPrefs;
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
  _setVarPx('--admin-gap-lg', cfg, 'layout.admin.gapLg');
  _setVarPx('--admin-gap-md', cfg, 'layout.admin.gapMd');
  _setVarPx('--admin-gap-sm', cfg, 'layout.admin.gapSm');
  _setVarPx('--admin-panel-padding', cfg, 'layout.admin.panelPadding');
  _setVarPx('--admin-card-padding', cfg, 'layout.admin.cardPadding');
  _setVarPx('--admin-row-padding', cfg, 'layout.admin.rowPadding');
  _setVarPx('--admin-panel-radius', cfg, 'layout.admin.panelRadius');
  _setVarPx('--admin-surface-radius', cfg, 'layout.admin.surfaceRadius');
  _setVarPx('--admin-nested-radius', cfg, 'layout.admin.nestedRadius');

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
  _setVarNumber('--ui-icon-leading-scale', cfg, 'components.icon.leadingScale');
  _setVarPx('--ui-icon-leading-edge-trim', cfg, 'components.icon.leadingEdgeTrim');
  _setVarNumber('--ui-icon-only-scale', cfg, 'components.icon.onlyScale');
  _setVarPx('--ui-icon-only-inset', cfg, 'components.icon.onlyInset');

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
  _setVarPx('--hds-tab-py', cfg, 'components.tab.paddingY');
  _setVarPx('--hds-tab-px', cfg, 'components.tab.paddingX');
  _setVarPx('--hds-tab-font', cfg, 'components.tab.fontSize');
  _setVarPx('--tab-border-width', cfg, 'components.tab.borderWidth');
  _setVarNumber('--tab-font-weight', cfg, 'components.tab.fontWeight');
  _setVarPx('--tab-gap', cfg, 'components.tab.gap');
  _setVarPx('--tab-radius', cfg, 'components.tab.radius');
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

  /* EQMS domain — lifecycle state colors */
  _setVar('--eqms-draft',       cfg, 'eqms.lifecycle.draft');
  _setVar('--eqms-open',        cfg, 'eqms.lifecycle.open');
  _setVar('--eqms-in-progress', cfg, 'eqms.lifecycle.inProgress');
  _setVar('--eqms-pending',     cfg, 'eqms.lifecycle.pending');
  _setVar('--eqms-approved',    cfg, 'eqms.lifecycle.approved');
  _setVar('--eqms-closed',      cfg, 'eqms.lifecycle.closed');
  _setVar('--eqms-voided',      cfg, 'eqms.lifecycle.voided');

  /* EQMS domain — risk heatmap cell bg+text pairs */
  _setVar('--eqms-heatmap-low-bg',        cfg, 'eqms.heatmap.lowBg');
  _setVar('--eqms-heatmap-low-text',      cfg, 'eqms.heatmap.lowText');
  _setVar('--eqms-heatmap-medium-bg',     cfg, 'eqms.heatmap.mediumBg');
  _setVar('--eqms-heatmap-medium-text',   cfg, 'eqms.heatmap.mediumText');
  _setVar('--eqms-heatmap-high-bg',       cfg, 'eqms.heatmap.highBg');
  _setVar('--eqms-heatmap-high-text',     cfg, 'eqms.heatmap.highText');
  _setVar('--eqms-heatmap-critical-bg',   cfg, 'eqms.heatmap.criticalBg');
  _setVar('--eqms-heatmap-critical-text', cfg, 'eqms.heatmap.criticalText');

  /* EQMS domain — badge state dark mode pairs */
  _setVar('--eqms-state-draft-bg-dark',      cfg, 'eqms.stateDark.draftBg');
  _setVar('--eqms-state-draft-text-dark',    cfg, 'eqms.stateDark.draftText');
  _setVar('--eqms-state-open-bg-dark',       cfg, 'eqms.stateDark.openBg');
  _setVar('--eqms-state-open-text-dark',     cfg, 'eqms.stateDark.openText');
  _setVar('--eqms-state-active-bg-dark',     cfg, 'eqms.stateDark.activeBg');
  _setVar('--eqms-state-active-text-dark',   cfg, 'eqms.stateDark.activeText');
  _setVar('--eqms-state-pending-bg-dark',    cfg, 'eqms.stateDark.pendingBg');
  _setVar('--eqms-state-pending-text-dark',  cfg, 'eqms.stateDark.pendingText');
  _setVar('--eqms-state-approved-bg-dark',   cfg, 'eqms.stateDark.approvedBg');
  _setVar('--eqms-state-approved-text-dark', cfg, 'eqms.stateDark.approvedText');
  _setVar('--eqms-state-voided-bg-dark',     cfg, 'eqms.stateDark.voidedBg');
  _setVar('--eqms-state-voided-text-dark',   cfg, 'eqms.stateDark.voidedText');

  /* EQMS domain — entity type colors (traceability graph canonical model) */
  _setVar('--eqms-entity-complaint',          cfg, 'eqms.entity.complaint');
  _setVar('--eqms-entity-deviation',          cfg, 'eqms.entity.deviation');
  _setVar('--eqms-entity-ncr',               cfg, 'eqms.entity.ncr');
  _setVar('--eqms-entity-mrb',               cfg, 'eqms.entity.mrb');
  _setVar('--eqms-entity-capa',              cfg, 'eqms.entity.capa');
  _setVar('--eqms-entity-change-control',    cfg, 'eqms.entity.changeControl');
  _setVar('--eqms-entity-eng-change',        cfg, 'eqms.entity.engChange');
  _setVar('--eqms-entity-document',          cfg, 'eqms.entity.document');
  _setVar('--eqms-entity-training',          cfg, 'eqms.entity.training');
  _setVar('--eqms-entity-competency',        cfg, 'eqms.entity.competency');
  _setVar('--eqms-entity-assessment',        cfg, 'eqms.entity.assessment');
  _setVar('--eqms-entity-audit',             cfg, 'eqms.entity.audit');
  _setVar('--eqms-entity-finding',           cfg, 'eqms.entity.finding');
  _setVar('--eqms-entity-supplier',          cfg, 'eqms.entity.supplier');
  _setVar('--eqms-entity-evaluation',        cfg, 'eqms.entity.evaluation');
  _setVar('--eqms-entity-scar',              cfg, 'eqms.entity.scar');
  _setVar('--eqms-entity-supplier-audit',    cfg, 'eqms.entity.supplierAudit');
  _setVar('--eqms-entity-quality-agreement', cfg, 'eqms.entity.qualityAgreement');
  _setVar('--eqms-entity-risk',              cfg, 'eqms.entity.risk');
  _setVar('--eqms-entity-fmea',              cfg, 'eqms.entity.fmea');
  _setVar('--eqms-entity-calibration',       cfg, 'eqms.entity.calibration');
  _setVar('--eqms-entity-msa',               cfg, 'eqms.entity.msa');
  _setVar('--eqms-entity-oos',               cfg, 'eqms.entity.oos');
  _setVar('--eqms-entity-iqc',               cfg, 'eqms.entity.iqc');
  _setVar('--eqms-entity-inspection-result', cfg, 'eqms.entity.inspectionResult');
  _setVar('--eqms-entity-spc',               cfg, 'eqms.entity.spc');
  _setVar('--eqms-entity-test-result',       cfg, 'eqms.entity.testResult');
  _setVar('--eqms-entity-lot-release',       cfg, 'eqms.entity.lotRelease');
  _setVar('--eqms-entity-validation',        cfg, 'eqms.entity.validation');
  _setVar('--eqms-entity-field-action',      cfg, 'eqms.entity.fieldAction');
  _setVar('--eqms-entity-concession',        cfg, 'eqms.entity.concession');
  _setVar('--eqms-entity-lesson-learned',    cfg, 'eqms.entity.lessonLearned');
  _setVar('--eqms-entity-csat',              cfg, 'eqms.entity.csat');
  _setVar('--eqms-entity-aml',               cfg, 'eqms.entity.aml');
  _setVar('--eqms-entity-sampling-plan',     cfg, 'eqms.entity.samplingPlan');
  _setVar('--eqms-entity-warranty',          cfg, 'eqms.entity.warranty');
  _setVar('--eqms-entity-special-char',      cfg, 'eqms.entity.specialChar');
  _setVar('--eqms-entity-fai',               cfg, 'eqms.entity.fai');
  _setVar('--eqms-entity-apqp',              cfg, 'eqms.entity.apqp');
  _setVar('--eqms-entity-evidence',          cfg, 'eqms.entity.evidence');
  _setVar('--eqms-entity-approval',          cfg, 'eqms.entity.approval');
  _setVar('--eqms-entity-signature',         cfg, 'eqms.entity.signature');
  _setVar('--eqms-entity-audit-event',       cfg, 'eqms.entity.auditEvent');
  _setVar('--eqms-entity-linked',            cfg, 'eqms.entity.linked');
  _setVar('--eqms-entity-task',              cfg, 'eqms.entity.task');
  _setVar('--eqms-entity-comment',           cfg, 'eqms.entity.comment');

  /* EQMS domain — traceability link type colors */
  _setVar('--eqms-link-caused-by',    cfg, 'eqms.link.causedBy');
  _setVar('--eqms-link-related-to',   cfg, 'eqms.link.relatedTo');
  _setVar('--eqms-link-requires',     cfg, 'eqms.link.requires');
  _setVar('--eqms-link-verifies',     cfg, 'eqms.link.verifies');
  _setVar('--eqms-link-trains',       cfg, 'eqms.link.trains');
  _setVar('--eqms-link-releases',     cfg, 'eqms.link.releases');
  _setVar('--eqms-link-sourced-from', cfg, 'eqms.link.sourcedFrom');
  _setVar('--eqms-link-supersedes',   cfg, 'eqms.link.supersedes');
  _setVar('--eqms-link-contains',     cfg, 'eqms.link.contains');
  _setVar('--eqms-link-implements',   cfg, 'eqms.link.implements');
  _setVar('--eqms-link-mitigates',    cfg, 'eqms.link.mitigates');

  /* EQMS domain — module shell layout dimensions */
  _setVarPx('--eqms-nav-width',      cfg, 'eqms.layout.navWidth');
  _setVarPx('--eqms-nav-collapsed',  cfg, 'eqms.layout.navCollapsed');
  _setVarPx('--eqms-header-height',  cfg, 'eqms.layout.headerHeight');
  _setVarPx('--eqms-detail-sidebar', cfg, 'eqms.layout.detailSidebar');
  _setVarPx('--eqms-filter-height',  cfg, 'eqms.layout.filterHeight');

  /* Custom CSS injection is emergency/exception-only. It remains under Admin
     config and must be accompanied by waiver/governance evidence before rollout. */
  var customCSS = _resolveDeep('advanced.customCSS');
  _applyCustomCSS(customCSS || '');

  var previewVars = (_loadPreviewPrefs() || {})._cssVarPreviewOverrides || {};
  Object.keys(_previewCssVarsApplied).forEach(function(varName){
    if(!Object.prototype.hasOwnProperty.call(previewVars, varName)){
      ROOT.style.removeProperty(varName);
      delete _previewCssVarsApplied[varName];
    }
  });
  Object.keys(previewVars).forEach(function(varName){
    if(/^--[A-Za-z0-9_-]+$/.test(varName)){
      ROOT.style.setProperty(varName, String(previewVars[varName]));
      _previewCssVarsApplied[varName] = true;
    }
  });
}

/** Merge admin + user into one config (user wins) */
function _mergedConfig(){
  var merged = {};
  _deepMerge(merged, _adminConfig || {});
  _deepMerge(merged, _loadUserPrefs() || {});
  _deepMerge(merged, _loadPreviewPrefs() || {});
  return merged;
}

function _stripInternalConfig(value){
  if(Array.isArray(value)){
    return value.map(_stripInternalConfig);
  }
  if(value && typeof value === 'object'){
    var out = {};
    Object.keys(value).forEach(function(key){
      if(key === '_meta' || key.charAt(0) === '_') return;
      out[key] = _stripInternalConfig(value[key]);
    });
    return out;
  }
  return value;
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

function _adminDraftConfig(){
  // Explicit save/export draft: backend admin config plus unsaved preview edits.
  // This is not production authority until the backend graphics authority accepts
  // it through saveAdminConfig(); user preferences and template preview caches
  // remain separate from template registry authority.
  var draft = {};
  _deepMerge(draft, _stripInternalConfig(_adminConfig || {}));
  _deepMerge(draft, _stripInternalConfig(_loadPreviewPrefs() || {}));
  return draft;
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
  _purgeForbiddenTemplateAuthorityKeys();
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

/** Persist a personal runtime preference only.
    This is not template/design authority and must not be used for governed
    registry, publish, compliance, waiver, or rollout state. */
function set(key, value){
  _loadUserPrefs();
  _userPrefs[key] = value;
  _saveUserPrefs();
  _apply();
}

  /** Legacy internal nested user-preference helper.
      This is intentionally not exported; Admin Appearance uses setPreviewDeep()
      and backend save/graphics-governance endpoints for controlled authority. */
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

/** Set a nested value for Admin preview only.
    This is the path used by Appearance/Template Studio editors. It updates the
    runtime token preview and getFullConfig(), but it does not persist to
    localStorage and does not become authority until saveAdminConfig() succeeds
    against backend Admin/graphics governance. */
function setPreviewDeep(path, value){
  var parts = path.split('.');
  var obj = _loadPreviewPrefs();
  for(var i = 0; i < parts.length - 1; i++){
    if(!obj[parts[i]] || typeof obj[parts[i]] !== 'object') obj[parts[i]] = {};
    obj = obj[parts[i]];
  }
  obj[parts[parts.length - 1]] = value;
  _markPreviewDirty('admin-preview-overrides');
  _apply();
}

function setPreviewAll(prefs){
  _deepMerge(_loadPreviewPrefs(), prefs || {});
  _markPreviewDirty('admin-preview-overrides');
  _apply();
}

function clearPreviewOverrides(){
  _previewPrefs = {};
  Object.keys(_previewCssVarsApplied).forEach(function(varName){
    ROOT.style.removeProperty(varName);
    delete _previewCssVarsApplied[varName];
  });
  _clearPreviewOverrideDirty();
  _apply();
}

  /** Set a CSS variable for real-time preview only.
      This records the override in the in-memory preview layer so authority
      state, release eligibility and clearPreviewOverrides stay deterministic. */
  function setPreviewVar(varName, value){
    if(!/^--[A-Za-z0-9_-]+$/.test(String(varName || ''))) return false;
    var prefs = _loadPreviewPrefs();
    prefs._cssVarPreviewOverrides = prefs._cssVarPreviewOverrides || {};
    if(value === undefined || value === null || value === '') delete prefs._cssVarPreviewOverrides[varName];
    else prefs._cssVarPreviewOverrides[varName] = value;
    if(_hasPreviewOverrides()) _markPreviewDirty('inline-css-var-preview');
    else _clearPreviewOverrideDirty();
    _apply();
    return true;
  }

/** Persist personal appearance preferences only; Admin authority saves must use
    saveAdminConfig()/graphics-governance backend endpoints. */
function setAll(prefs){
  _loadUserPrefs();
  _deepMerge(_userPrefs, prefs);
  _saveUserPrefs();
  _apply();
}

function reset(){
  _userPrefs = {};
  _saveUserPrefs();
  _previewPrefs = {};
  _previewCssVarsApplied = {};
  _clearPreviewOverrideDirty();
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

/** Get authoritative admin draft config (admin config + preview edits, no user prefs). */
function getAdminConfigDraft(){
  return _adminDraftConfig();
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

function getAdminConfigAuthority(){
  var releaseEligible = _adminConfigAuthorityState === 'backend-attested' && !_adminConfigPreviewDirty;
  return {
    authority: 'backend_admin_design_config',
    cacheKey: ADMIN_STORAGE_KEY,
    cacheRole: 'legacy-disabled',
    localStorageAuthority: false,
    authorityState: _adminConfigAuthorityState,
    releaseEligible: releaseEligible,
    previewDirty: _adminConfigPreviewDirty,
    previewReason: _adminConfigPreviewReason,
    version: _adminConfigVersion,
    etag: _adminConfigEtag
  };
}

function saveAdminConfig(config, callback){
  _adminConfig = config;
  _adminConfigAuthorityState = 'pending-backend-save';
  _adminConfigPreviewDirty = true;
  _adminConfigPreviewReason = 'backend-save-pending';
  var xhr = new XMLHttpRequest();
  xhr.open('POST', 'api.php?action=admin_design_config_save', true);
  xhr.setRequestHeader('Content-Type', 'application/json');
  if(_adminConfigEtag || _adminConfigVersion) xhr.setRequestHeader('If-Match', _adminConfigEtag || _adminConfigVersion);
  if(typeof csrfToken !== 'undefined' && csrfToken) xhr.setRequestHeader('X-CSRF-Token', csrfToken);
  xhr.onreadystatechange = function(){
    if(xhr.readyState !== 4) return;
    var ok = xhr.status >= 200 && xhr.status < 300;
    if(ok){
      try {
        var resp = JSON.parse(xhr.responseText);
        var nextConfig = resp && resp.config ? resp.config : (resp && resp.data ? resp.data : config);
        _adminConfig = nextConfig || config;
        _adminConfigVersion = String((resp && resp.version) || (_adminConfig && _adminConfig._meta && _adminConfig._meta.version) || _adminConfigVersion || '');
        _adminConfigEtag = String((resp && resp.etag) || _adminConfigEtag || '');
        _adminConfigAuthorityState = 'backend-attested';
        _adminConfigPreviewDirty = false;
        _adminConfigPreviewReason = '';
        _previewPrefs = {};
      } catch(e){}
    } else {
      _adminConfigAuthorityState = 'preview-unsaved';
      _adminConfigPreviewDirty = true;
      _adminConfigPreviewReason = 'backend-save-failed';
    }
    _apply();
    if(callback) callback(ok);
  };
  xhr.send(JSON.stringify({ config: config, expectedVersion: _adminConfigEtag || _adminConfigVersion || '' }));
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
  return JSON.stringify(_adminDraftConfig(), null, 2);
}

/** Import theme from JSON string */
function importTheme(jsonStr){
  try {
    var config = JSON.parse(jsonStr);
    _adminConfig = config;
    _adminConfigAuthorityState = 'preview-imported';
    _adminConfigPreviewDirty = true;
    _adminConfigPreviewReason = 'imported-theme-not-backend-attested';
    _apply();
    return true;
  } catch(e){ return false; }
}

var VISUAL_THEME_PRESETS = {
  'professional-light': {
    brandPrimary: '#1565c0',
    brandLight: '#60a5fa',
    brandDark: '#0c2d48',
    brandDarkest: '#07121f',
    accent: '#f9a825',
    accentLight: '#fcd34d',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#f1f5f9' },
    colorsDark: { bgPage: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  },
  'professional-dark': {
    brandPrimary: '#60a5fa',
    brandLight: '#93c5fd',
    brandDark: '#0c2d48',
    brandDarkest: '#050d1a',
    accent: '#f9a825',
    accentLight: '#fcd34d',
    colorsLight: { bgPage: '#eef4ff', bgSurface: '#ffffff', bgSurfaceAlt: '#dbeafe' },
    colorsDark: { bgPage: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155' },
    colorMode: 'dark'
  },
  'midnight-navy': {
    brandPrimary: '#0891b2',
    brandLight: '#67e8f9',
    brandDark: '#0f172a',
    brandDarkest: '#020617',
    accent: '#22d3ee',
    accentLight: '#a5f3fc',
    colorsLight: { bgPage: '#e0f2fe', bgSurface: '#f8fafc', bgSurfaceAlt: '#dbeafe' },
    colorsDark: { bgPage: '#020617', bgSurface: '#0f172a', bgSurfaceAlt: '#1e293b' },
    colorMode: 'dark'
  },
  'ocean-breeze': {
    brandPrimary: '#0ea5e9',
    brandLight: '#7dd3fc',
    brandDark: '#0369a1',
    brandDarkest: '#0c4a6e',
    accent: '#06b6d4',
    accentLight: '#67e8f9',
    colorsLight: { bgPage: '#f0f9ff', bgSurface: '#ffffff', bgSurfaceAlt: '#e0f2fe' },
    colorsDark: { bgPage: '#082f49', bgSurface: '#0c4a6e', bgSurfaceAlt: '#075985' },
    colorMode: 'light'
  },
  'forest-calm': {
    brandPrimary: '#22c55e',
    brandLight: '#86efac',
    brandDark: '#166534',
    brandDarkest: '#14532d',
    accent: '#84cc16',
    accentLight: '#bef264',
    colorsLight: { bgPage: '#f0fdf4', bgSurface: '#ffffff', bgSurfaceAlt: '#dcfce7' },
    colorsDark: { bgPage: '#052e16', bgSurface: '#14532d', bgSurfaceAlt: '#166534' },
    colorMode: 'light'
  },
  'sunrise-warm': {
    brandPrimary: '#b45309',
    brandLight: '#fbbf24',
    brandDark: '#7c2d12',
    brandDarkest: '#431407',
    accent: '#0f766e',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#fffbeb', bgSurface: '#ffffff', bgSurfaceAlt: '#fef3c7' },
    colorsDark: { bgPage: '#1c1917', bgSurface: '#292524', bgSurfaceAlt: '#44403c' },
    colorMode: 'light'
  },
  'sunset-ember': {
    brandPrimary: '#b91c1c',
    brandLight: '#f87171',
    brandDark: '#7f1d1d',
    brandDarkest: '#450a0a',
    accent: '#0e7490',
    accentLight: '#67e8f9',
    colorsLight: { bgPage: '#fff7ed', bgSurface: '#ffffff', bgSurfaceAlt: '#fee2e2' },
    colorsDark: { bgPage: '#1f1412', bgSurface: '#3f1d1d', bgSurfaceAlt: '#7f1d1d' },
    colorMode: 'light'
  },
  'arctic-snow': {
    brandPrimary: '#2563eb',
    brandLight: '#93c5fd',
    brandDark: '#1e3a8a',
    brandDarkest: '#172554',
    accent: '#0d9488',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e2e8f0' },
    colorsDark: { bgPage: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  },
  'cherry-blossom': {
    brandPrimary: '#be123c',
    brandLight: '#fb7185',
    brandDark: '#881337',
    brandDarkest: '#4c0519',
    accent: '#0f766e',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#fdf2f8', bgSurface: '#ffffff', bgSurfaceAlt: '#fce7f3' },
    colorsDark: { bgPage: '#2a0f1c', bgSurface: '#4c0519', bgSurfaceAlt: '#831843' },
    colorMode: 'light'
  },
  'lavender-dream': {
    brandPrimary: '#4f46e5',
    brandLight: '#818cf8',
    brandDark: '#3730a3',
    brandDarkest: '#1e1b4b',
    accent: '#0d9488',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e0e7ff' },
    colorsDark: { bgPage: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#312e81' },
    colorMode: 'light'
  },
  'industrial-steel': {
    brandPrimary: '#475569',
    brandLight: '#94a3b8',
    brandDark: '#334155',
    brandDarkest: '#0f172a',
    accent: '#ca8a04',
    accentLight: '#fde047',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e2e8f0' },
    colorsDark: { bgPage: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  },
  'shopfloor-signal': {
    brandPrimary: '#dc2626',
    brandLight: '#f87171',
    brandDark: '#991b1b',
    brandDarkest: '#450a0a',
    accent: '#16a34a',
    accentLight: '#86efac',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#f1f5f9' },
    colorsDark: { bgPage: '#18181b', bgSurface: '#27272a', bgSurfaceAlt: '#3f3f46' },
    colorMode: 'light'
  },
  'executive-glass': {
    brandPrimary: '#2563eb',
    brandLight: '#93c5fd',
    brandDark: '#1e3a8a',
    brandDarkest: '#172554',
    accent: '#0f766e',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#eef4ff', bgSurface: '#ffffff', bgSurfaceAlt: '#dbeafe' },
    colorsDark: { bgPage: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  },
  'compliance-paper': {
    brandPrimary: '#57534e',
    brandLight: '#a8a29e',
    brandDark: '#44403c',
    brandDarkest: '#1c1917',
    accent: '#0f766e',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#fafaf9', bgSurface: '#ffffff', bgSurfaceAlt: '#f5f5f4' },
    colorsDark: { bgPage: '#1c1917', bgSurface: '#292524', bgSurfaceAlt: '#44403c' },
    colorMode: 'light'
  },
  'focus-mode': {
    brandPrimary: '#27272a',
    brandLight: '#71717a',
    brandDark: '#18181b',
    brandDarkest: '#09090b',
    accent: '#0d9488',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#fafafa', bgSurface: '#ffffff', bgSurfaceAlt: '#f4f4f5' },
    colorsDark: { bgPage: '#09090b', bgSurface: '#18181b', bgSurfaceAlt: '#27272a' },
    colorMode: 'light'
  },
  'vibrant-energy': {
    brandPrimary: '#2563eb',
    brandLight: '#60a5fa',
    brandDark: '#1d4ed8',
    brandDarkest: '#172554',
    accent: '#f97316',
    accentLight: '#fdba74',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e0f2fe' },
    colorsDark: { bgPage: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  },
  'soft-pastel': {
    brandPrimary: '#4f46e5',
    brandLight: '#a5b4fc',
    brandDark: '#3730a3',
    brandDarkest: '#1e1b4b',
    accent: '#be123c',
    accentLight: '#fda4af',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#f1f5f9' },
    colorsDark: { bgPage: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#312e81' },
    colorMode: 'light'
  },
  'earth-tone': {
    brandPrimary: '#166534',
    brandLight: '#86efac',
    brandDark: '#365314',
    brandDarkest: '#1a2e05',
    accent: '#ca8a04',
    accentLight: '#fde047',
    colorsLight: { bgPage: '#f7fee7', bgSurface: '#ffffff', bgSurfaceAlt: '#ecfccb' },
    colorsDark: { bgPage: '#1a2e05', bgSurface: '#365314', bgSurfaceAlt: '#3f6212' },
    colorMode: 'light'
  },
  'neon-pulse': {
    brandPrimary: '#22c55e',
    brandLight: '#86efac',
    brandDark: '#15803d',
    brandDarkest: '#052e16',
    accent: '#06b6d4',
    accentLight: '#67e8f9',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#dcfce7' },
    colorsDark: { bgPage: '#09090b', bgSurface: '#18181b', bgSurfaceAlt: '#27272a' },
    colorMode: 'dark'
  },
  'zen-minimal': {
    brandPrimary: '#525252',
    brandLight: '#a3a3a3',
    brandDark: '#404040',
    brandDarkest: '#171717',
    accent: '#0d9488',
    accentLight: '#5eead4',
    colorsLight: { bgPage: '#fafafa', bgSurface: '#ffffff', bgSurfaceAlt: '#f5f5f5' },
    colorsDark: { bgPage: '#171717', bgSurface: '#262626', bgSurfaceAlt: '#404040' },
    colorMode: 'light'
  },
  'ember-industrial': {
    brandPrimary: '#f97316',
    brandLight: '#fdba74',
    brandDark: '#9a3412',
    brandDarkest: '#7c2d12',
    accent: '#facc15',
    accentLight: '#fde68a',
    colorsLight: { bgPage: '#fff7ed', bgSurface: '#ffffff', bgSurfaceAlt: '#ffedd5' },
    colorsDark: { bgPage: '#431407', bgSurface: '#7c2d12', bgSurfaceAlt: '#9a3412' },
    colorMode: 'light'
  },
  'graphite-amber': {
    brandPrimary: '#f59e0b',
    brandLight: '#fcd34d',
    brandDark: '#334155',
    brandDarkest: '#0f172a',
    accent: '#fbbf24',
    accentLight: '#fde68a',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e2e8f0' },
    colorsDark: { bgPage: '#111827', bgSurface: '#1f2937', bgSurfaceAlt: '#334155' },
    colorMode: 'dark'
  },
  'slate-ice': {
    brandPrimary: '#38bdf8',
    brandLight: '#bae6fd',
    brandDark: '#1e293b',
    brandDarkest: '#0f172a',
    accent: '#14b8a6',
    accentLight: '#99f6e4',
    colorsLight: { bgPage: '#f8fafc', bgSurface: '#ffffff', bgSurfaceAlt: '#e2e8f0' },
    colorsDark: { bgPage: '#0f172a', bgSurface: '#1e293b', bgSurfaceAlt: '#334155' },
    colorMode: 'light'
  }
};

var VISUAL_THEME_PRESET_ALIASES = {
  'hesem-enterprise': 'professional-light',
  'hesem-executive': 'executive-glass',
  'shopfloor-dark': 'shopfloor-signal',
  'quality-lab': 'compliance-paper',
  'maintenance-hub': 'industrial-steel',
  'warehouse-ops': 'slate-ice',
  'clean-room': 'compliance-paper'
};

function _resolveVisualThemePresetId(themeId){
  var requested = String(themeId || '');
  if(VISUAL_THEME_PRESETS[requested]) return requested;
  return VISUAL_THEME_PRESET_ALIASES[requested] || '';
}

function _cloneVisualThemePreset(themeId, resolvedId){
  var preset = VISUAL_THEME_PRESETS[resolvedId];
  if(!preset) return null;
  var clone = JSON.parse(JSON.stringify(preset));
  clone.id = themeId;
  clone.sourcePresetId = resolvedId;
  clone.aliasOf = resolvedId !== themeId ? resolvedId : '';
  clone.isAlias = resolvedId !== themeId;
  return clone;
}

function getTemplatePreviewCache(){
  return _loadTemplatePreviewCache();
}

function saveTemplatePreview(templateId, config){
  if(!templateId) return false;
  var templates = _loadTemplatePreviewCache();
  templates[String(templateId)] = config || {};
  _saveTemplatePreviewCache();
  _emit('template-preview-cache-change', { action: 'save', templateId: String(templateId), config: config || {} });
  return true;
}

function deleteTemplatePreview(templateId){
  if(!templateId) return false;
  var templates = _loadTemplatePreviewCache();
  delete templates[String(templateId)];
  _saveTemplatePreviewCache();
  _emit('template-preview-cache-change', { action: 'delete', templateId: String(templateId) });
  return true;
}

function resolveWithTemplate(templateId, options){
  var base = getFullConfig();
  if(!options || options.preview !== true){
    return base;
  }
  var templates = _loadTemplatePreviewCache();
  var tpl = templates[String(templateId || '')];
  if(!tpl || !tpl.tokenOverrides || typeof tpl.tokenOverrides !== 'object') return base;
  return _deepMerge(base, tpl.tokenOverrides);
}

/* Backward-compatible aliases. These expose preview cache only; they are not
   template registry authority. */
function getTemplates(){
  return getTemplatePreviewCache();
}

function saveTemplate(templateId, config){
  return saveTemplatePreview(templateId, config);
}

function deleteTemplate(templateId){
  return deleteTemplatePreview(templateId);
}

function getTemplateAuthorityStatus(){
  return {
    authority: 'backend_graphics_governance_template_registry',
    previewCacheKey: TEMPLATE_PREVIEW_CACHE_KEY,
    previewCacheRole: 'preview-only',
    localStorageAuthority: false,
    endpoints: window.HmGraphicsGovernance ? window.HmGraphicsGovernance.ENDPOINTS : null
  };
}

function graphicsAuthorityClient(){
  return window.HmGraphicsGovernance || null;
}

function getVisualThemePresets(){
  var out = {};
  Object.keys(VISUAL_THEME_PRESETS).forEach(function(key){
    out[key] = _cloneVisualThemePreset(key, key);
  });
  Object.keys(VISUAL_THEME_PRESET_ALIASES).forEach(function(key){
    var resolvedId = _resolveVisualThemePresetId(key);
    if(resolvedId) out[key] = _cloneVisualThemePreset(key, resolvedId);
  });
  return out;
}

function getVisualThemePresetIds(){
  return Object.keys(VISUAL_THEME_PRESETS).concat(Object.keys(VISUAL_THEME_PRESET_ALIASES));
}

function isVisualThemeRuntimeSupported(themeId){
  return _resolveVisualThemePresetId(themeId) !== '';
}

function getVisualThemeCatalogParity(){
  return {
    canonicalIds: Object.keys(VISUAL_THEME_PRESETS),
    aliasIds: Object.keys(VISUAL_THEME_PRESET_ALIASES),
    pairs: Object.keys(VISUAL_THEME_PRESET_ALIASES).map(function(aliasId){
      return { aliasId: aliasId, presetId: VISUAL_THEME_PRESET_ALIASES[aliasId] };
    })
  };
}

function applyVisualTheme(themeId){
  var requestedId = String(themeId || '');
  var resolvedId = _resolveVisualThemePresetId(requestedId);
  var theme = VISUAL_THEME_PRESETS[resolvedId];
  if(!theme) return false;
  var patch = {
    visualTheme: requestedId,
    visualThemeCanonical: resolvedId,
    visualThemeCatalogState: resolvedId !== requestedId ? 'alias' : 'canonical',
    colorMode: theme.colorMode || 'light',
    appearance: {
      visualThemePreset: requestedId,
      visualThemePresetCanonical: resolvedId,
      visualThemeCatalogState: resolvedId !== requestedId ? 'alias' : 'canonical'
    },
    brand: {
      primary: theme.brandPrimary,
      light: theme.brandLight || theme.brandPrimary,
      dark: theme.brandDark,
      darkest: theme.brandDarkest || theme.brandDark,
      accent: theme.accent,
      accentLight: theme.accentLight || theme.accent
    },
    colorsLight: {
      bgPage: theme.colorsLight.bgPage,
      bgSurface: theme.colorsLight.bgSurface,
      bgSurfaceAlt: theme.colorsLight.bgSurfaceAlt || theme.colorsLight.bgSurface,
      bgHeader: theme.colorsLight.bgHeader || theme.colorsLight.bgSurface,
      bgModal: theme.colorsLight.bgModal || theme.colorsLight.bgSurface,
      bgHover: theme.colorsLight.bgHover || theme.colorsLight.bgSurfaceAlt || theme.colorsLight.bgPage
    },
    colorsDark: {
      bgPage: theme.colorsDark.bgPage,
      bgSurface: theme.colorsDark.bgSurface,
      bgSurfaceAlt: theme.colorsDark.bgSurfaceAlt || theme.colorsDark.bgSurface,
      bgHeader: theme.colorsDark.bgHeader || theme.colorsDark.bgSurface,
      bgModal: theme.colorsDark.bgModal || theme.colorsDark.bgSurface,
      bgHover: theme.colorsDark.bgHover || theme.colorsDark.bgSurfaceAlt || theme.colorsDark.bgPage
    }
  };
  setPreviewAll(patch);
  _emit('theme-preset', { themeId: requestedId, resolvedThemeId: resolvedId, patch: patch });
  return true;
}

/* ── EXPOSE ────────────────────────────────────────────────────────────── */
window.HmTheme = {
  init: init,
	  get: get,
	  getDeep: getDeep,
	  set: set,
	  setUserPreference: set,
	  setPreviewDeep: setPreviewDeep,
	  setPreviewAll: setPreviewAll,
	  setPreviewVar: setPreviewVar,
	  clearPreviewOverrides: clearPreviewOverrides,
	  setAll: setAll,
	  setAllUserPreferences: setAll,
  getAll: getAll,
  getFullConfig: getFullConfig,
  getAdminConfigDraft: getAdminConfigDraft,
  reset: reset,
  on: on,
  off: off,
  isDark: isDark,
  getAdminConfig: getAdminConfig,
  getAdminConfigAuthority: getAdminConfigAuthority,
  saveAdminConfig: saveAdminConfig,
  contrastRatio: contrastRatio,
  exportTheme: exportTheme,
  importTheme: importTheme,
  getTemplatePreviewCache: getTemplatePreviewCache,
  saveTemplatePreview: saveTemplatePreview,
  deleteTemplatePreview: deleteTemplatePreview,
  getTemplates: getTemplates,
  saveTemplate: saveTemplate,
  deleteTemplate: deleteTemplate,
  getTemplateAuthorityStatus: getTemplateAuthorityStatus,
	  graphicsAuthorityClient: graphicsAuthorityClient,
	  resolveWithTemplate: resolveWithTemplate,
	  getVisualThemePresets: getVisualThemePresets,
	  getVisualThemePresetIds: getVisualThemePresetIds,
  isVisualThemeRuntimeSupported: isVisualThemeRuntimeSupported,
  getVisualThemeCatalogParity: getVisualThemeCatalogParity,
	  applyVisualTheme: applyVisualTheme,
  DEFAULTS: DEFAULTS
};

})();
