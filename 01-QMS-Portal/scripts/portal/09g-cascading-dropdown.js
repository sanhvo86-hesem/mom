/* ===================================================================
   09g-cascading-dropdown.js -- Reusable Cascading Dropdown Engine
   HESEM QMS Portal -- Multi-level dependent filter system
   Used by Tab 2 (Fill/Download) and Tab 3 (ID Generator)
   =================================================================== */

(function(){
'use strict';

// ── Helpers ──
function _t(vi, en){
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function _uid(){
  return 'cd-' + Math.random().toString(36).substr(2, 9);
}

function _escHtml(str){
  var d = document.createElement('div');
  d.appendChild(document.createTextNode(str || ''));
  return d.innerHTML;
}

// ===================================================================
// CascadingDropdown Class
// ===================================================================
//
// Usage:
//   var cd = new CascadingDropdown({
//     containerId: 'my-container',
//     levels: [
//       { key: 'department', label: 'Phong ban', labelEn: 'Department',
//         dataSource: 'static', options: [{value:'QC', label:'QC', labelEn:'QC'}, ...] },
//       { key: 'type', label: 'Loai', labelEn: 'Type',
//         dataSource: 'dependent', dependsOn: 'department',
//         resolver: function(selections){ return [...]; } },
//       { key: 'form', label: 'Bieu mau', labelEn: 'Form',
//         dataSource: 'api', apiAction: 'form_list_by_type',
//         paramBuilder: function(selections){ return {type: selections.type}; } }
//     ],
//     onChange: function(selections){ ... },
//     lang: 'vi',
//     showResetButton: true,
//     placeholderPrefix: '-- '
//   });
//   cd.render();
//
// ===================================================================

function CascadingDropdown(config){
  if(!config || !config.containerId || !config.levels){
    throw new Error('CascadingDropdown: containerId and levels are required');
  }

  this._containerId = config.containerId;
  this._levels = config.levels;
  this._onChange = config.onChange || null;
  this._lang = config.lang || (typeof lang !== 'undefined' ? lang : 'vi');
  this._showReset = config.showResetButton !== false;
  this._placeholderPrefix = config.placeholderPrefix || '-- ';
  this._className = config.className || '';

  // Internal state
  this._id = _uid();
  this._selections = {};
  this._optionsCache = {};
  this._loadingLevels = {};
  this._disabled = false;
  this._rendered = false;
  this._abortControllers = {};

  // Initialize selections to empty
  for(var i = 0; i < this._levels.length; i++){
    this._selections[this._levels[i].key] = '';
  }
}

// ── Render ──

CascadingDropdown.prototype.render = function(){
  var container = document.getElementById(this._containerId);
  if(!container) return;

  var h = '';
  h += '<div class="cd-bar ' + _escHtml(this._className) + '" id="' + this._id + '" role="group" ';
  h += 'aria-label="' + _t('Bo loc tung cap', 'Cascading filter') + '">';

  for(var i = 0; i < this._levels.length; i++){
    h += this._renderLevel(this._levels[i], i);
  }

  if(this._showReset){
    h += '<button type="button" class="cd-reset-btn" id="' + this._id + '-reset" ';
    h += 'title="' + _t('Dat lai', 'Reset') + '" aria-label="' + _t('Dat lai tat ca', 'Reset all') + '">';
    h += '<svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 1 1 .908-.418A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>';
    h += '</button>';
  }

  h += '</div>';
  container.innerHTML = h;

  this._bindEvents();
  this._rendered = true;

  // Initialize first static levels
  for(var j = 0; j < this._levels.length; j++){
    var lv = this._levels[j];
    if(lv.dataSource === 'static' && lv.options){
      this._optionsCache[lv.key] = lv.options;
      this._populateSelect(lv.key, lv.options);
    } else if(lv.dataSource !== 'static'){
      // Dependent and API levels start disabled until parent is selected
      this._setLevelDisabled(lv.key, true);
    }
  }
};

CascadingDropdown.prototype._renderLevel = function(level, index){
  var selectId = this._id + '-sel-' + level.key;
  var labelText = this._lang === 'en' ? (level.labelEn || level.label) : level.label;

  var h = '';
  h += '<div class="cd-level" data-cd-level="' + _escHtml(level.key) + '" data-cd-index="' + index + '">';
  h += '<label class="cd-label" for="' + selectId + '">' + _escHtml(labelText) + '</label>';
  h += '<div class="cd-select-wrap">';
  h += '<select id="' + selectId + '" class="cd-select" data-cd-key="' + _escHtml(level.key) + '" ';
  h += 'aria-label="' + _escHtml(labelText) + '">';
  h += '<option value="">' + this._placeholderPrefix + _escHtml(labelText) + '</option>';
  h += '</select>';
  h += '<div class="cd-spinner" id="' + this._id + '-spin-' + level.key + '" style="display:none">';
  h += '<div class="cd-spinner-dot"></div></div>';
  h += '</div>';
  h += '</div>';

  return h;
};

// ── Event Binding ──

CascadingDropdown.prototype._bindEvents = function(){
  var self = this;
  var bar = document.getElementById(this._id);
  if(!bar) return;

  // Delegate change events on selects
  bar.addEventListener('change', function(e){
    var sel = e.target;
    if(!sel.classList.contains('cd-select')) return;
    var key = sel.getAttribute('data-cd-key');
    if(key) self._onLevelChange(key, sel.value);
  });

  // Keyboard: escape closes focus, arrow keys for navigation
  bar.addEventListener('keydown', function(e){
    var sel = e.target;
    if(!sel.classList.contains('cd-select')) return;

    if(e.key === 'Escape'){
      sel.blur();
      e.preventDefault();
    } else if(e.key === 'ArrowRight' || (e.key === 'Tab' && !e.shiftKey)){
      var key = sel.getAttribute('data-cd-key');
      var idx = self._getLevelIndex(key);
      if(idx < self._levels.length - 1 && e.key === 'ArrowRight'){
        var nextSel = bar.querySelector('[data-cd-key="' + self._levels[idx + 1].key + '"]');
        if(nextSel && !nextSel.disabled){
          nextSel.focus();
          e.preventDefault();
        }
      }
    } else if(e.key === 'ArrowLeft'){
      var key2 = sel.getAttribute('data-cd-key');
      var idx2 = self._getLevelIndex(key2);
      if(idx2 > 0){
        var prevSel = bar.querySelector('[data-cd-key="' + self._levels[idx2 - 1].key + '"]');
        if(prevSel && !prevSel.disabled){
          prevSel.focus();
          e.preventDefault();
        }
      }
    }
  });

  // Reset button
  if(this._showReset){
    var resetBtn = document.getElementById(this._id + '-reset');
    if(resetBtn){
      resetBtn.addEventListener('click', function(){
        self.reset();
      });
    }
  }
};

// ── Level Change Handler ──

CascadingDropdown.prototype._onLevelChange = function(levelKey, value){
  var oldValue = this._selections[levelKey];
  this._selections[levelKey] = value;

  var index = this._getLevelIndex(levelKey);
  if(index < 0) return;

  // Reset all downstream levels
  this._resetDownstream(index);

  // If a value was selected, resolve the next level's options
  if(value && index < this._levels.length - 1){
    var nextLevel = this._levels[index + 1];
    this._resolveAndPopulate(nextLevel);
  }

  // Animate the transition
  this._animateLevel(levelKey);

  // Emit change
  if(this._onChange){
    this._onChange(this.getSelections(), levelKey, value);
  }
};

// ── Resolve Options ──

CascadingDropdown.prototype._resolveAndPopulate = function(level){
  var self = this;
  var selections = this.getSelections();

  // Check if this level depends on a parent that has no value
  if(level.dependsOn && !selections[level.dependsOn]){
    this._setLevelDisabled(level.key, true);
    return;
  }

  if(level.dataSource === 'static'){
    var opts = level.options || [];
    self._optionsCache[level.key] = opts;
    self._populateSelect(level.key, opts);
    self._setLevelDisabled(level.key, false);

  } else if(level.dataSource === 'dependent'){
    this._setLevelLoading(level.key, true);
    try {
      var resolved = level.resolver ? level.resolver(selections) : [];
      // Support both sync and promise-based resolvers
      if(resolved && typeof resolved.then === 'function'){
        resolved.then(function(opts){
          self._optionsCache[level.key] = opts || [];
          self._populateSelect(level.key, opts || []);
          self._setLevelDisabled(level.key, false);
          self._setLevelLoading(level.key, false);
        }).catch(function(){
          self._populateSelect(level.key, []);
          self._setLevelDisabled(level.key, true);
          self._setLevelLoading(level.key, false);
        });
      } else {
        self._optionsCache[level.key] = resolved || [];
        self._populateSelect(level.key, resolved || []);
        self._setLevelDisabled(level.key, false);
        self._setLevelLoading(level.key, false);
      }
    } catch(e){
      self._populateSelect(level.key, []);
      self._setLevelDisabled(level.key, true);
      self._setLevelLoading(level.key, false);
    }

  } else if(level.dataSource === 'api'){
    this._fetchApiOptions(level, selections);
  }
};

CascadingDropdown.prototype._fetchApiOptions = function(level, selections){
  var self = this;
  var action = level.apiAction;
  var params = level.paramBuilder ? level.paramBuilder(selections) : {};

  // Abort any existing request for this level
  if(this._abortControllers[level.key]){
    try { this._abortControllers[level.key].abort(); } catch(e){}
  }

  this._setLevelLoading(level.key, true);
  this._setLevelDisabled(level.key, true);

  // Use apiCall if available, else direct fetch
  if(typeof apiCall === 'function'){
    apiCall(action, params, 'POST', 30000).then(function(data){
      var opts = self._parseApiResponse(data, level);
      self._optionsCache[level.key] = opts;
      self._populateSelect(level.key, opts);
      self._setLevelDisabled(level.key, false);
      self._setLevelLoading(level.key, false);
    }).catch(function(){
      self._populateSelect(level.key, []);
      self._setLevelLoading(level.key, false);
    });
  } else {
    var url = 'api.php?action=' + encodeURIComponent(action);
    var controller = (typeof AbortController !== 'undefined') ? new AbortController() : null;
    this._abortControllers[level.key] = controller;

    var fetchOpts = {
      method: 'POST',
      credentials: 'include',
      headers: {'Content-Type': 'application/json'}
    };
    if(controller) fetchOpts.signal = controller.signal;
    if(typeof csrfToken !== 'undefined' && csrfToken){
      fetchOpts.headers['X-CSRF-Token'] = csrfToken;
    }
    fetchOpts.body = JSON.stringify(params);

    fetch(url, fetchOpts).then(function(res){ return res.json(); }).then(function(data){
      var opts = self._parseApiResponse(data, level);
      self._optionsCache[level.key] = opts;
      self._populateSelect(level.key, opts);
      self._setLevelDisabled(level.key, false);
      self._setLevelLoading(level.key, false);
      delete self._abortControllers[level.key];
    }).catch(function(err){
      if(err && err.name === 'AbortError') return;
      self._populateSelect(level.key, []);
      self._setLevelLoading(level.key, false);
      delete self._abortControllers[level.key];
    });
  }
};

CascadingDropdown.prototype._parseApiResponse = function(data, level){
  if(!data) return [];
  // Custom parser
  if(level.responseParser) return level.responseParser(data);
  // Standard format: { ok: true, data: [{value, label, labelEn}, ...] }
  if(data.ok && Array.isArray(data.data)) return data.data;
  if(Array.isArray(data)) return data;
  if(data.options && Array.isArray(data.options)) return data.options;
  return [];
};

// ── DOM Manipulation ──

CascadingDropdown.prototype._populateSelect = function(levelKey, options){
  var sel = this._getSelectEl(levelKey);
  if(!sel) return;

  var level = this._getLevelByKey(levelKey);
  var labelText = level ? (this._lang === 'en' ? (level.labelEn || level.label) : level.label) : levelKey;

  // Preserve current value if it still exists in new options
  var currentVal = sel.value;

  var h = '<option value="">' + this._placeholderPrefix + _escHtml(labelText) + '</option>';
  for(var i = 0; i < options.length; i++){
    var opt = options[i];
    var val = typeof opt === 'string' ? opt : (opt.value || '');
    var lbl = typeof opt === 'string' ? opt :
              (this._lang === 'en' ? (opt.labelEn || opt.label || val) : (opt.label || val));
    var disabled = opt.disabled ? ' disabled' : '';
    var group = opt.group ? ' data-group="' + _escHtml(opt.group) + '"' : '';
    h += '<option value="' + _escHtml(val) + '"' + disabled + group + '>' + _escHtml(lbl) + '</option>';
  }
  sel.innerHTML = h;

  // Restore value if still valid
  var found = false;
  if(currentVal){
    for(var j = 0; j < options.length; j++){
      var v = typeof options[j] === 'string' ? options[j] : (options[j].value || '');
      if(v === currentVal){ found = true; break; }
    }
  }
  sel.value = found ? currentVal : '';
  this._selections[levelKey] = sel.value;
};

CascadingDropdown.prototype._setLevelDisabled = function(levelKey, disabled){
  var sel = this._getSelectEl(levelKey);
  if(!sel) return;
  sel.disabled = disabled;
  var wrap = sel.closest('.cd-level');
  if(wrap){
    if(disabled) wrap.classList.add('cd-level-disabled');
    else wrap.classList.remove('cd-level-disabled');
  }
};

CascadingDropdown.prototype._setLevelLoading = function(levelKey, loading){
  this._loadingLevels[levelKey] = loading;
  var spinner = document.getElementById(this._id + '-spin-' + levelKey);
  if(spinner){
    spinner.style.display = loading ? 'flex' : 'none';
  }
  var sel = this._getSelectEl(levelKey);
  if(sel){
    if(loading) sel.classList.add('cd-select-loading');
    else sel.classList.remove('cd-select-loading');
  }
};

CascadingDropdown.prototype._animateLevel = function(levelKey){
  var sel = this._getSelectEl(levelKey);
  if(!sel) return;
  var wrap = sel.closest('.cd-level');
  if(!wrap) return;
  wrap.classList.remove('cd-level-flash');
  // Force reflow then add animation class
  void wrap.offsetWidth;
  wrap.classList.add('cd-level-flash');
  setTimeout(function(){ wrap.classList.remove('cd-level-flash'); }, 300);
};

// ── Reset ──

CascadingDropdown.prototype._resetDownstream = function(fromIndex){
  for(var i = fromIndex + 1; i < this._levels.length; i++){
    var lv = this._levels[i];
    this._selections[lv.key] = '';
    this._optionsCache[lv.key] = [];
    this._populateSelect(lv.key, []);
    this._setLevelDisabled(lv.key, true);
    this._setLevelLoading(lv.key, false);

    // Abort any pending API call
    if(this._abortControllers[lv.key]){
      try { this._abortControllers[lv.key].abort(); } catch(e){}
      delete this._abortControllers[lv.key];
    }
  }
};

CascadingDropdown.prototype.reset = function(){
  for(var i = 0; i < this._levels.length; i++){
    var lv = this._levels[i];
    this._selections[lv.key] = '';

    if(lv.dataSource === 'static' && lv.options){
      this._populateSelect(lv.key, lv.options);
      this._setLevelDisabled(lv.key, false);
    } else {
      this._populateSelect(lv.key, []);
      this._setLevelDisabled(lv.key, true);
    }
    this._setLevelLoading(lv.key, false);
  }

  if(this._onChange){
    this._onChange(this.getSelections(), null, null);
  }
};

// ── Public API ──

CascadingDropdown.prototype.getSelections = function(){
  var result = {};
  for(var i = 0; i < this._levels.length; i++){
    result[this._levels[i].key] = this._selections[this._levels[i].key] || '';
  }
  return result;
};

CascadingDropdown.prototype.setSelections = function(selections){
  if(!selections) return;
  var self = this;
  var keys = Object.keys(selections);

  // Apply values sequentially to trigger cascading
  function applyNext(idx){
    if(idx >= keys.length) return;
    var key = keys[idx];
    var val = selections[key];
    if(!val){ applyNext(idx + 1); return; }

    var sel = self._getSelectEl(key);
    if(!sel){ applyNext(idx + 1); return; }

    // Wait for options to be available (for dependent levels)
    var attempts = 0;
    function trySet(){
      if(sel.querySelector('option[value="' + val + '"]')){
        sel.value = val;
        self._selections[key] = val;

        // Trigger downstream resolution
        var index = self._getLevelIndex(key);
        if(index >= 0 && index < self._levels.length - 1){
          var nextLevel = self._levels[index + 1];
          self._resolveAndPopulate(nextLevel);
        }

        // Small delay to let async resolution complete
        setTimeout(function(){ applyNext(idx + 1); }, 50);
      } else if(attempts < 20){
        attempts++;
        setTimeout(trySet, 50);
      } else {
        applyNext(idx + 1);
      }
    }
    trySet();
  }

  applyNext(0);
};

CascadingDropdown.prototype.setLang = function(newLang){
  this._lang = newLang;
  // Re-render labels and option text
  if(this._rendered){
    for(var i = 0; i < this._levels.length; i++){
      var lv = this._levels[i];
      var labelText = newLang === 'en' ? (lv.labelEn || lv.label) : lv.label;

      // Update label
      var sel = this._getSelectEl(lv.key);
      if(sel){
        var label = sel.closest('.cd-level').querySelector('.cd-label');
        if(label) label.textContent = labelText;
      }

      // Re-populate with cached options to update labels
      if(this._optionsCache[lv.key]){
        this._populateSelect(lv.key, this._optionsCache[lv.key]);
      }
    }
  }
};

CascadingDropdown.prototype.disable = function(){
  this._disabled = true;
  for(var i = 0; i < this._levels.length; i++){
    this._setLevelDisabled(this._levels[i].key, true);
  }
};

CascadingDropdown.prototype.enable = function(){
  this._disabled = false;
  for(var i = 0; i < this._levels.length; i++){
    var lv = this._levels[i];
    if(lv.dataSource === 'static'){
      this._setLevelDisabled(lv.key, false);
    } else if(i > 0){
      var parentKey = this._levels[i - 1].key;
      this._setLevelDisabled(lv.key, !this._selections[parentKey]);
    }
  }
};

CascadingDropdown.prototype.getOptionsForLevel = function(levelKey){
  return this._optionsCache[levelKey] || [];
};

CascadingDropdown.prototype.isLoading = function(){
  for(var k in this._loadingLevels){
    if(this._loadingLevels[k]) return true;
  }
  return false;
};

CascadingDropdown.prototype.destroy = function(){
  // Abort all pending API calls
  for(var k in this._abortControllers){
    try { this._abortControllers[k].abort(); } catch(e){}
  }
  this._abortControllers = {};

  // Clear DOM
  var container = document.getElementById(this._containerId);
  if(container) container.innerHTML = '';

  this._rendered = false;
  this._selections = {};
  this._optionsCache = {};
  this._loadingLevels = {};
};

// ── Internal Helpers ──

CascadingDropdown.prototype._getSelectEl = function(levelKey){
  return document.getElementById(this._id + '-sel-' + levelKey);
};

CascadingDropdown.prototype._getLevelIndex = function(levelKey){
  for(var i = 0; i < this._levels.length; i++){
    if(this._levels[i].key === levelKey) return i;
  }
  return -1;
};

CascadingDropdown.prototype._getLevelByKey = function(levelKey){
  for(var i = 0; i < this._levels.length; i++){
    if(this._levels[i].key === levelKey) return this._levels[i];
  }
  return null;
};

// ── Export ──
window.CascadingDropdown = CascadingDropdown;

})();
