/* ==========================================================================
   09f-form-builder-engine.js - Form Builder foundation
   ========================================================================== */

(function(){
'use strict';

var STORE = { states:{}, drag:null, hotkeys:false };
var PALETTE = [
  { type:'text', group:'input', icon:'TX', label:'Text', desc:'Single line' },
  { type:'number', group:'input', icon:'#', label:'Number', desc:'Numeric value' },
  { type:'date', group:'input', icon:'DT', label:'Date', desc:'Calendar input' },
  { type:'time', group:'input', icon:'TM', label:'Time', desc:'Time input' },
  { type:'textarea', group:'input', icon:'TA', label:'Textarea', desc:'Multi-line text' },
  { type:'select', group:'choice', icon:'SL', label:'Select', desc:'Single choice' },
  { type:'multi_select', group:'choice', icon:'MS', label:'Multi Select', desc:'Multiple choices' },
  { type:'checkbox', group:'choice', icon:'CK', label:'Checkbox', desc:'True / false' },
  { type:'lookup', group:'advanced', icon:'LK', label:'Lookup', desc:'Master-data search' },
  { type:'file', group:'advanced', icon:'UP', label:'File', desc:'Attachment' },
  { type:'signature', group:'advanced', icon:'SG', label:'Signature', desc:'Approval block' },
  { type:'table', group:'advanced', icon:'TB', label:'Table', desc:'Grid input' },
  { type:'calculated', group:'advanced', icon:'FX', label:'Calculated', desc:'Formula output' },
  { type:'heading', group:'layout', icon:'HD', label:'Heading', desc:'Visual divider' },
  { type:'hidden', group:'layout', icon:'HI', label:'Hidden', desc:'Hidden value' },
  { type:'section', group:'layout', icon:'SC', label:'Section', desc:'Field group' },
  { type:'two_column', group:'layout', icon:'2C', label:'2-Column', desc:'Two-column grid' },
  { type:'panel', group:'layout', icon:'PN', label:'Panel', desc:'Collapsible panel' },
  /* Composite blocks — pre-built field groups from form_template_blocks.json */
  { type:'record_strip', group:'composite', icon:'RS', label:'Record Strip', desc:'Record summary header' },
  { type:'approval_block', group:'composite', icon:'AP', label:'Approval Block', desc:'Prepared + approved by' },
  { type:'root_cause_block', group:'composite', icon:'RC', label:'Root Cause', desc:'Root cause analysis' },
  { type:'corrective_action_block', group:'composite', icon:'CA', label:'Corrective Action', desc:'Action + verification' },
  /* Data-linked blocks — bind to registry/master data */
  { type:'registry_select', group:'data', icon:'RS', label:'Registry Select', desc:'Options from registry' },
  { type:'registry_lookup', group:'data', icon:'RL', label:'Registry Lookup', desc:'Master data search' },
  { type:'data_panel', group:'data', icon:'DP', label:'Data Panel', desc:'Registry data display' },
  { type:'formula', group:'data', icon:'FX', label:'Formula', desc:'Calculated with preview' }
];

var GROUPS = {
  input: 'Inputs',
  choice: 'Choices',
  advanced: 'Advanced',
  layout: 'Layout',
  composite: 'Composite',
  data: 'Data'
};

var WIDTHS = ['full', 'half', 'third', 'two-thirds', 'quarter'];

function t(vi, en){
  if(typeof window._fhT === 'function') return window._fhT(vi, en);
  return (typeof lang !== 'undefined' && lang === 'en') ? en : vi;
}

function esc(v){
  var div = document.createElement('div');
  div.appendChild(document.createTextNode(String(v == null ? '' : v)));
  return div.innerHTML;
}

function clone(v){ return JSON.parse(JSON.stringify(v)); }
function text(v){ return String(v == null ? '' : v).trim(); }
function slug(v){ return text(v).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '') || 'item'; }
function draftKey(code){ return 'hesem:builder:' + String(code || '').toUpperCase(); }
function toast(msg, type){ if(typeof window._fhShowToast === 'function') window._fhShowToast(msg, type || 'info'); }

function readDraft(code){
  try{ var raw = localStorage.getItem(draftKey(code)); return raw ? JSON.parse(raw) : null; }catch(err){ return null; }
}

function saveDraft(code, schema){
  var stamp = new Date().toISOString();
  localStorage.setItem(draftKey(code), JSON.stringify({ saved_at: stamp, schema: schema }));
  return stamp;
}

function clearDraft(code){
  try{ localStorage.removeItem(draftKey(code)); }catch(err){}
}

function emptySchema(form){
  return {
    form_code: form.form_code || '',
    title: form.title || 'Untitled Form',
    title_vi: form.title_vi || '',
    version: form.version || 'V1.0',
    category: form.category || 'other',
    sop_ref: form.sop_ref || '',
    description: form.description || '',
    description_vi: form.description_vi || '',
    online: true,
    delivery_mode: 'online',
    sections: [{ id:'general', title:'General', title_vi:'Thong tin chung', description:'', description_vi:'', field_ids:[] }],
    fields: [],
    signature_blocks: [],
    approval_flow: []
  };
}

function byId(list, id){ return (list || []).find(function(item){ return String(item.id || '') === String(id || ''); }) || null; }
function field(schema, id){ return byId(schema.fields, id); }
function section(schema, id){ return byId(schema.sections, id); }
function sectionForField(schema, id){
  return (schema.sections || []).find(function(sec){ return (sec.field_ids || []).indexOf(String(id || '')) >= 0; }) || null;
}

function nextId(schema, base, type){
  var seed = slug(base || type || 'item');
  var idx = 1;
  var id = seed;
  while((type === 'section' ? section(schema, id) : field(schema, id))){
    idx += 1;
    id = seed + '_' + idx;
  }
  return id;
}

function normField(raw, schema){
  var item = clone(raw || {});
  item.type = text(item.type || 'text').toLowerCase() || 'text';
  item.id = text(item.id || nextId(schema || { fields:[] }, item.label || item.type, 'field'));
  item.label = text(item.label || item.label_en || item.id || 'Field');
  item.label_vi = text(item.label_vi || '');
  item.placeholder = text(item.placeholder || '');
  item.placeholder_vi = text(item.placeholder_vi || '');
  item.helper = text(item.helper || '');
  item.helper_vi = text(item.helper_vi || '');
  item.width = text(item.width || 'full') || 'full';
  item.required = item.required === true;
  if(item.type === 'checkbox' && item.default == null) item.default = false;
  if(Array.isArray(item.options)) item.options = item.options.map(function(opt){
    if(typeof opt !== 'object') return { value:String(opt), label:String(opt), label_vi:'' };
    return { value:text(opt.value || opt.id || opt.label), label:text(opt.label || opt.value), label_vi:text(opt.label_vi || '') };
  }).filter(function(opt){ return !!opt.value; });
  else item.options = [];
  if(Array.isArray(item.columns)) item.columns = item.columns.map(function(col){
    return { id:text(col.id || slug(col.label || 'col')), label:text(col.label || col.id || 'Column'), type:text(col.type || 'text'), width:text(col.width || '') };
  });
  else item.columns = [];
  return item;
}

function normalize(form, raw){
  var schema = clone(raw || emptySchema(form));
  if(!schema.form_code) schema.form_code = form.form_code || '';
  if(!schema.title) schema.title = form.title || 'Untitled Form';
  if(!schema.title_vi && form.title_vi) schema.title_vi = form.title_vi;
  if(!schema.version) schema.version = form.version || 'V1.0';
  if(!schema.category) schema.category = form.category || 'other';
  schema.sections = Array.isArray(schema.sections) ? schema.sections.map(function(sec){
    return {
      id:text(sec.id || ''),
      title:text(sec.title || 'Section'),
      title_vi:text(sec.title_vi || ''),
      description:text(sec.description || ''),
      description_vi:text(sec.description_vi || ''),
      field_ids:Array.isArray(sec.field_ids) ? sec.field_ids.map(text).filter(Boolean) : []
    };
  }) : [];
  if(!schema.sections.length) schema.sections = emptySchema(form).sections;
  schema.fields = Array.isArray(schema.fields) ? schema.fields.map(function(item){ return normField(item, schema); }) : [];
  var seen = {};
  (schema.sections || []).forEach(function(sec, idx){
    if(!sec.id) sec.id = nextId(schema, 'section_' + (idx + 1), 'section');
    sec.field_ids = (sec.field_ids || []).filter(function(id){
      if(!field(schema, id) || seen[id]) return false;
      seen[id] = true;
      return true;
    });
  });
  (schema.fields || []).forEach(function(item){
    if(!seen[item.id]) schema.sections[0].field_ids.push(item.id);
  });
  return schema;
}

function ensureState(form){
  var code = String(form.form_code || '').toUpperCase() || 'UNTITLED';
  if(!STORE.states[code]){
    STORE.states[code] = {
      code: code,
      schema: null,
      loading: false,
      error: '',
      mode: 'design',
      selection: { kind:'form', id:'' },
      undo: [],
      redo: [],
      dirty: false,
      source: 'live',
      savedAt: '',
      paletteOpen: false,
      workflow: null,
      history: [],
      versionDiff: { loading:false, error:'', version:null, schema:null }
    };
  }
  return STORE.states[code];
}

function snapshot(state){
  return { schema: clone(state.schema), selection: clone(state.selection), dirty: state.dirty, source: state.source, savedAt: state.savedAt };
}

function applySnapshot(form, state, snap){
  state.schema = normalize(form, snap.schema);
  state.selection = snap.selection || { kind:'form', id:'' };
  state.dirty = snap.dirty === true;
  state.source = snap.source || 'local';
  state.savedAt = snap.savedAt || '';
}

function pushHistory(state){
  state.undo.push(snapshot(state));
  if(state.undo.length > 60) state.undo.shift();
  state.redo = [];
}

function withMutation(form, container, state, fn){
  pushHistory(state);
  fn(state.schema);
  state.schema = normalize(form, state.schema);
  state.dirty = true;
  state.source = 'local';
  refresh(form, container, state);
}

function resolveSchema(form){
  if(form && form.schema && Array.isArray(form.schema.fields)) return Promise.resolve(clone(form.schema));
  if(typeof window._ecApi === 'function' && form && form.form_code){
    return window._ecApi('form_fill_load_schema', { form_code: form.form_code }, 'GET').then(function(resp){
      return (resp && resp.ok && resp.schema) ? resp.schema : emptySchema(form);
    });
  }
  return Promise.resolve(emptySchema(form));
}

function resolveHistory(form){
  if(typeof window._ecApi !== 'function' || !form || !form.form_code) return Promise.resolve(null);
  return window._ecApi('form_schema_history', { form_code: form.form_code }, 'GET').catch(function(){ return null; });
}

function resolveVersionSchema(form, versionId){
  if(typeof window._ecApi !== 'function' || !form || !form.form_code || !versionId) return Promise.resolve(null);
  return window._ecApi('form_schema_version', { form_code: form.form_code, version_id: versionId }, 'GET').catch(function(){ return null; });
}

function ensureLoaded(form, container, state, forceLive, skipLocalDraft){
  state.loading = true;
  state.error = '';
  render(form, container, state);
  Promise.all([resolveSchema(form), resolveHistory(form)]).then(function(results){
    var live = results[0];
    var history = results[1];
    var draft = (forceLive || skipLocalDraft) ? null : readDraft(state.code);
    state.workflow = history && history.state ? history.state : null;
    state.history = history && Array.isArray(history.versions) ? history.versions : [];
    state.schema = normalize(form, draft && draft.schema ? draft.schema : ((history && history.draft_schema) ? history.draft_schema : live));
    state.source = draft && draft.schema ? 'local' : ((history && history.draft_schema) ? 'server' : 'live');
    state.savedAt = draft && draft.saved_at ? draft.saved_at : ((history && history.state && history.state.updated_at) ? history.state.updated_at : '');
    state.loading = false;
    state.dirty = false;
    refresh(form, container, state);
  }).catch(function(err){
    state.loading = false;
    state.error = text(err && err.message || 'schema_load_failed') || 'schema_load_failed';
    refresh(form, container, state);
  });
}

function groupPalette(){
  var out = { input:[], choice:[], advanced:[], layout:[] };
  PALETTE.forEach(function(item){ out[item.group].push(item); });
  return out;
}

function fmtStamp(v){
  try{ return v ? new Date(v).toLocaleString() : ''; }catch(err){ return String(v || ''); }
}

function fmtType(type){
  var hit = PALETTE.find(function(item){ return item.type === type; });
  return hit ? hit.label : String(type || 'field');
}

function workingStatus(state){
  return String(state && state.workflow && state.workflow.status || '').toLowerCase();
}

function workingRevision(state){
  return String(state && state.workflow && state.workflow.revision || '').trim();
}

function workflowUpdateType(state){
  var revision = workingRevision(state) || String(state && state.schema && state.schema.version || '').replace(/^v/i, '');
  return revision.indexOf('.') >= 0 ? 'minor' : 'major';
}

function hasServerWorkingCopy(state){
  return ['draft', 'in_review', 'pending_approval'].indexOf(workingStatus(state)) >= 0 && state.source !== 'local';
}

function canRejectReview(state){
  return ['in_review', 'pending_approval'].indexOf(workingStatus(state)) >= 0;
}

function syncWorkflowResponse(form, container, state, resp, mode){
  if(resp && resp.state) state.workflow = resp.state;
  if(resp && Array.isArray(resp.versions)) state.history = resp.versions;
  if(mode === 'live'){
    if(resp && resp.live_schema) state.schema = normalize(form, resp.live_schema);
    state.source = 'live';
    clearDraft(state.code);
  } else {
    if(resp && resp.draft_schema) state.schema = normalize(form, resp.draft_schema);
    else if(resp && resp.live_schema && !state.schema) state.schema = normalize(form, resp.live_schema);
    state.source = mode || 'server';
    if(state.source === 'server') clearDraft(state.code);
  }
  state.savedAt = (resp && resp.state && resp.state.updated_at) ? resp.state.updated_at : ((resp && resp.server_time) ? resp.server_time : state.savedAt);
  state.dirty = false;
  refresh(form, container, state);
}

function joinComparable(list, mapper){
  return (list || []).map(function(item){ return mapper(item); }).join('||');
}

function fieldComparable(schema, item){
  var sec = sectionForField(schema, item.id);
  return {
    section_id: sec ? sec.id : '',
    type: text(item.type || ''),
    label: text(item.label || ''),
    label_vi: text(item.label_vi || ''),
    required: item.required === true,
    width: text(item.width || ''),
    placeholder: text(item.placeholder || ''),
    placeholder_vi: text(item.placeholder_vi || ''),
    helper: text(item.helper || ''),
    helper_vi: text(item.helper_vi || ''),
    default_value: item.default == null ? '' : String(item.default),
    options: joinComparable(item.options, function(opt){ return [text(opt.value || ''), text(opt.label || ''), text(opt.label_vi || '')].join('|'); }),
    columns: joinComparable(item.columns, function(col){ return [text(col.id || ''), text(col.label || ''), text(col.type || ''), text(col.width || '')].join('|'); }),
    formula: text(item.formula || ''),
    lookup_source: text(item.lookup_source || ''),
    display_fields: joinComparable(item.display_fields, function(v){ return text(v); }),
    depends_on: joinComparable(item.depends_on, function(v){ return text(v); }),
    strict_select: item.strict_select === true,
    accept: text(item.accept || '')
  };
}

function sectionComparable(sec){
  return {
    title: text(sec.title || ''),
    title_vi: text(sec.title_vi || ''),
    description: text(sec.description || ''),
    description_vi: text(sec.description_vi || ''),
    field_ids: (sec.field_ids || []).map(text).join('|')
  };
}

function diffLabels(base, target, labelMap){
  var out = [];
  Object.keys(labelMap).forEach(function(key){
    if(String(base[key]) === String(target[key])) return;
    out.push(labelMap[key]);
  });
  return out;
}

function versionEntryLabel(item){
  return text(item && (item.version || item.id || 'selected version')) || 'selected version';
}

function compareSchemas(baseSchema, targetSchema){
  var base = normalize({ form_code:(baseSchema && baseSchema.form_code) || '', title:(baseSchema && baseSchema.title) || '' }, baseSchema || {});
  var target = normalize({ form_code:(targetSchema && targetSchema.form_code) || '', title:(targetSchema && targetSchema.title) || '' }, targetSchema || {});
  var metaLabels = {
    title: 'Title',
    title_vi: 'Title (VI)',
    description: 'Description',
    description_vi: 'Description (VI)',
    category: 'Category',
    sop_ref: 'SOP Ref',
    effective_date: 'Effective Date'
  };
  var metaChanges = diffLabels(base, target, metaLabels);

  var baseFields = {}, targetFields = {}, addedFields = [], removedFields = [], changedFields = [];
  (base.fields || []).forEach(function(item){ baseFields[item.id] = item; });
  (target.fields || []).forEach(function(item){ targetFields[item.id] = item; });
  Object.keys(targetFields).forEach(function(id){
    if(!baseFields[id]) addedFields.push(targetFields[id].label || targetFields[id].id || id);
  });
  Object.keys(baseFields).forEach(function(id){
    if(!targetFields[id]) removedFields.push(baseFields[id].label || baseFields[id].id || id);
  });
  Object.keys(targetFields).forEach(function(id){
    if(!baseFields[id]) return;
    var baseComp = fieldComparable(base, baseFields[id]);
    var targetComp = fieldComparable(target, targetFields[id]);
    var fieldChanges = diffLabels(baseComp, targetComp, {
      section_id: 'Section',
      type: 'Type',
      label: 'Label',
      label_vi: 'Label (VI)',
      required: 'Required',
      width: 'Width',
      placeholder: 'Placeholder',
      placeholder_vi: 'Placeholder (VI)',
      helper: 'Helper',
      helper_vi: 'Helper (VI)',
      default_value: 'Default',
      options: 'Options',
      columns: 'Columns',
      formula: 'Formula',
      lookup_source: 'Lookup Source',
      display_fields: 'Display Fields',
      depends_on: 'Depends On',
      strict_select: 'Strict Select',
      accept: 'Accepted Files'
    });
    if(fieldChanges.length){
      changedFields.push((targetFields[id].label || targetFields[id].id || id) + ' (' + fieldChanges.join(', ') + ')');
    }
  });

  var baseSections = {}, targetSections = {}, addedSections = [], removedSections = [], changedSections = [];
  (base.sections || []).forEach(function(sec){ baseSections[sec.id] = sec; });
  (target.sections || []).forEach(function(sec){ targetSections[sec.id] = sec; });
  Object.keys(targetSections).forEach(function(id){
    if(!baseSections[id]) addedSections.push(targetSections[id].title || targetSections[id].id || id);
  });
  Object.keys(baseSections).forEach(function(id){
    if(!targetSections[id]) removedSections.push(baseSections[id].title || baseSections[id].id || id);
  });
  Object.keys(targetSections).forEach(function(id){
    if(!baseSections[id]) return;
    var sectionChanges = diffLabels(sectionComparable(baseSections[id]), sectionComparable(targetSections[id]), {
      title: 'Title',
      title_vi: 'Title (VI)',
      description: 'Description',
      description_vi: 'Description (VI)',
      field_ids: 'Field Order'
    });
    if(sectionChanges.length){
      changedSections.push((targetSections[id].title || targetSections[id].id || id) + ' (' + sectionChanges.join(', ') + ')');
    }
  });

  return {
    metaChanges: metaChanges,
    addedFields: addedFields,
    removedFields: removedFields,
    changedFields: changedFields,
    addedSections: addedSections,
    removedSections: removedSections,
    changedSections: changedSections,
    hasChanges: metaChanges.length + addedFields.length + removedFields.length + changedFields.length + addedSections.length + removedSections.length + changedSections.length > 0
  };
}

function renderChangeList(title, values, emptyLabel){
  var list = values || [];
  if(!list.length) return '<div class="fb-diff-group"><div class="fb-diff-group-title">' + esc(title) + '</div><div class="fb-diff-empty">' + esc(emptyLabel || 'No changes') + '</div></div>';
  return '<div class="fb-diff-group"><div class="fb-diff-group-title">' + esc(title) + ' <span>(' + esc(list.length) + ')</span></div><div class="fb-diff-list">' + list.slice(0, 8).map(function(item){ return '<div class="fb-diff-item">' + esc(item) + '</div>'; }).join('') + (list.length > 8 ? '<div class="fb-diff-more">+' + esc(list.length - 8) + ' more</div>' : '') + '</div></div>';
}

function renderVersionDiff(state){
  var diff = state.versionDiff || {};
  if(diff.loading) return '<div class="fb-version-diff"><div class="fb-diff-title">Version Diff</div><div class="fb-diff-empty">Loading selected version snapshot...</div></div>';
  if(diff.error) return '<div class="fb-version-diff"><div class="fb-diff-title">Version Diff</div><div class="fb-diff-empty">' + esc(diff.error) + '</div></div>';
  if(!diff.version || !diff.schema) return '<div class="fb-version-diff"><div class="fb-diff-title">Version Diff</div><div class="fb-diff-empty">Select a history version to compare it with the schema currently open in the builder.</div></div>';
  var summary = compareSchemas(diff.schema, state.schema || {});
  var targetLabel = (state.schema && state.schema.version) ? state.schema.version : (state.source === 'live' ? 'Live schema' : 'Current schema');
  return '<div class="fb-version-diff"><div class="fb-diff-title">Version Diff</div><div class="fb-diff-subtitle">Comparing ' + esc(versionEntryLabel(diff.version)) + ' with ' + esc(targetLabel) + '</div>' +
    '<div class="fb-diff-summary">' +
      '<div class="fb-diff-chip">Meta ' + esc(summary.metaChanges.length) + '</div>' +
      '<div class="fb-diff-chip">Fields +' + esc(summary.addedFields.length) + ' / -' + esc(summary.removedFields.length) + ' / ~' + esc(summary.changedFields.length) + '</div>' +
      '<div class="fb-diff-chip">Sections +' + esc(summary.addedSections.length) + ' / -' + esc(summary.removedSections.length) + ' / ~' + esc(summary.changedSections.length) + '</div>' +
    '</div>' +
    (!summary.hasChanges ? '<div class="fb-diff-empty">No structural or metadata differences against the schema currently loaded.</div>' :
      renderChangeList('Metadata', summary.metaChanges, 'No metadata changes') +
      renderChangeList('Added Fields', summary.addedFields, 'No added fields') +
      renderChangeList('Removed Fields', summary.removedFields, 'No removed fields') +
      renderChangeList('Changed Fields', summary.changedFields, 'No changed fields') +
      renderChangeList('Added Sections', summary.addedSections, 'No added sections') +
      renderChangeList('Removed Sections', summary.removedSections, 'No removed sections') +
      renderChangeList('Changed Sections', summary.changedSections, 'No changed sections')
    ) +
  '</div>';
}

function designInput(fieldDef){
  if(fieldDef.type === 'textarea') return '<textarea rows="3" placeholder="' + esc(fieldDef.placeholder || '') + '"></textarea>';
  if(fieldDef.type === 'select' || fieldDef.type === 'lookup') return '<select><option>' + esc((fieldDef.options[0] && (fieldDef.options[0].label || fieldDef.options[0].value)) || 'Select value') + '</option></select>';
  if(fieldDef.type === 'multi_select') return '<select multiple><option>Option 1</option><option>Option 2</option></select>';
  if(fieldDef.type === 'checkbox') return '<label style="display:flex;align-items:center;gap:var(--space-2,8px);color:var(--text-secondary,#475569)"><input type="checkbox"' + (fieldDef.default ? ' checked' : '') + '> ' + esc(fieldDef.label_vi || fieldDef.label || '') + '</label>';
  if(fieldDef.type === 'file') return '<div class="qf-file-drop"><div class="qf-file-drop-text">Upload area</div><div class="qf-file-drop-hint">' + esc(fieldDef.accept || '.pdf,.png,.jpg') + '</div></div>';
  if(fieldDef.type === 'signature') return '<div class="qf-signature-grid"><div class="qf-signature-block"><div class="qf-signature-pad"></div><div class="qf-signature-name">' + esc(fieldDef.label || 'Signature') + '</div></div></div>';
  if(fieldDef.type === 'table') return '<div class="qf-table-wrap"><table class="qf-table"><thead><tr>' + (fieldDef.columns || []).map(function(col){ return '<th>' + esc(col.label || col.id) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' + (fieldDef.columns || []).map(function(){ return '<td>...</td>'; }).join('') + '</tr></tbody></table></div>';
  if(fieldDef.type === 'heading') return '<div style="font-size:18px;font-weight:var(--font-display-weight,700);color:var(--text-primary,#0c2d48)">' + esc(fieldDef.label_vi || fieldDef.label || 'Heading') + '</div>';
  if(fieldDef.type === 'hidden') return '<div style="font-size:var(--text-xs,.75rem);color:var(--text-secondary,#64748b);background:var(--bg-surface-alt,#f8fafc);border:1px dashed var(--border,#d1d5db);border-radius:var(--radius-md,6px);padding:10px var(--space-3,12px)">Hidden runtime value</div>';
  if(fieldDef.type === 'calculated') return '<input type="text" value="' + esc(fieldDef.formula || 'SUM(...)') + '" readonly>';
  return '<input type="' + esc(fieldDef.type === 'number' ? 'number' : (fieldDef.type === 'date' ? 'date' : (fieldDef.type === 'time' ? 'time' : 'text'))) + '" placeholder="' + esc(fieldDef.placeholder || '') + '">';
}

function widthSpan(width){
  if(width === 'half') return 3;
  if(width === 'third') return 2;
  if(width === 'two-thirds') return 4;
  if(width === 'quarter') return 1;
  return 6;
}

function previewField(fieldDef){
  var html = '<div class="qf-field" style="grid-column:span ' + widthSpan(fieldDef.width) + '">' +
    '<label class="qf-label"><span>' + esc(fieldDef.label || fieldDef.id) + '</span>' + (fieldDef.required ? '<span class="qf-required">*</span>' : '') + (fieldDef.label_vi ? '<span class="qf-label-vi">' + esc(fieldDef.label_vi) + '</span>' : '') + '</label>';
  if(fieldDef.type === 'textarea') html += '<textarea class="qf-textarea" rows="' + esc(fieldDef.rows || 4) + '" placeholder="' + esc(fieldDef.placeholder || '') + '"></textarea>';
  else if(fieldDef.type === 'select' || fieldDef.type === 'lookup') html += '<select class="qf-select"><option>' + esc((fieldDef.options[0] && (fieldDef.options[0].label || fieldDef.options[0].value)) || 'Select value') + '</option></select>';
  else if(fieldDef.type === 'multi_select') html += '<div class="qf-check-group"><label class="qf-check-label"><input type="checkbox"> Option 1</label><label class="qf-check-label"><input type="checkbox"> Option 2</label></div>';
  else if(fieldDef.type === 'checkbox') html += '<label class="qf-check-label"><input type="checkbox"' + (fieldDef.default ? ' checked' : '') + '> ' + esc(fieldDef.label_vi || fieldDef.label || '') + '</label>';
  else if(fieldDef.type === 'file') html += '<div class="qf-file-drop"><div class="qf-file-drop-icon">UP</div><div class="qf-file-drop-text">Drag files here</div><div class="qf-file-drop-hint">' + esc(fieldDef.accept || '.pdf,.png,.jpg') + '</div></div>';
  else if(fieldDef.type === 'table') html += '<div class="qf-table-wrap"><table class="qf-table"><thead><tr>' + (fieldDef.columns || []).map(function(col){ return '<th>' + esc(col.label || col.id) + '</th>'; }).join('') + '</tr></thead><tbody><tr>' + (fieldDef.columns || []).map(function(){ return '<td><input type="text"></td>'; }).join('') + '</tr></tbody></table></div>';
  else if(fieldDef.type === 'signature') html += '<div class="qf-signature-grid"><div class="qf-signature-block"><div class="qf-signature-pad"></div><div class="qf-signature-name">' + esc(fieldDef.label || 'Signature') + '</div></div></div>';
  else if(fieldDef.type === 'heading') html += '<div style="font-size:20px;font-weight:700;color:var(--form-brand);padding:10px 0 6px">' + esc(fieldDef.label_vi || fieldDef.label || 'Heading') + '</div>';
  else html += '<input class="qf-input" type="' + esc(fieldDef.type === 'number' ? 'number' : (fieldDef.type === 'date' ? 'date' : (fieldDef.type === 'time' ? 'time' : 'text'))) + '" placeholder="' + esc(fieldDef.placeholder || '') + '"' + ((fieldDef.type === 'calculated' || fieldDef.type === 'hidden') ? ' readonly' : '') + '>';
  if(fieldDef.helper || fieldDef.helper_vi) html += '<div class="qf-helper">' + esc(fieldDef.helper_vi || fieldDef.helper) + '</div>';
  return html + '</div>';
}

function renderToolbar(form, state){
  var status = [state.source === 'local' ? 'Local draft' : (state.source === 'server' ? 'Server draft' : 'Live schema')];
  if(workingStatus(state)) status.push(workingStatus(state).replace(/_/g, ' '));
  if(state.dirty) status.push('Unsaved changes');
  if(state.savedAt) status.push(fmtStamp(state.savedAt));
  return '<div class="fb-toolbar">' +
    '<div class="fb-toolbar-title" data-select-kind="form" data-select-id="">' + esc(form.form_code || '') + ' · ' + esc(form.title_vi || form.title || form.form_code || 'Form') + '</div>' +
    '<span class="fb-toolbar-status">' + esc(status.join(' · ')) + '</span>' +
    '<button type="button" class="fb-toolbar-btn' + (state.mode === 'design' ? ' fb-toolbar-btn-primary' : '') + '" data-builder-action="mode-design">Design</button>' +
    '<button type="button" class="fb-toolbar-btn' + (state.mode === 'preview' ? ' fb-toolbar-btn-primary' : '') + '" data-builder-action="mode-preview">Preview</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="undo"' + (!state.undo.length ? ' disabled' : '') + '>Undo</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="redo"' + (!state.redo.length ? ' disabled' : '') + '>Redo</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="save-draft">Save Draft</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="submit-review">Submit Review</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="publish-schema">Approve / Publish</button>' +
    (canRejectReview(state) ? '<button type="button" class="fb-toolbar-btn" data-builder-action="reject-review">Reject Review</button>' : '') +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="reload-history">Reload</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="export-json">Export JSON</button>' +
    '<button type="button" class="fb-toolbar-btn" data-builder-action="reset-live">Reset Live</button>' +
  '</div>';
}

function renderPalette(state){
  var grouped = groupPalette();
  return '<aside class="fb-block-palette' + (state.paletteOpen ? ' open' : '') + '">' +
    Object.keys(GROUPS).map(function(key){
      return '<div class="fb-palette-section"><div class="fb-palette-section-title">' + esc(GROUPS[key]) + '</div>' +
        grouped[key].map(function(item){
          return '<div class="fb-block" draggable="true" data-palette-block="' + esc(item.type) + '">' +
            '<div class="fb-block-icon fb-block-icon-' + esc(key === 'advanced' ? 'table' : (key === 'layout' ? 'layout' : (key === 'choice' ? 'select' : 'input'))) + '">' + esc(item.icon) + '</div>' +
            '<div><div class="fb-block-label">' + esc(item.label) + '</div><div class="fb-block-desc">' + esc(item.desc) + '</div></div>' +
          '</div>';
        }).join('') +
      '</div>';
    }).join('') +
  '</aside>';
}

function renderSummary(form, state){
  var schema = state.schema || emptySchema(form);
  return '<div class="fb-form-summary' + (state.selection.kind === 'form' ? ' selected' : '') + '" data-select-kind="form" data-select-id="">' +
    '<div class="fb-form-summary-code">' + esc(schema.form_code || form.form_code || '') + '</div>' +
    '<div class="fb-form-summary-title">' + esc(schema.title_vi || schema.title || form.title_vi || form.title || 'Untitled form') + '</div>' +
    '<div class="fb-form-summary-meta">Version: ' + esc(schema.version || 'V1.0') + ' · Sections: ' + esc((schema.sections || []).length) + ' · Fields: ' + esc((schema.fields || []).length) + '</div>' +
  '</div>';
}

function renderFieldCard(schema, sec, item, state){
  return '<div class="fb-drop-zone" data-drop-kind="field" data-section-id="' + esc(sec.id) + '" data-before-field-id="' + esc(item.id) + '"><div class="fb-drop-indicator"></div></div>' +
    '<div class="fb-field' + (state.selection.kind === 'field' && state.selection.id === item.id ? ' fb-field-selected' : '') + '" data-select-kind="field" data-select-id="' + esc(item.id) + '" draggable="true" data-field-drag="' + esc(item.id) + '" data-field-section="' + esc(sec.id) + '">' +
      '<div class="fb-field-drag-handle"><span></span><span></span><span></span></div>' +
      '<div class="fb-field-actions"><button type="button" class="fb-field-action-btn" data-builder-action="duplicate-field" data-field-id="' + esc(item.id) + '">+</button><button type="button" class="fb-field-action-btn" data-builder-action="delete-field" data-field-id="' + esc(item.id) + '">x</button></div>' +
      '<div class="fb-field-label">' + esc(item.label_vi || item.label || item.id) + (item.required ? '<span class="required">*</span>' : '') + '</div>' +
      '<div class="fb-field-meta">' + esc(fmtType(item.type)) + ' · ' + esc(item.width || 'full') + ' · ' + esc(item.id) + '</div>' +
      '<div class="fb-field-preview">' + designInput(item) + '</div>' +
    '</div>';
}

function renderSectionCard(schema, sec, state){
  var items = (sec.field_ids || []).map(function(id){ return field(schema, id); }).filter(Boolean);
  return '<div class="fb-drop-zone fb-drop-zone-section" data-drop-kind="section" data-before-section-id="' + esc(sec.id) + '"><div class="fb-drop-indicator"></div></div>' +
    '<section class="fb-section-card' + (state.selection.kind === 'section' && state.selection.id === sec.id ? ' fb-section-card-selected' : '') + '">' +
      '<div class="fb-section-head" data-select-kind="section" data-select-id="' + esc(sec.id) + '" draggable="true" data-section-drag="' + esc(sec.id) + '">' +
        '<div class="fb-section-head-main"><div class="fb-section-kicker">Section</div><div class="fb-section-title">' + esc(sec.title_vi || sec.title || 'Section') + '</div><div class="fb-section-meta">' + esc(items.length) + ' fields</div></div>' +
        '<div class="fb-section-actions"><button type="button" class="fb-section-action-btn" data-builder-action="duplicate-section" data-section-id="' + esc(sec.id) + '">+</button><button type="button" class="fb-section-action-btn" data-builder-action="delete-section" data-section-id="' + esc(sec.id) + '">x</button></div>' +
      '</div>' +
      (sec.description || sec.description_vi ? '<div class="fb-section-desc">' + esc(sec.description_vi || sec.description) + '</div>' : '') +
      '<div class="fb-section-body">' +
        '<div class="fb-drop-zone" data-drop-kind="field" data-section-id="' + esc(sec.id) + '" data-before-field-id=""><div class="fb-drop-indicator"></div></div>' +
        (items.length ? items.map(function(item){ return renderFieldCard(schema, sec, item, state); }).join('') : '<div class="fb-section-empty">Drag fields from the palette into this section.</div>') +
        '<div class="fb-drop-zone" data-drop-kind="field" data-section-id="' + esc(sec.id) + '" data-before-field-id=""><div class="fb-drop-indicator"></div></div>' +
      '</div>' +
    '</section>';
}

function renderDesign(schema, state){
  return '<div class="fb-design-canvas">' +
    '<div class="fb-drop-zone fb-drop-zone-section" data-drop-kind="section" data-before-section-id=""><div class="fb-drop-indicator"></div></div>' +
    (schema.sections || []).map(function(sec){ return renderSectionCard(schema, sec, state); }).join('') +
    '<div class="fb-drop-zone fb-drop-zone-section" data-drop-kind="section" data-before-section-id=""><div class="fb-drop-indicator"></div></div>' +
  '</div>';
}

function renderPreview(schema){
  return '<div class="fb-preview-shell"><div class="fb-preview-note">Preview follows the form design system and uses placeholders.</div><div class="qf">' +
    '<div class="qf-header"><div class="qf-header-top"><div class="qf-doc-code">' + esc(schema.form_code || '') + '</div><div class="qf-header-meta"><div class="qf-header-meta-item"><strong>Rev</strong> ' + esc(schema.version || 'V1.0') + '</div><div class="qf-header-meta-item"><strong>Category</strong> ' + esc(schema.category || 'other') + '</div>' + (schema.effective_date ? '<div class="qf-header-meta-item"><strong>Effective</strong> ' + esc(schema.effective_date) + '</div>' : '') + (schema.sop_ref ? '<div class="qf-header-meta-item"><strong>SOP</strong> ' + esc(schema.sop_ref) + '</div>' : '') + '</div></div><div class="qf-header-title">' + esc(schema.title || schema.form_code || 'Untitled Form') + '</div>' + (schema.title_vi ? '<div class="qf-header-subtitle">' + esc(schema.title_vi) + '</div>' : '') + ((schema.description || schema.description_vi) ? '<div class="qf-header-subtitle" style="margin-top:10px">' + esc(schema.description_vi || schema.description) + '</div>' : '') + '</div>' +
    (schema.sections || []).map(function(sec, index){
      var items = (sec.field_ids || []).map(function(id){ return field(schema, id); }).filter(Boolean);
      return '<section class="qf-section"><div class="qf-section-header"><div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;width:100%"><div><div class="qf-section-title">' + esc(sec.title || ('Section ' + (index + 1))) + '</div>' + (sec.title_vi ? '<div class="qf-section-subtitle">' + esc(sec.title_vi) + '</div>' : '') + ((sec.description || sec.description_vi) ? '<div class="qf-section-subtitle" style="margin-top:6px">' + esc(sec.description_vi || sec.description) + '</div>' : '') + '</div><div class="qf-section-num">' + esc(String(index + 1).padStart(2, '0')) + '</div></div></div><div class="qf-section-body"><div class="qf-grid" style="grid-template-columns:repeat(6,minmax(0,1fr))">' + (items.length ? items.map(previewField).join('') : '<div class="qf-grid-full" style="color:var(--form-text-tertiary)">This section has no fields yet.</div>') + '</div></div></section>';
    }).join('') +
    ((schema.signature_blocks || []).length ? '<section class="qf-section"><div class="qf-section-header"><div class="qf-section-title">Electronic Signatures</div></div><div class="qf-section-body"><div class="qf-signature-grid">' + (schema.signature_blocks || []).map(function(block){ return '<div class="qf-signature-block"><div class="qf-signature-pad"></div><div class="qf-signature-name">' + esc(block.label || block.id || 'Signature') + '</div>' + (block.label_vi ? '<div class="qf-signature-role">' + esc(block.label_vi) + '</div>' : '') + '</div>'; }).join('') + '</div></div></section>' : '') +
  '</div></div>';
}

function propRow(label, path, value, kind, extra, readonly){
  if(kind === 'textarea'){
    return '<div class="fb-prop-row"><label class="fb-prop-label">' + esc(label) + '</label><textarea class="fb-prop-input" rows="4" data-prop-path="' + esc(path) + '"' + (extra ? ' data-prop-kind="' + esc(extra) + '"' : '') + '>' + esc(value == null ? '' : value) + '</textarea></div>';
  }
  if(kind === 'checkbox'){
    return '<div class="fb-prop-row"><label class="fb-prop-checkbox"><input type="checkbox" data-prop-path="' + esc(path) + '"' + (value ? ' checked' : '') + '> ' + esc(label) + '</label></div>';
  }
  if(kind === 'select'){
    return '<div class="fb-prop-row"><label class="fb-prop-label">' + esc(label) + '</label><select class="fb-prop-select" data-prop-path="' + esc(path) + '">' + WIDTHS.map(function(item){ return '<option value="' + esc(item) + '"' + (String(item) === String(value) ? ' selected' : '') + '>' + esc(item) + '</option>'; }).join('') + '</select></div>';
  }
  return '<div class="fb-prop-row"><label class="fb-prop-label">' + esc(label) + '</label><input class="fb-prop-input" data-prop-path="' + esc(path) + '" type="' + esc(kind || 'text') + '" value="' + esc(value == null ? '' : value) + '"' + (readonly ? ' readonly' : '') + '></div>';
}

function optionLines(list){ return (list || []).map(function(item){ return [item.value || '', item.label || '', item.label_vi || ''].join(' | '); }).join('\n'); }
function columnLines(list){ return (list || []).map(function(item){ return [item.id || '', item.label || '', item.type || 'text', item.width || ''].join(' | '); }).join('\n'); }
function nameLines(list){ return (list || []).join('\n'); }

function badgeClass(status){
  if(status === 'draft') return 'fb-version-badge-draft';
  if(status === 'in_review' || status === 'pending_approval') return 'fb-version-badge-review';
  if(status === 'approved' || status === 'initial_release') return 'fb-version-badge-active';
  if(status === 'obsolete') return 'fb-version-badge-archived';
  return 'fb-version-badge-approved';
}

function versionPanel(state){
  var workflow = state.workflow || {};
  var current = [];
  if(workflow.status) current.push(String(workflow.status));
  if(workflow.revision) current.push('v' + workflow.revision);
  if(workflow.effective_date) current.push('Effective ' + workflow.effective_date);
  return '<div class="fb-version-control"><div class="fb-version-header"><h4>Version Control</h4><span class="fb-version-badge ' + esc(badgeClass(String(workflow.status || 'draft'))) + '">' + esc((workflow.status || 'draft').replace(/_/g, ' ')) + '</span></div>' +
    '<div style="padding:10px var(--space-4,16px);font-size:11px;color:var(--text-secondary,#64748b);border-bottom:1px solid var(--bg-surface-alt,#f1f5f9)">' + esc(current.length ? current.join(' · ') : 'Workflow bootstrap pending') + '</div>' +
    '<div class="fb-prop-actions" style="padding:12px 16px 0"><button type="button" class="fb-toolbar-btn" data-builder-action="save-draft">Save Draft</button><button type="button" class="fb-toolbar-btn" data-builder-action="submit-review">Submit Review</button><button type="button" class="fb-toolbar-btn" data-builder-action="publish-schema">Approve / Publish</button>' + (canRejectReview(state) ? '<button type="button" class="fb-toolbar-btn" data-builder-action="reject-review">Reject Review</button>' : '') + '<button type="button" class="fb-toolbar-btn" data-builder-action="reload-history">Reload</button></div>' +
    '<div class="fb-version-list">' +
      ((state.history || []).length ? state.history.map(function(item){
        var canRollback = ['approved', 'initial_release', 'obsolete'].indexOf(String(item.status || '')) >= 0;
        var isInspecting = !!(state.versionDiff && state.versionDiff.version && state.versionDiff.version.id === item.id);
        return '<div class="fb-version-item' + (item.is_current || isInspecting ? ' active' : '') + '">' +
          '<div class="fb-version-number">' + esc(item.version || 'v0') + '</div>' +
          '<div class="fb-version-info"><div class="fb-version-info-label">' + esc(item.note || item.status || 'Version entry') + '</div><div class="fb-version-info-date">' + esc(item.user || 'system') + ' · ' + esc(fmtStamp(item.date || '')) + '</div></div>' +
          '<span class="fb-version-badge ' + esc(badgeClass(String(item.status || 'draft'))) + '">' + esc(String(item.status || 'draft').replace(/_/g, ' ')) + '</span>' +
          '<div class="fb-version-actions"><button type="button" class="fb-version-action-btn" data-builder-action="inspect-version" data-version-id="' + esc(item.id || '') + '" title="Compare this version with the schema currently open">DF</button>' + (canRollback ? '<button type="button" class="fb-version-action-btn" data-builder-action="rollback-version" data-version-id="' + esc(item.id || '') + '" data-version-label="' + esc(item.version || 'v0') + '" title="Restore this revision as a new draft">RB</button>' : '') + '</div>' +
        '</div>';
      }).join('') : '<div class="fb-version-item"><div class="fb-version-info"><div class="fb-version-info-label">No server history yet</div><div class="fb-version-info-date">The first draft save will bootstrap the manifest.</div></div></div>') +
    '</div>' + renderVersionDiff(state) + '</div>';
}

function renderProps(form, state){
  var schema = state.schema;
  if(state.selection.kind === 'section'){
    var sec = section(schema, state.selection.id);
    if(!sec) return '<aside class="fb-properties"><div class="fb-props-empty">Section not found.</div></aside>';
    return '<aside class="fb-properties"><div class="fb-props-header">Section Properties</div><div class="fb-prop-actions"><button type="button" class="fb-toolbar-btn" data-builder-action="duplicate-section" data-section-id="' + esc(sec.id) + '">Duplicate</button><button type="button" class="fb-toolbar-btn" data-builder-action="delete-section" data-section-id="' + esc(sec.id) + '">Delete</button></div><div class="fb-props-group"><div class="fb-props-group-title">Basics</div>' + propRow('ID', 'id', sec.id, 'text') + propRow('Title', 'title', sec.title, 'text') + propRow('Title (VI)', 'title_vi', sec.title_vi, 'text') + propRow('Description', 'description', sec.description, 'textarea') + propRow('Description (VI)', 'description_vi', sec.description_vi, 'textarea') + '</div></aside>';
  }
  if(state.selection.kind === 'field'){
    var item = field(schema, state.selection.id);
    if(!item) return '<aside class="fb-properties"><div class="fb-props-empty">Field not found.</div></aside>';
    return '<aside class="fb-properties"><div class="fb-props-header">Field Properties</div><div class="fb-prop-actions"><button type="button" class="fb-toolbar-btn" data-builder-action="duplicate-field" data-field-id="' + esc(item.id) + '">Duplicate</button><button type="button" class="fb-toolbar-btn" data-builder-action="delete-field" data-field-id="' + esc(item.id) + '">Delete</button></div><div class="fb-props-group"><div class="fb-props-group-title">Identity</div>' + propRow('ID', 'id', item.id, 'text') + propRow('Type', '__type_readonly', fmtType(item.type), 'text', '', true) + propRow('Label', 'label', item.label, 'text') + propRow('Label (VI)', 'label_vi', item.label_vi, 'text') + '</div><div class="fb-props-group"><div class="fb-props-group-title">Behavior</div>' + propRow('Required', 'required', item.required === true, 'checkbox') + propRow('Width', 'width', item.width || 'full', 'select') + propRow('Placeholder', 'placeholder', item.placeholder, 'text') + propRow('Placeholder (VI)', 'placeholder_vi', item.placeholder_vi, 'text') + propRow('Helper', 'helper', item.helper, 'textarea') + propRow('Helper (VI)', 'helper_vi', item.helper_vi, 'textarea') + propRow('Default', 'default', item.default == null ? '' : item.default, 'text') + ((item.type === 'select' || item.type === 'multi_select') ? propRow('Options', 'options', optionLines(item.options), 'textarea', 'options') : '') + (item.type === 'lookup' ? propRow('Lookup Source', 'lookup_source', item.lookup_source || '', 'text') + propRow('Display Fields', 'display_fields', nameLines(item.display_fields || []), 'textarea', 'string-list') + propRow('Depends On', 'depends_on', nameLines(item.depends_on || []), 'textarea', 'string-list') + propRow('Strict Select', 'strict_select', item.strict_select === true, 'checkbox') : '') + (item.type === 'table' ? propRow('Columns', 'columns', columnLines(item.columns), 'textarea', 'columns') : '') + (item.type === 'calculated' ? propRow('Formula', 'formula', item.formula || '', 'textarea') : '') + (item.type === 'file' ? propRow('Accepted Files', 'accept', item.accept || '', 'text') : '') + '</div></aside>';
  }
  return '<aside class="fb-properties"><div class="fb-props-header">Form Settings</div><div class="fb-props-group"><div class="fb-props-group-title">Identity</div>' + propRow('Form Code', 'form_code', schema.form_code || form.form_code || '', 'text', '', true) + propRow('Title', 'title', schema.title || '', 'text') + propRow('Title (VI)', 'title_vi', schema.title_vi || '', 'text') + propRow('Version', 'version', schema.version || '', 'text', '', true) + propRow('Effective Date', 'effective_date', schema.effective_date || (state.workflow && state.workflow.effective_date) || '', 'date') + propRow('Category', 'category', schema.category || '', 'text') + propRow('SOP Ref', 'sop_ref', schema.sop_ref || '', 'text') + '</div><div class="fb-props-group"><div class="fb-props-group-title">Descriptions</div>' + propRow('Description', 'description', schema.description || '', 'textarea') + propRow('Description (VI)', 'description_vi', schema.description_vi || '', 'textarea') + '</div><div class="fb-props-group"><div class="fb-props-group-title">Quick Actions</div><div class="fb-prop-actions"><button type="button" class="fb-toolbar-btn" data-builder-action="add-section">Add Section</button></div><div class="fb-prop-hint">Version is workflow-controlled. Save Draft creates or updates the working copy, then Submit Review, Reject Review, and Approve / Publish move the schema through release control.</div></div>' + versionPanel(state) + '</aside>';
}

function render(form, container, state){
  if(state.loading){
    container.innerHTML = '<div class="ec-empty"><div class="ec-empty-icon">FB</div><h3>Loading Form Control</h3><p>Syncing the current schema before opening the builder.</p></div>';
    return;
  }
  if(state.error && !state.schema){
    container.innerHTML = '<div class="ec-empty"><div class="ec-empty-icon">FB</div><h3>Could not load schema</h3><p>' + esc(state.error) + '</p><div style="margin-top:16px"><button type="button" class="ec-btn" data-builder-action="retry-load">Retry</button></div></div>';
    return;
  }
  container.innerHTML = '<div class="fb-container" data-form-builder="1">' + renderToolbar(form, state) + renderPalette(state) + '<main class="fb-canvas"><button type="button" class="fb-palette-toggle" data-builder-action="toggle-palette" aria-label="Toggle palette">::</button><div class="fb-canvas-inner">' + renderSummary(form, state) + (state.mode === 'preview' ? renderPreview(state.schema) : renderDesign(state.schema, state)) + '</div></main>' + renderProps(form, state) + '</div>';
}

function refresh(form, container, state){
  render(form, container, state);
  bind(form, container, state);
}

function activeContext(){
  var ec = window._ecState || {};
  if(ec.workspaceMode !== 'builder') return null;
  var code = String(ec.selectedFormCode || '').toUpperCase();
  var form = ec.formMap && ec.formMap[code];
  var state = STORE.states[code];
  var container = document.getElementById('ec-workspace');
  return (form && state && container) ? { form:form, state:state, container:container } : null;
}

function undo(form, container, state){
  if(!state.undo.length) return;
  state.redo.push(snapshot(state));
  applySnapshot(form, state, state.undo.pop());
  render(form, container, state);
  bind(form, container, state);
}

function redo(form, container, state){
  if(!state.redo.length) return;
  state.undo.push(snapshot(state));
  applySnapshot(form, state, state.redo.pop());
  render(form, container, state);
  bind(form, container, state);
}

function parseLines(v){ return String(v == null ? '' : v).split(/\r?\n/).map(text).filter(Boolean); }
function parseOptions(v){ return parseLines(v).map(function(line){ var p = line.split('|').map(text); return p[0] ? { value:p[0], label:p[1] || p[0], label_vi:p[2] || '' } : null; }).filter(Boolean); }
function parseColumns(v){ return parseLines(v).map(function(line){ var p = line.split('|').map(text); return p[0] ? { id:p[0], label:p[1] || p[0], type:p[2] || 'text', width:p[3] || '' } : null; }).filter(Boolean); }

function updateProp(form, container, state, input){
  var path = input.getAttribute('data-prop-path') || '';
  if(!path || path === '__type_readonly') return;
  var kind = input.getAttribute('data-prop-kind') || '';
  var value = input.type === 'checkbox' ? input.checked : input.value;
  if(kind === 'options') value = parseOptions(value);
  if(kind === 'columns') value = parseColumns(value);
  if(kind === 'string-list') value = parseLines(value);
  if(input.type === 'number') value = value === '' ? '' : Number(value);
  withMutation(form, container, state, function(schema){
    if(state.selection.kind === 'form'){
      schema[path] = value;
      return;
    }
    if(state.selection.kind === 'section'){
      var sec = section(schema, state.selection.id);
      if(!sec) return;
      if(path === 'id'){
        var next = slug(value) || sec.id;
        if(next !== sec.id && section(schema, next)) return;
        sec.id = next;
        state.selection.id = next;
      } else sec[path] = value;
      return;
    }
    var item = field(schema, state.selection.id);
    if(!item) return;
    if(path === 'id'){
      var fieldNext = slug(value) || item.id;
      if(fieldNext !== item.id && field(schema, fieldNext)) return;
      (schema.sections || []).forEach(function(sec){
        sec.field_ids = (sec.field_ids || []).map(function(id){ return id === item.id ? fieldNext : id; });
      });
      item.id = fieldNext;
      state.selection.id = fieldNext;
    } else item[path] = value;
  });
}

function duplicateField(schema, id){
  var source = field(schema, id);
  var sec = sectionForField(schema, id);
  if(!source || !sec) return null;
  var copy = normField(source, schema);
  copy.id = nextId(schema, source.id + '_copy', 'field');
  copy.label = text(source.label || 'Field') + ' Copy';
  schema.fields.push(copy);
  var idx = (sec.field_ids || []).indexOf(id);
  sec.field_ids.splice(idx + 1, 0, copy.id);
  return copy.id;
}

function duplicateSection(schema, id){
  var source = section(schema, id);
  if(!source) return null;
  var copy = clone(source);
  copy.id = nextId(schema, source.id + '_copy', 'section');
  copy.title = text(source.title || 'Section') + ' Copy';
  copy.field_ids = [];
  var idx = (schema.sections || []).findIndex(function(sec){ return sec.id === id; });
  schema.sections.splice(idx + 1, 0, copy);
  (source.field_ids || []).forEach(function(fieldId){
    var sourceField = field(schema, fieldId);
    if(!sourceField) return;
    var fieldCopy = normField(sourceField, schema);
    fieldCopy.id = nextId(schema, sourceField.id + '_copy', 'field');
    fieldCopy.label = text(sourceField.label || 'Field') + ' Copy';
    schema.fields.push(fieldCopy);
    copy.field_ids.push(fieldCopy.id);
  });
  return copy.id;
}

function bindDnD(form, container, state){
  Array.prototype.forEach.call(container.querySelectorAll('[data-palette-block]'), function(el){
    el.ondragstart = function(ev){
      STORE.drag = { source:'palette', type:el.getAttribute('data-palette-block') || 'text' };
      if(ev.dataTransfer){ ev.dataTransfer.effectAllowed = 'copy'; ev.dataTransfer.setData('text/plain', STORE.drag.type); }
      el.classList.add('dragging');
    };
    el.ondragend = function(){ el.classList.remove('dragging'); STORE.drag = null; };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-field-drag]'), function(el){
    el.ondragstart = function(ev){
      STORE.drag = { source:'field', id:el.getAttribute('data-field-drag') || '', sectionId:el.getAttribute('data-field-section') || '' };
      if(ev.dataTransfer){ ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', STORE.drag.id); }
    };
    el.ondragend = function(){ STORE.drag = null; };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-section-drag]'), function(el){
    el.ondragstart = function(ev){
      STORE.drag = { source:'section', id:el.getAttribute('data-section-drag') || '' };
      if(ev.dataTransfer){ ev.dataTransfer.effectAllowed = 'move'; ev.dataTransfer.setData('text/plain', STORE.drag.id); }
    };
    el.ondragend = function(){ STORE.drag = null; };
  });
  Array.prototype.forEach.call(container.querySelectorAll('[data-drop-kind]'), function(zone){
    zone.ondragover = function(ev){
      var kind = zone.getAttribute('data-drop-kind') || '';
      if(!STORE.drag) return;
      if(kind === 'field' && !((STORE.drag.source === 'palette' && STORE.drag.type !== 'section') || STORE.drag.source === 'field')) return;
      if(kind === 'section' && !((STORE.drag.source === 'palette' && STORE.drag.type === 'section') || STORE.drag.source === 'section')) return;
      ev.preventDefault();
      zone.classList.add('drag-over');
    };
    zone.ondragleave = function(){ zone.classList.remove('drag-over'); };
    zone.ondrop = function(ev){
      zone.classList.remove('drag-over');
      if(!STORE.drag) return;
      ev.preventDefault();
      var kind = zone.getAttribute('data-drop-kind') || '';
      withMutation(form, container, state, function(schema){
        if(kind === 'field'){
          var sec = section(schema, zone.getAttribute('data-section-id') || '') || schema.sections[0];
          var before = zone.getAttribute('data-before-field-id') || '';
          if(STORE.drag.source === 'palette'){
            var item = normField({ type:STORE.drag.type, id:nextId(schema, STORE.drag.type, 'field'), label:fmtType(STORE.drag.type), label_vi:'', width:STORE.drag.type === 'date' || STORE.drag.type === 'time' || STORE.drag.type === 'number' ? 'third' : 'full', options:STORE.drag.type === 'select' || STORE.drag.type === 'multi_select' ? [{ value:'option_1', label:'Option 1', label_vi:'' }, { value:'option_2', label:'Option 2', label_vi:'' }] : [], columns:STORE.drag.type === 'table' ? [{ id:'item', label:'Item', type:'text', width:'40%' }, { id:'value', label:'Value', type:'text', width:'30%' }] : [] }, schema);
            schema.fields.push(item);
            if(before){
              var idx = (sec.field_ids || []).indexOf(before);
              if(idx >= 0) sec.field_ids.splice(idx, 0, item.id);
              else sec.field_ids.push(item.id);
            } else sec.field_ids.push(item.id);
            state.selection = { kind:'field', id:item.id };
          } else if(STORE.drag.source === 'field'){
            (schema.sections || []).forEach(function(s){ s.field_ids = (s.field_ids || []).filter(function(id){ return id !== STORE.drag.id; }); });
            if(before){
              var beforeIdx = (sec.field_ids || []).indexOf(before);
              if(beforeIdx >= 0) sec.field_ids.splice(beforeIdx, 0, STORE.drag.id);
              else sec.field_ids.push(STORE.drag.id);
            } else sec.field_ids.push(STORE.drag.id);
            state.selection = { kind:'field', id:STORE.drag.id };
          }
        } else if(kind === 'section'){
          if(STORE.drag.source === 'palette'){
            var newSec = { id:nextId(schema, 'section', 'section'), title:'New Section', title_vi:'Section moi', description:'', description_vi:'', field_ids:[] };
            var beforeSec = zone.getAttribute('data-before-section-id') || '';
            if(beforeSec){
              var sIdx = (schema.sections || []).findIndex(function(sec){ return sec.id === beforeSec; });
              if(sIdx >= 0) schema.sections.splice(sIdx, 0, newSec); else schema.sections.push(newSec);
            } else schema.sections.push(newSec);
            state.selection = { kind:'section', id:newSec.id };
          } else if(STORE.drag.source === 'section'){
            var moved = section(schema, STORE.drag.id);
            schema.sections = (schema.sections || []).filter(function(sec){ return sec.id !== STORE.drag.id; });
            var beforeId = zone.getAttribute('data-before-section-id') || '';
            if(beforeId){
              var insert = schema.sections.findIndex(function(sec){ return sec.id === beforeId; });
              if(insert >= 0) schema.sections.splice(insert, 0, moved); else schema.sections.push(moved);
            } else schema.sections.push(moved);
            state.selection = { kind:'section', id:STORE.drag.id };
          }
        }
      });
      STORE.drag = null;
    };
  });
}

function promptActionNote(options){
  options = options || {};
  if(typeof window._ecPromptDialog === 'function'){
    return window._ecPromptDialog({
      title: options.title || 'Save schema draft',
      message: options.message || 'Add a short change note for the draft history.',
      placeholder: options.placeholder || 'Example: Added supplier lookup and defect table',
      confirmLabel: options.confirmLabel || 'Continue',
      cancelLabel: options.cancelLabel || 'Cancel'
    });
  }
  try{
    var value = window.prompt(options.fallbackPrompt || 'Change note for this schema draft:', '');
    return Promise.resolve(value == null ? null : String(value).trim());
  }catch(err){
    return Promise.resolve('');
  }
}

function promptDraftNote(){
  return promptActionNote({
    title: 'Save schema draft',
    message: 'Add a short change note for the draft history.',
    placeholder: 'Example: Added supplier lookup and defect table',
    confirmLabel: 'Save draft',
    fallbackPrompt: 'Change note for this schema draft:'
  });
}

function ensureServerWorkingCopy(form, container, state){
  if(typeof window._ecApi !== 'function'){
    toast('Server workflow is not available in this session.', 'warn');
    return Promise.resolve(false);
  }
  if(!state.dirty && hasServerWorkingCopy(state)) return Promise.resolve(true);
  return saveDraftFlow(form, container, state, { prompt:false });
}

function saveDraftFlow(form, container, state, options){
  options = options || {};
  var notePromise = options.prompt === true ? promptDraftNote() : Promise.resolve(options.note || '');
  return notePromise.then(function(note){
    if(note === null) return false;
    try{
      state.savedAt = saveDraft(state.code, state.schema);
      state.source = 'local';
    }catch(err){
      toast('Could not save the local draft.', 'error');
      return false;
    }
    if(typeof window._ecApi !== 'function'){
      state.dirty = false;
      refresh(form, container, state);
      toast('Builder draft saved locally.', 'success');
      return true;
    }
    return window._ecApi('form_schema_save_draft', {
      form_code: form.form_code,
      schema: state.schema,
      change_note: note || ''
    }, 'POST').then(function(resp){
      if(resp && resp.ok){
        syncWorkflowResponse(form, container, state, resp, 'server');
        toast('Builder draft saved to server.', 'success');
        return true;
      }
      state.dirty = false;
      refresh(form, container, state);
      toast('Draft saved locally, but server sync did not complete.', 'warn');
      return false;
    }).catch(function(){
      state.dirty = false;
      refresh(form, container, state);
      toast('Draft saved locally, but server sync failed.', 'warn');
      return false;
    });
  });
}

function submitReviewFlow(form, container, state){
  return ensureServerWorkingCopy(form, container, state).then(function(ok){
    if(!ok) return false;
    return promptActionNote({
      title: 'Submit schema for review',
      message: 'Add a submission note for reviewers.',
      placeholder: 'Example: Ready for QA review after defect block update',
      confirmLabel: 'Submit review',
      fallbackPrompt: 'Submission note for schema review:'
    }).then(function(note){
      if(note === null) return false;
      return window._ecApi('form_schema_submit_review', {
        form_code: form.form_code,
        change_note: note || '',
        update_type: workflowUpdateType(state)
      }, 'POST').then(function(resp){
        if(resp && resp.ok){
          syncWorkflowResponse(form, container, state, resp, 'server');
          toast('Schema submitted for review.', 'success');
          return true;
        }
        toast('Could not submit the schema for review.', 'error');
        return false;
      }).catch(function(err){
        toast(err && err.error === 'missing_draft_schema' ? 'Save a draft before submitting for review.' : 'Could not submit the schema for review.', 'error');
        return false;
      });
    });
  });
}

function publishSchemaFlow(form, container, state){
  return ensureServerWorkingCopy(form, container, state).then(function(ok){
    if(!ok) return false;
    return promptActionNote({
      title: 'Approve and publish schema',
      message: 'Add a release note for this published revision.',
      placeholder: 'Example: Released rev after QA approval',
      confirmLabel: 'Publish',
      fallbackPrompt: 'Release note for this schema publish:'
    }).then(function(note){
      if(note === null) return false;
      return window._ecApi('form_schema_publish', {
        form_code: form.form_code,
        change_note: note || '',
        update_type: workflowUpdateType(state),
        revision: workingRevision(state) || '',
        effective_date: state.schema && state.schema.effective_date ? state.schema.effective_date : ''
      }, 'POST').then(function(resp){
        if(resp && resp.ok){
          syncWorkflowResponse(form, container, state, resp, 'live');
          toast('Schema approved and published.', 'success');
          return true;
        }
        toast('Could not publish the schema.', 'error');
        return false;
      }).catch(function(err){
        toast(err && err.error === 'approve_revision_mismatch' ? 'The working revision changed on the server. Reload and try again.' : 'Could not publish the schema.', 'error');
        return false;
      });
    });
  });
}

function inspectVersionFlow(form, container, state, versionId){
  if(!versionId){
    toast('Version history entry is missing an id.', 'warn');
    return Promise.resolve(false);
  }
  if(state.versionDiff && state.versionDiff.version && state.versionDiff.version.id === versionId){
    state.versionDiff = { loading:false, error:'', version:null, schema:null };
    refresh(form, container, state);
    return Promise.resolve(true);
  }
  state.versionDiff = { loading:true, error:'', version:{ id:versionId }, schema:null };
  refresh(form, container, state);
  return resolveVersionSchema(form, versionId).then(function(resp){
    if(resp && resp.ok && resp.version && resp.schema){
      state.versionDiff = {
        loading:false,
        error:'',
        version: resp.version,
        schema: normalize(form, resp.schema)
      };
      refresh(form, container, state);
      return true;
    }
    state.versionDiff = { loading:false, error:'Could not load the selected version snapshot.', version:null, schema:null };
    refresh(form, container, state);
    return false;
  }).catch(function(){
    state.versionDiff = { loading:false, error:'Could not load the selected version snapshot.', version:null, schema:null };
    refresh(form, container, state);
    return false;
  });
}

function rejectReviewFlow(form, container, state){
  if(typeof window._ecApi !== 'function'){
    toast('Server workflow is not available in this session.', 'warn');
    return Promise.resolve(false);
  }
  return promptActionNote({
    title: 'Reject review and return to draft',
    message: 'Add a review comment for the author.',
    placeholder: 'Example: Missing required validation and approval block note',
    confirmLabel: 'Reject review',
    fallbackPrompt: 'Review rejection note:'
  }).then(function(note){
    if(note === null) return false;
    return window._ecApi('form_schema_reject', {
      form_code: form.form_code,
      reason: note || ''
    }, 'POST').then(function(resp){
      if(resp && resp.ok){
        state.mode = 'design';
        syncWorkflowResponse(form, container, state, resp, 'server');
        toast('Review rejected and returned to draft.', 'success');
        return true;
      }
      toast('Could not reject the review.', 'error');
      return false;
    }).catch(function(err){
      toast(err && err.error === 'nothing_to_reject' ? 'There is no in-review schema to reject.' : 'Could not reject the review.', 'error');
      return false;
    });
  });
}

function rollbackVersionFlow(form, container, state, versionId, versionLabel){
  if(!versionId){
    toast('Version history entry is missing an id.', 'warn');
    return Promise.resolve(false);
  }
  return promptActionNote({
    title: 'Create rollback draft',
    message: 'Add a note for the rollback working copy.',
    placeholder: 'Example: Rebuild draft from last stable released revision',
    confirmLabel: 'Create draft',
    fallbackPrompt: 'Rollback note for ' + (versionLabel || 'this revision') + ':'
  }).then(function(note){
    if(note === null) return false;
    return window._ecApi('form_schema_rollback', {
      form_code: form.form_code,
      version_id: versionId,
      change_note: note || ('Rollback draft created from ' + (versionLabel || 'selected revision'))
    }, 'POST').then(function(resp){
      if(resp && resp.ok){
        state.mode = 'design';
        syncWorkflowResponse(form, container, state, resp, 'server');
        toast('Rollback draft created from ' + (versionLabel || 'the selected revision') + '.', 'success');
        return true;
      }
      toast('Could not create the rollback draft.', 'error');
      return false;
    }).catch(function(){
      toast('Could not create the rollback draft.', 'error');
      return false;
    });
  });
}

function bind(form, container, state){
  var retry = container.querySelector('[data-builder-action="retry-load"]');
  if(retry){ retry.onclick = function(){ ensureLoaded(form, container, state, false, true); }; return; }
  var root = container.querySelector('[data-form-builder]');
  if(!root) return;
  root.onclick = function(ev){
    var btn = ev.target.closest('[data-builder-action]');
    if(btn){
      var action = btn.getAttribute('data-builder-action') || '';
      if(action === 'mode-design'){ state.mode = 'design'; render(form, container, state); bind(form, container, state); return; }
      if(action === 'mode-preview'){ state.mode = 'preview'; render(form, container, state); bind(form, container, state); return; }
      if(action === 'undo'){ undo(form, container, state); return; }
      if(action === 'redo'){ redo(form, container, state); return; }
      if(action === 'save-draft'){ saveDraftFlow(form, container, state, { prompt:true }); return; }
      if(action === 'submit-review'){ submitReviewFlow(form, container, state); return; }
      if(action === 'publish-schema'){ publishSchemaFlow(form, container, state); return; }
      if(action === 'inspect-version'){ inspectVersionFlow(form, container, state, btn.getAttribute('data-version-id') || ''); return; }
      if(action === 'reject-review'){ rejectReviewFlow(form, container, state); return; }
      if(action === 'reload-history'){
        if(state.dirty && !window.confirm('Reload the server workflow and discard unsaved local changes?')) return;
        ensureLoaded(form, container, state, false, true);
        return;
      }
      if(action === 'rollback-version'){ rollbackVersionFlow(form, container, state, btn.getAttribute('data-version-id') || '', btn.getAttribute('data-version-label') || ''); return; }
      if(action === 'export-json'){ var blob = new Blob([JSON.stringify(state.schema, null, 2)], { type:'application/json;charset=utf-8' }); var url = URL.createObjectURL(blob); var a = document.createElement('a'); a.href = url; a.download = (form.form_code || 'form-schema') + '.json'; document.body.appendChild(a); a.click(); document.body.removeChild(a); setTimeout(function(){ URL.revokeObjectURL(url); }, 0); return; }
      if(action === 'reset-live'){ clearDraft(state.code); state.schema = null; state.undo = []; state.redo = []; state.selection = { kind:'form', id:'' }; ensureLoaded(form, container, state, true, true); return; }
      if(action === 'toggle-palette'){ state.paletteOpen = !state.paletteOpen; render(form, container, state); bind(form, container, state); return; }
      if(action === 'add-section'){ withMutation(form, container, state, function(schema){ var sec = { id:nextId(schema, 'section', 'section'), title:'New Section', title_vi:'Section moi', description:'', description_vi:'', field_ids:[] }; schema.sections.push(sec); state.selection = { kind:'section', id:sec.id }; }); return; }
      if(action === 'duplicate-field'){ state.selection = { kind:'field', id:btn.getAttribute('data-field-id') || state.selection.id }; withMutation(form, container, state, function(schema){ var id = duplicateField(schema, state.selection.id); if(id) state.selection = { kind:'field', id:id }; }); return; }
      if(action === 'delete-field'){ state.selection = { kind:'field', id:btn.getAttribute('data-field-id') || state.selection.id }; withMutation(form, container, state, function(schema){ var sec = sectionForField(schema, state.selection.id); schema.fields = (schema.fields || []).filter(function(item){ return item.id !== state.selection.id; }); (schema.sections || []).forEach(function(s){ s.field_ids = (s.field_ids || []).filter(function(id){ return id !== state.selection.id; }); }); state.selection = sec ? { kind:'section', id:sec.id } : { kind:'form', id:'' }; }); return; }
      if(action === 'duplicate-section'){ state.selection = { kind:'section', id:btn.getAttribute('data-section-id') || state.selection.id }; withMutation(form, container, state, function(schema){ var id = duplicateSection(schema, state.selection.id); if(id) state.selection = { kind:'section', id:id }; }); return; }
      if(action === 'delete-section'){ state.selection = { kind:'section', id:btn.getAttribute('data-section-id') || state.selection.id }; if((state.schema.sections || []).length <= 1){ toast('At least one section must remain.', 'warn'); return; } withMutation(form, container, state, function(schema){ var idx = (schema.sections || []).findIndex(function(sec){ return sec.id === state.selection.id; }); var doomed = schema.sections[idx]; var target = schema.sections[idx - 1] || schema.sections[idx + 1]; if(target) target.field_ids = (target.field_ids || []).concat((doomed && doomed.field_ids) || []); schema.sections.splice(idx, 1); state.selection = { kind:'form', id:'' }; }); return; }
      return;
    }
    var sel = ev.target.closest('[data-select-kind]');
    if(sel){ state.selection = { kind:sel.getAttribute('data-select-kind') || 'form', id:sel.getAttribute('data-select-id') || '' }; render(form, container, state); bind(form, container, state); }
  };
  root.onchange = function(ev){
    var input = ev.target.closest('[data-prop-path]');
    if(input) updateProp(form, container, state, input);
  };
  bindDnD(form, container, state);
}

function ensureHotkeys(){
  if(STORE.hotkeys) return;
  STORE.hotkeys = true;
  document.addEventListener('keydown', function(ev){
    var ctx = activeContext();
    if(!ctx) return;
    var typing = ev.target && /INPUT|TEXTAREA|SELECT/.test(ev.target.tagName);
    var key = String(ev.key || '').toLowerCase();
    if((ev.ctrlKey || ev.metaKey) && key === 's'){ ev.preventDefault(); saveDraftFlow(ctx.form, ctx.container, ctx.state, { prompt:false }); return; }
    if((ev.ctrlKey || ev.metaKey) && key === 'z'){ ev.preventDefault(); if(ev.shiftKey) redo(ctx.form, ctx.container, ctx.state); else undo(ctx.form, ctx.container, ctx.state); return; }
    if((ev.ctrlKey || ev.metaKey) && key === 'y'){ ev.preventDefault(); redo(ctx.form, ctx.container, ctx.state); return; }
    if(typing) return;
    if((ev.ctrlKey || ev.metaKey) && key === 'd'){ ev.preventDefault(); var state = ctx.state; if(state.selection.kind === 'field') withMutation(ctx.form, ctx.container, state, function(schema){ var id = duplicateField(schema, state.selection.id); if(id) state.selection = { kind:'field', id:id }; }); else if(state.selection.kind === 'section') withMutation(ctx.form, ctx.container, state, function(schema){ var sid = duplicateSection(schema, state.selection.id); if(sid) state.selection = { kind:'section', id:sid }; }); return; }
    if(key === 'delete' || key === 'backspace'){ ev.preventDefault(); var st = ctx.state; if(st.selection.kind === 'field'){ withMutation(ctx.form, ctx.container, st, function(schema){ var sec = sectionForField(schema, st.selection.id); schema.fields = (schema.fields || []).filter(function(item){ return item.id !== st.selection.id; }); (schema.sections || []).forEach(function(s){ s.field_ids = (s.field_ids || []).filter(function(id){ return id !== st.selection.id; }); }); st.selection = sec ? { kind:'section', id:sec.id } : { kind:'form', id:'' }; }); } else if(st.selection.kind === 'section' && (st.schema.sections || []).length > 1){ withMutation(ctx.form, ctx.container, st, function(schema){ var idx = (schema.sections || []).findIndex(function(sec){ return sec.id === st.selection.id; }); var doomed = schema.sections[idx]; var target = schema.sections[idx - 1] || schema.sections[idx + 1]; if(target) target.field_ids = (target.field_ids || []).concat((doomed && doomed.field_ids) || []); schema.sections.splice(idx, 1); st.selection = { kind:'form', id:'' }; }); } }
  });
}

window._renderFormBuilder = function(form, container){
  try{
    if(typeof window._ecOpenEqmsTemplateEditor === 'function'){
      var code = '';
      if(typeof form === 'string') code = form;
      else if(form && typeof form === 'object') code = form.form_code || form.code || form.html_runtime_form_code || '';
      window._ecOpenEqmsTemplateEditor(code || 'FRM-403-SCAR');
      return;
    }
  }catch(_err){}
  if(!form || !container) return;
  ensureHotkeys();
  var state = ensureState(form);
  if(!state.schema && !state.loading){ ensureLoaded(form, container, state, false); return; }
  render(form, container, state);
  bind(form, container, state);
};

})();
