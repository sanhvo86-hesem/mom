/* ═══════════════════════════════════════════════════
   10-upload-validator.js — Filename Validator (client-side)
   HESEM MOM Portal — Pre-check filenames before SharePoint upload
   Per ANNEX-137 / core-standards/15-evidence-and-records-naming.md
   ═══════════════════════════════════════════════════ */

(function(){
'use strict';

// ── RecordType Dictionary ──
var RECORD_TYPES = [
  'PO','CR','MTR','IQC','TRV','CMM','FAI-BALLOON','COC','PACK','SHIP-LABEL',
  'POD','CONCESSION','REWORK','CUST-APPR','PROVEOUT','OFFSET-LOG','TOOL-WEAR','DOWNTIME',
  'PHOTO-SETUP','PHOTO-FAI','PHOTO-FINAL','PHOTO-PACK','PHOTO-NCR','PHOTO-GEN',
  'NC','CAM','MODEL','DWG','SETUP','INSP','FIXTURE','SIM','CTRL-PLAN',
  'REPORT','CHECKLIST','MINUTES','INPUT-PACK','ACTION-LOG','KPI-REPORT','RISK-REG','MEETING-MIN',
  'OJT','GATE-TEST','CERT-SCAN','SIGNOFF',
  'CAL-CERT','MAINT-LOG','SPEC',
  'SUP-CERT','SUP-AUDIT','SCAR','SUP-EVAL'
];

var ENG_FILE_TYPES = ['NC','CAM','MODEL','DWG','SETUP','INSP','FIXTURE','SIM','CTRL-PLAN'];
var ASSET_PREFIXES = ['FIX','GAGE','TOOL-HOLDER','JIG','COLLET','JAW','CLAMP'];

// ── Regex Patterns ──
var DATE_RE = /20[2-3]\d(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])/;
var HHMM_RE = /([01]\d|2[0-3])[0-5]\d/;
var VER_RE  = /V\d+(\.\d+)?/;
var USERID_RE = /[A-Z][A-Z0-9]{1,3}/;
var ALLOWED_CHARS_RE = /^[A-Za-z0-9\-_\.]+$/;

// Pattern regexes
var P1_RE = new RegExp('^FRM-\\d{3,4}_V\\d+(\\.\\d+)?_.+_\\d{8}_\\d{4}-' + USERID_RE.source + '\\.\\w+$');
var P2_RE = new RegExp('^[A-Z][A-Z0-9\\-]+_JOB-\\d{4}-\\d{4}_.+_\\d{8}_\\d{4}-' + USERID_RE.source + '\\.\\w+$');
var P3_RE = new RegExp('^(' + ENG_FILE_TYPES.join('|') + ')_.+_(OP\\d{2}|ALL)_[A-Z0-9]+_V\\d+(\\.\\d+)?\\.\\w+$');
var P4_RE = new RegExp('^[A-Z][A-Z0-9\\-]+_[A-Z][A-Z0-9\\-]+_\\d{8}_\\d{4}-' + USERID_RE.source + '\\.\\w+$');
var P5_RE = /^FRM-\d{3,4}_.+_V\d+(\.\d+)?\.xlsx$/;
var P6_RE = new RegExp('^(' + ASSET_PREFIXES.join('|') + ')-[A-Z0-9\\-]+_[A-Z\\-]+_\\d{8}_\\d{4}-' + USERID_RE.source + '\\.\\w+$');
var PBL_RE = /^FRM-(306|307)_.+_V\d+/;

/**
 * Validate a filename against ANNEX-137 naming convention.
 * @param {string} filename - The filename to validate (no path).
 * @returns {object} {status: 'PASS'|'FAIL'|'FLAG'|'WARN', pattern: string, issues: string[]}
 */
window.validateFilename = function(filename){
  var result = { status: 'FAIL', pattern: '', issues: [] };

  if(!filename || typeof filename !== 'string'){
    result.issues.push('REJECT: Empty filename');
    return result;
  }

  // Check 1: Allowed characters
  if(!ALLOWED_CHARS_RE.test(filename)){
    result.issues.push('REJECT: Chứa ký tự không hợp lệ (dấu cách hoặc ký tự đặc biệt)');
  }

  // Check 2: Length
  if(filename.length > 120){
    result.issues.push('WARN: Tên file dài quá 120 ký tự (' + filename.length + ')');
  }

  // Check 3: Must have date or version
  if(!DATE_RE.test(filename) && !VER_RE.test(filename)){
    result.issues.push('REJECT: Không có ngày (YYYYMMDD) hoặc version (V#)');
  }

  // Check 4: Match patterns
  var matched = false;

  if(P1_RE.test(filename)){
    result.pattern = 'P1-FormĐãĐiền';
    matched = true;
  } else if(P3_RE.test(filename)){
    result.pattern = 'P3-EngBaseline';
    matched = true;
    var ft = filename.split('_')[0];
    if(ENG_FILE_TYPES.indexOf(ft) === -1){
      result.issues.push('FLAG: FileType "' + ft + '" không trong danh mục engineering');
    }
  } else if(PBL_RE.test(filename)){
    result.pattern = 'P3-BaselineForm';
    matched = true;
  } else if(P5_RE.test(filename)){
    result.pattern = 'P5-FormBlank';
    matched = true;
  } else if(P6_RE.test(filename)){
    result.pattern = 'P6-AssetRecord';
    matched = true;
  } else if(P2_RE.test(filename)){
    result.pattern = 'P2-JobEvidence';
    matched = true;
    var rt = filename.split('_')[0];
    if(RECORD_TYPES.indexOf(rt) === -1){
      result.issues.push('FLAG: RecordType "' + rt + '" không trong dictionary');
    }
  } else if(P4_RE.test(filename)){
    result.pattern = 'P4-NonJobEvidence';
    matched = true;
    var rt2 = filename.split('_')[0];
    if(RECORD_TYPES.indexOf(rt2) === -1){
      result.issues.push('FLAG: RecordType "' + rt2 + '" không trong dictionary');
    }
  }

  if(!matched){
    result.issues.push('REJECT: Không khớp bất kỳ naming pattern nào (xem ANNEX-137)');
  }

  // Determine status
  var hasReject = result.issues.some(function(i){ return i.indexOf('REJECT') === 0; });
  var hasFlag = result.issues.some(function(i){ return i.indexOf('FLAG') === 0; });
  var hasWarn = result.issues.some(function(i){ return i.indexOf('WARN') === 0; });

  if(hasReject) result.status = 'FAIL';
  else if(hasFlag) result.status = 'FLAG';
  else if(hasWarn) result.status = 'WARN';
  else if(matched) result.status = 'PASS';

  return result;
};

/**
 * Render a validation badge for a filename.
 * @param {string} filename
 * @returns {string} HTML string with badge
 */
window.renderFilenameBadge = function(filename){
  var v = validateFilename(filename);
  var colors = {
    PASS: {bg:'#d3f9d8', color:'#2b8a3e', icon:'✓'},
    FAIL: {bg:'#ffe3e3', color:'#c92a2a', icon:'✗'},
    FLAG: {bg:'#fff3bf', color:'#e67700', icon:'⚠'},
    WARN: {bg:'#fff9db', color:'#e67700', icon:'!'}
  };
  var c = colors[v.status] || colors.FAIL;
  var html = '<span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;padding:4px 10px;border-radius:6px;background:' + c.bg + ';color:' + c.color + ';font-weight:600">';
  html += c.icon + ' ' + v.status;
  if(v.pattern) html += ' <span style="font-weight:400;opacity:.7">(' + v.pattern + ')</span>';
  html += '</span>';
  if(v.issues.length > 0){
    html += '<ul style="margin:4px 0 0;padding-left:18px;font-size:11px;color:#6b7280">';
    v.issues.forEach(function(i){ html += '<li>' + i + '</li>'; });
    html += '</ul>';
  }
  return html;
};

})();
