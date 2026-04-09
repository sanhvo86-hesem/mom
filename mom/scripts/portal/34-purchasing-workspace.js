/* Purchasing Workspace */
(function(){
'use strict';

var MODULE_ID = 'M4-purchasing';
var SCHEMA_URL = './data/modules/M4-purchasing.json?v=20260409a';
var _schemaPromise = null;

function _clone(value){
  return JSON.parse(JSON.stringify(value));
}

function _loadingHtml(){
  return '<div style="padding:24px;display:grid;gap:12px"><div class="hm-skeleton"><div class="hm-skeleton-line"></div><div class="hm-skeleton-line"></div><div class="hm-skeleton-line hm-skeleton-short"></div></div></div>';
}

function _errorHtml(message){
  return '<div style="padding:24px"><div class="hm-empty">' + String(message || 'Unable to load Purchasing workspace.') + '</div></div>';
}

function _loadSchema(){
  if(_schemaPromise) return _schemaPromise;
  _schemaPromise = fetch(SCHEMA_URL, { credentials:'same-origin', cache:'no-store' }).then(function(res){
    if(!res.ok) throw new Error('schema_fetch_failed');
    return res.json();
  });
  return _schemaPromise;
}

function _nextContext(explicitCtx){
  var queued = window.__hmPurchasingContext || null;
  window.__hmPurchasingContext = null;
  return explicitCtx && typeof explicitCtx === 'object' ? explicitCtx : (queued && typeof queued === 'object' ? queued : {});
}

function _mergeContext(ms, ctx){
  if(!ms.customState || typeof ms.customState !== 'object') ms.customState = {};
  Object.keys(ctx || {}).forEach(function(key){
    var value = ctx[key];
    if(value === undefined || value === null || value === '') return;
    ms.customState[key] = value;
  });
  if(ctx && ctx.targetTab) ms.activeTab = String(ctx.targetTab);
  if(!ms.activeTab) ms.activeTab = 'overview';
}

function _render(container, ctx){
  var BE = window.HmBlockEngine;
  if(!container) return Promise.resolve(false);
  if(!BE || typeof BE.renderModuleFromSchema !== 'function' || typeof BE.getModuleState !== 'function'){
    container.innerHTML = _errorHtml('Purchasing runtime is unavailable.');
    return Promise.resolve(false);
  }

  container.innerHTML = _loadingHtml();
  return _loadSchema().then(function(schema){
    var runtimeSchema = _clone(schema || {});
    var ms = BE.getModuleState(MODULE_ID);
    ms._schema = runtimeSchema;
    _mergeContext(ms, _nextContext(ctx));
    BE.renderModuleFromSchema(container, runtimeSchema);
    return true;
  }).catch(function(err){
    console.warn('[PurchasingWorkspace] render failed', err);
    container.innerHTML = _errorHtml('Unable to load Purchasing workspace.');
    return false;
  });
}

window._renderPurchasingWorkspace = function(container, ctx){
  return _render(container, ctx);
};

window._openPurchasingWorkspace = function(ctx){
  window.__hmPurchasingContext = ctx && typeof ctx === 'object' ? ctx : {};
  if(typeof navigateTo === 'function'){
    navigateTo('purchasing');
    return true;
  }
  return false;
};

})();
