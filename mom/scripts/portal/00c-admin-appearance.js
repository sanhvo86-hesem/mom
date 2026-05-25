/* ============================================================================
   HESEM MOM — Admin Appearance / Graphics Control Plane v3.0
   Enterprise-grade graphics governance studio with 6 sub-tabs, control flow,
   impact analysis, compliance, rollout, rollback, audit and waiver shells.
   Loaded on-demand when admin navigates to Appearance tab.
   ============================================================================ */
(function(){
'use strict';

var _subTab = 'templates';
var _graphicsRefreshStarted = false;
var _graphicsLiveMessage = '';

function T(k){
  var en={
    overview:'Overview',typography:'Typography',colors:'Colors',layout:'Layout & Sizing',effects:'Effects',governance:'Governance',advanced:'Advanced',
    templates:'Templates',tokens:'System Tokens',templateStudio:'Template Studio',searchTemplate:'Search template...',filterCategory:'Filter category',allCategories:'All categories',
    zoneCount:'Zone count',density:'Density',noTemplate:'No template selected',editTemplate:'Edit template',cloneTemplate:'Clone template',deleteTemplate:'Delete template',
    createTemplate:'Create template',templateUsage:'Template usage',modulesUsing:'Modules using',zoneConfig:'Zone configuration',gallery:'Gallery',detail:'Detail',
    editor:'Editor',backToGallery:'Back to gallery',sortByName:'Sort by name',sortByZones:'Sort by zones',sortByCategory:'Sort by category',themeLibrary:'Visual themes',
    previewTheme:'Preview theme',applyTheme:'Apply theme',templatePreset:'Template preset',templateEditor:'Template editor',templateSearchHint:'Find by name, category, density...',
    saveTemplate:'Save template',newTemplate:'New template',templateCategory:'Template category',templateZones:'Template zones',templateDetail:'Template detail',templateCount:'Templates',
    selectedTemplate:'Selected template',noTemplatesFound:'No templates found',templateModules:'Bound modules',templateMeta:'Template metadata',templateState:'Template state',
    layoutContract:'Layout contract',exportTemplates:'Export templates',importTemplates:'Import templates',templateView:'Template view',themePreset:'Theme preset',
    error:'Error',
    presets:'Quick Presets',livePreview:'Live Component Preview',
    compact:'Compact',default:'Default',comfortable:'Comfortable',custom:'Custom',
    light:'Light',dark:'Dark',auto:'Auto (OS)',schedule:'Scheduled',
    sharp:'Sharp',rounded:'Rounded',pill:'Pill',
    normal:'Normal',reduced:'Reduced',off:'Off',
    saveOrg:'Save for Organization',reset:'Reset All',saved:'Settings saved',resetDone:'Reset to defaults',
    fontFamily:'Font Family',fontWeight:'Font Weight',fontSize:'Font Size',lineHeight:'Line Height',
    display:'Display / Hero',heading:'Heading',body:'Body',label:'Label / Caption',mono:'Monospace',
    brand:'Brand Colors',status:'Status Colors',gray:'Gray Scale',surfacesLight:'Surfaces (Light)',surfacesDark:'Surfaces (Dark)',
    textLight:'Text (Light)',textDark:'Text (Dark)',borders:'Borders',
    densityDetail:'Control Sizing',tableDetail:'Table Density',cardBadge:'Cards & Badges',radiusScale:'Radius Scale',
    spacingScale:'Spacing Scale',layoutDim:'Layout Dimensions',zIndex:'Z-Index Stack',
    motion:'Motion & Transitions',shadows:'Shadows',focusRing:'Focus Ring',selectionColor:'Text Selection',
    caretColor:'Caret (Cursor)',placeholder:'Placeholder',disabledState:'Disabled State',scrollbar:'Scrollbar',
    backdrop:'Backdrop & Overlay',skeleton:'Loading Skeleton',
    themePresets:'Theme Presets',customCSS:'Custom CSS Injection',wcag:'WCAG Contrast Check',
    printTheme:'Print Theme',highContrast:'High Contrast',coreStandard:'Core Standard',
    components:'Components',
    btnSettings:'Button',tableSettings:'Table',cardSettings:'Card',badgeSettings:'Badge',
    inputSettings:'Input',tabSettings:'Tab',modalSettings:'Modal/Dialog',
    flowSettings:'Flowchart',isoBox:'ISO Document Box',isoNote:'ISO Note/Callout',
    kpiSettings:'KPI Card',tooltipSettings:'Tooltip',dropdownSettings:'Dropdown',
    navSettings:'Navigation Item',paginationSettings:'Pagination',
    emptySettings:'Empty State',progressSettings:'Progress Bar',
    fieldSettings:'Form Field',breadcrumbSettings:'Breadcrumb',
    paddingY:'Padding Y',paddingX:'Padding X',gap:'Gap',fontWeight:'Font Weight',
    letterSpacing:'Letter Spacing',textTransform:'Text Transform',
    borderWidth:'Border Width',minWidth:'Min Width',headerBg:'Header BG',
    stripeBg:'Stripe BG',stripeAltBg:'Stripe Alt BG',borderStyle:'Border Style',
    bodyShadow:'Shadow',headerPadding:'Header Padding',bodyPadding:'Body Padding',
    nodeBg:'Node BG',nodeBorder:'Node Border',nodeRadius:'Node Radius',nodePadding:'Node Padding',
    connectorColor:'Connector Color',connectorWidth:'Connector Width',arrowSize:'Arrow Size',
    boxBg:'Box BG',boxBorder:'Box Border',boxHeaderBg:'Header BG',
    noteBg:'Note BG',noteBorder:'Note Border',noteBorderLeft:'Left Border',
    importExport:'Import / Export',
    letterSpacing:'Letter Spacing',textTransform:'Text Transform',
    none:'None',uppercase:'UPPERCASE',capitalize:'Capitalize',
    darkFrom:'Dark mode from',darkTo:'to',
    liveHint:'Live preview — changes apply instantly'
  };
  var vi={
    overview:'Tổng quan',typography:'Kiểu chữ',colors:'Màu sắc',layout:'Bố cục',effects:'Hiệu ứng',governance:'Quản trị tuân thủ',advanced:'Nâng cao',
    templates:'Mẫu bố cục',tokens:'Token hệ thống',templateStudio:'Template Studio',searchTemplate:'Tìm kiếm template...',filterCategory:'Lọc nhóm',allCategories:'Tất cả nhóm',
    zoneCount:'Số zone',density:'Mật độ',noTemplate:'Chưa chọn template',editTemplate:'Chỉnh template',cloneTemplate:'Nhân bản template',deleteTemplate:'Xóa template',
    createTemplate:'Tạo template',templateUsage:'Mức sử dụng template',modulesUsing:'Module đang dùng',zoneConfig:'Cấu hình zone',gallery:'Thư viện',detail:'Chi tiết',
    editor:'Biên tập',backToGallery:'Quay lại thư viện',sortByName:'Theo tên',sortByZones:'Theo zones',sortByCategory:'Theo nhóm',themeLibrary:'Bộ giao diện',
    previewTheme:'Xem thử theme',applyTheme:'Áp dụng theme',templatePreset:'Preset template',templateEditor:'Trình biên tập template',templateSearchHint:'Tìm theo tên, nhóm, mật độ...',
    saveTemplate:'Lưu template',newTemplate:'Template mới',templateCategory:'Nhóm template',templateZones:'Các zone',templateDetail:'Chi tiết template',templateCount:'Số template',
    selectedTemplate:'Template đã chọn',noTemplatesFound:'Không tìm thấy template',templateModules:'Module liên kết',templateMeta:'Metadata template',templateState:'Trạng thái template',
    layoutContract:'Hợp đồng bố cục',exportTemplates:'Xuất templates',importTemplates:'Nhập templates',templateView:'Chế độ xem template',themePreset:'Preset giao diện',
    error:'Lỗi',
    presets:'Thiết lập nhanh',livePreview:'Xem trước thành phần',
    compact:'Gọn',default:'Mặc định',comfortable:'Thoải mái',custom:'Tùy chỉnh',
    light:'Sáng',dark:'Tối',auto:'Tự động (OS)',schedule:'Hẹn giờ',
    sharp:'Sắc nét',rounded:'Bo tròn',pill:'Viên thuốc',
    normal:'Bình thường',reduced:'Giảm',off:'Tắt',
    saveOrg:'Lưu cho tổ chức',reset:'Hủy thay đổi xem trước',saved:'Đã lưu cài đặt',resetDone:'Đã hủy thay đổi xem trước',
    fontFamily:'Phông chữ',fontWeight:'Độ đậm',fontSize:'Cỡ chữ',lineHeight:'Chiều cao dòng',
    display:'Hiển thị / Hero',heading:'Tiêu đề',body:'Văn bản',label:'Nhãn / Caption',mono:'Mã nguồn',
    brand:'Màu thương hiệu',status:'Màu trạng thái',gray:'Thang xám',surfacesLight:'Bề mặt (Sáng)',surfacesDark:'Bề mặt (Tối)',
    textLight:'Văn bản (Sáng)',textDark:'Văn bản (Tối)',borders:'Viền',
    densityDetail:'Kích thước control',tableDetail:'Mật độ bảng',cardBadge:'Thẻ & Huy hiệu',radiusScale:'Thang bo góc',
    spacingScale:'Thang khoảng cách',layoutDim:'Kích thước bố cục',zIndex:'Thang Z-Index',
    motion:'Chuyển động',shadows:'Bóng đổ',focusRing:'Viền focus',selectionColor:'Vùng chọn văn bản',
    caretColor:'Con trỏ nhập',placeholder:'Chữ gợi ý',disabledState:'Trạng thái vô hiệu',scrollbar:'Thanh cuộn',
    backdrop:'Lớp phủ & Mờ nền',skeleton:'Hiệu ứng tải',
    themePresets:'Bộ giao diện có sẵn',customCSS:'CSS tùy chỉnh',wcag:'Kiểm tra tương phản WCAG',
    printTheme:'Giao diện in',highContrast:'Tương phản cao',coreStandard:'Tiêu chuẩn lõi',
    components:'Thành phần',
    btnSettings:'Nút bấm',tableSettings:'Bảng dữ liệu',cardSettings:'Thẻ',badgeSettings:'Huy hiệu',
    inputSettings:'Ô nhập',tabSettings:'Tab',modalSettings:'Hộp thoại',
    flowSettings:'Lưu đồ',isoBox:'Hộp tài liệu ISO',isoNote:'Ghi chú ISO',
    kpiSettings:'Thẻ KPI',tooltipSettings:'Chú thích nổi',dropdownSettings:'Menu thả',
    navSettings:'Mục điều hướng',paginationSettings:'Phân trang',
    emptySettings:'Trạng thái rỗng',progressSettings:'Thanh tiến độ',
    fieldSettings:'Trường biểu mẫu',breadcrumbSettings:'Đường dẫn',
    paddingY:'Đệm dọc',paddingX:'Đệm ngang',gap:'Khoảng cách',fontWeight:'Độ đậm chữ',
    letterSpacing:'Giãn chữ',textTransform:'Kiểu chữ hoa',
    borderWidth:'Độ dày viền',minWidth:'Chiều rộng tối thiểu',headerBg:'Nền tiêu đề',
    stripeBg:'Nền sọc',stripeAltBg:'Nền sọc xen kẽ',borderStyle:'Kiểu viền',
    bodyShadow:'Bóng đổ',headerPadding:'Đệm tiêu đề',bodyPadding:'Đệm nội dung',
    nodeBg:'Nền node',nodeBorder:'Viền node',nodeRadius:'Bo góc node',nodePadding:'Đệm node',
    connectorColor:'Màu đường nối',connectorWidth:'Độ dày đường nối',arrowSize:'Cỡ mũi tên',
    boxBg:'Nền hộp',boxBorder:'Viền hộp',boxHeaderBg:'Nền tiêu đề hộp',
    noteBg:'Nền ghi chú',noteBorder:'Viền ghi chú',noteBorderLeft:'Viền trái',
    importExport:'Nhập / Xuất',
    letterSpacing:'Giãn chữ',textTransform:'Kiểu chữ hoa',
    none:'Không',uppercase:'IN HOA',capitalize:'Viết Hoa Đầu',
    darkFrom:'Chế độ tối từ',darkTo:'đến',
    liveHint:'Xem trước trực tiếp — thay đổi áp dụng ngay lập tức'
  };
  return (typeof lang!=='undefined'&&lang==='en') ? (en[k]||k) : (vi[k]||k);
}

function L(vi, en){
  return (typeof lang!=='undefined'&&lang==='en') ? (en || vi) : vi;
}

function announceGraphics(message){
  _graphicsLiveMessage = String(message || '');
  var live = document.getElementById('adm-graphics-live');
  if(live) live.textContent = _graphicsLiveMessage;
}

function esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(v==null?'':String(v))); return d.innerHTML; }
function cfg(path){ return window.HmTheme ? (HmTheme.getDeep(path) || '') : ''; }
function cfgNum(path, def){ var v=cfg(path); return v!==''&&v!==undefined ? parseFloat(v) : def; }

/**
 * _hmSet applies preview CSS variables and in-memory preview config only.
 * Backend graphics authority is promoted through HmGraphicsGovernance contracts,
 * never through this local runtime preview path.
 */
window._hmSet = function(cssVar, path, value){
  if(cssVar && HmTheme.setPreviewVar) HmTheme.setPreviewVar(cssVar, value);          /* instant CSS preview */
  else if(cssVar && typeof showToast === 'function') {
    announceGraphics(L('Theme preview runtime is stale; CSS preview was not applied.', 'Theme preview runtime is stale; CSS preview was not applied.'));
    showToast(L('Theme preview runtime is stale; CSS preview was not applied.', 'Theme preview runtime is stale; CSS preview was not applied.'), 'warning');
  }
  if(HmTheme.setPreviewDeep) HmTheme.setPreviewDeep(path, value);
  else if(typeof showToast === 'function') {
    announceGraphics(L('Theme preview runtime is stale; change was not persisted.', 'Theme preview runtime is stale; change was not persisted.'));
    showToast(L('Theme preview runtime is stale; change was not persisted.', 'Theme preview runtime is stale; change was not persisted.'), 'warning');
  }
  if(typeof window._admGraphicsMarkChange === 'function'){
    window._admGraphicsMarkChange(
      /^components\./.test(String(path || '')) ? 'component-contract' : 'token',
      path || cssVar,
      value
    );
  }
  /* Graphics Authority bridge: route legacy writes through the new draft
     buffer so GraphicsAuthority.preview.simulate() can replay them and
     graphics_simulation_run captures evidence. No-op when 00bb isn't loaded.
     skipPreview=true — this function already wrote to HmTheme above; letting
     stage() call HmTheme again would double the preview pipeline. */
  if(window.GraphicsAuthority && GraphicsAuthority.tokens && GraphicsAuthority.tokens.stage && path){
    try { GraphicsAuthority.tokens.stage(path, value, { skipPreview: true }); }
    catch(_e){ /* swallow, legacy path must not throw */ }
  }
  /* Show dirty notice whenever a preview change is staged */
  var _dn = document.getElementById('adm-appearance-dirty-notice');
  if(_dn) _dn.style.display = '';
};
window._hmSetWithUnit = function(cssVar, path, value, unit){
  var raw = value == null ? '' : String(value);
  var applied = raw;
  if(unit && /^-?\d*\.?\d+$/.test(raw)) applied = raw + unit;
  window._hmSet(cssVar, path, applied);
};

window._admAppearanceSetTab = function(key){
  _subTab = normalizeSubTab(key || _subTab);
  window._appSubTab = _subTab;
  renderAdminAppearance();
  announceGraphics(L('Đã chuyển tab quản trị đồ họa: ', 'Graphics governance tab changed: ') + _subTab);
};

window._admAppearanceTabKeydown = function(event){
  var keys = ['templates','tokens','components','effects','governance','advanced','standard'];
  var idx = keys.indexOf(_subTab);
  if(idx < 0) idx = 0;
  var next = null;
  if(event.key === 'ArrowRight') next = keys[(idx + 1) % keys.length];
  if(event.key === 'ArrowLeft') next = keys[(idx + keys.length - 1) % keys.length];
  if(event.key === 'Home') next = keys[0];
  if(event.key === 'End') next = keys[keys.length - 1];
  if(next){
    event.preventDefault();
    window._admAppearanceSetTab(next);
    setTimeout(function(){
      var btn = document.getElementById('adm-appearance-tab-' + next);
      if(btn && btn.focus) btn.focus();
    }, 0);
  }
};

/* ── Helper: slider + number input ──────────────────────────────────────── */
function slider(label, cssVar, path, min, max, def, unit, step, idSuffix){
  var val = cfgNum(path, def);
  step = step || 1;
  var u = unit || 'px';
  var suffix = idSuffix ? ('_' + String(idSuffix).replace(/[^a-zA-Z0-9_-]/g, '_')) : '';
  var sid = 'adm_s_'+path.replace(/\./g,'_')+suffix;
  var nid = 'adm_n_'+path.replace(/\./g,'_')+suffix;
  /* For unitless values like opacity, ratio — don't append unit */
  var unitArg = '\'' + String(u).replace(/\\/g, '\\\\').replace(/'/g, "\\'") + '\'';
  return '<div class="adm-control-row" data-control="slider" data-css-var="'+esc(cssVar)+'" data-path="'+esc(path)+'" style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    +'<span style="min-width:140px;font-size:12px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'<input type="range" id="'+sid+'" data-role="range" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'
    +' oninput="document.getElementById(\''+nid+'\').value=this.value;_hmSetWithUnit(\''+cssVar+'\',\''+path+'\',this.value,'+unitArg+')"'
    +' style="flex:1;accent-color:var(--brand-2)">'
    +'<input type="number" id="'+nid+'" data-role="number" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'
    +' oninput="document.getElementById(\''+sid+'\').value=this.value;_hmSetWithUnit(\''+cssVar+'\',\''+path+'\',this.value,'+unitArg+')"'
    +' style="width:64px;height:28px;text-align:center;border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px;font-family:var(--font-mono)">'
    +'<span style="font-size:11px;color:var(--text-tertiary);min-width:24px">'+u+'</span>'
    +'</div>';
}

/* ── Helper: color picker + hex ─────────────────────────────────────────── */
function colorPick(label, cssVar, path, def){
  var val = cfg(path) || def || '#000000';
  var cid = 'adm_cp_'+path.replace(/\./g,'_');
  var hid = 'adm_hp_'+path.replace(/\./g,'_');
  return '<div class="adm-control-row" data-control="color" data-css-var="'+esc(cssVar)+'" data-path="'+esc(path)+'" style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
    +'<input type="color" id="'+cid+'" data-role="color" value="'+esc(val)+'"'
    +' oninput="document.getElementById(\''+hid+'\').value=this.value;_hmSet(\''+cssVar+'\',\''+path+'\',this.value)"'
    +' style="width:32px;height:28px;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:1px">'
    +'<input type="text" id="'+hid+'" data-role="text" value="'+esc(val)+'"'
    +' oninput="document.getElementById(\''+cid+'\').value=this.value;_hmSet(\''+cssVar+'\',\''+path+'\',this.value)"'
    +' style="width:80px;height:28px;padding:0 6px;border:1px solid var(--border);border-radius:4px;font-family:var(--font-mono);font-size:11px">'
    +'<span style="font-size:11px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'</div>';
}

/* ── Helper: text input ─────────────────────────────────────────────────── */
function textInput(label, cssVar, path, def, placeholder){
  var val = cfg(path) || def || '';
  return '<div class="adm-control-row" data-control="text" data-css-var="'+esc(cssVar)+'" data-path="'+esc(path)+'" style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    +'<span style="min-width:140px;font-size:12px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'<input type="text" data-role="text" value="'+esc(val)+'"'
    +' oninput="_hmSet(\''+cssVar+'\',\''+path+'\',this.value)"'
    +' placeholder="'+(placeholder||'')+'"'
    +' style="flex:1;height:28px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px">'
    +'</div>';
}

/* Font select: dropdown of popular fonts + preview, with custom option */
var FONT_OPTIONS = [
  {value:"-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif", label:'System Default'},
  {value:"'Inter', -apple-system, 'Segoe UI', sans-serif", label:'Inter'},
  {value:"'Roboto', -apple-system, 'Segoe UI', sans-serif", label:'Roboto'},
  {value:"'Noto Sans', -apple-system, 'Segoe UI', sans-serif", label:'Noto Sans'},
  {value:"'DM Sans', -apple-system, sans-serif", label:'DM Sans'},
  {value:"'Poppins', -apple-system, sans-serif", label:'Poppins'},
  {value:"'Montserrat', -apple-system, sans-serif", label:'Montserrat'},
  {value:"'Open Sans', -apple-system, sans-serif", label:'Open Sans'},
  {value:"'Lato', -apple-system, sans-serif", label:'Lato'},
  {value:"'Source Sans 3', -apple-system, sans-serif", label:'Source Sans 3'},
  {value:"'IBM Plex Sans', -apple-system, sans-serif", label:'IBM Plex Sans'},
  {value:"'Nunito Sans', -apple-system, sans-serif", label:'Nunito Sans'},
  {value:"Georgia, 'Times New Roman', serif", label:'Georgia (Serif)'},
  {value:"'Merriweather', Georgia, serif", label:'Merriweather (Serif)'}
];
var MONO_OPTIONS = [
  {value:"'JetBrains Mono', 'Fira Code', monospace", label:'JetBrains Mono'},
  {value:"'Fira Code', 'SF Mono', monospace", label:'Fira Code'},
  {value:"'SF Mono', Consolas, monospace", label:'SF Mono'},
  {value:"'Cascadia Code', Consolas, monospace", label:'Cascadia Code'},
  {value:"Consolas, 'Courier New', monospace", label:'Consolas'},
  {value:"'Source Code Pro', monospace", label:'Source Code Pro'},
  {value:"'IBM Plex Mono', monospace", label:'IBM Plex Mono'}
];

function fontSelect(label, cssVar, path, def, isMono){
  var val = cfg(path) || def || '';
  var options = isMono ? MONO_OPTIONS : FONT_OPTIONS;
  var sid = 'adm_fs_'+path.replace(/\./g,'_');
  var tid = 'adm_ft_'+path.replace(/\./g,'_');

  var h = '<div class="adm-control-row" data-control="font" data-css-var="'+esc(cssVar)+'" data-path="'+esc(path)+'" style="margin-bottom:10px">';
  h += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:4px">';
  h += '<span style="min-width:140px;font-size:12px;color:var(--text-secondary)">'+esc(label)+'</span>';
  h += '<select id="'+sid+'" data-role="select" onchange="var v=this.value;if(v===\'__custom__\'){document.getElementById(\''+tid+'\').style.display=\'block\';}else{document.getElementById(\''+tid+'\').style.display=\'none\';_hmSet(\''+cssVar+'\',\''+path+'\',v);}" style="flex:1;min-height:var(--hds-control-h,32px);height:auto;padding:var(--input-padding-y,0px) var(--hds-control-px,10px);border:var(--input-border-width,1px) solid var(--border);border-radius:var(--hds-control-radius,var(--radius-md));font-size:var(--hds-control-font,13px);line-height:var(--leading-tight,1.25);background:var(--input-bg,var(--bg-surface));color:var(--text-primary);box-sizing:border-box">';
  var matched = false;
  options.forEach(function(o){
    var selected = val === o.value ? 'selected' : '';
    if(selected) matched = true;
    h += '<option value="'+esc(o.value)+'" '+selected+' style="font-family:'+o.value+'">'+esc(o.label)+'</option>';
  });
  h += '<option value="__custom__" '+(matched?'':'selected')+'>--- Tùy chỉnh / Custom ---</option>';
  h += '</select></div>';
  h += '<input type="text" id="'+tid+'" data-role="text" value="'+esc(val)+'" oninput="_hmSet(\''+cssVar+'\',\''+path+'\',this.value)" placeholder="Nhập font stack tùy ý..." style="display:'+(matched?'none':'block')+';width:100%;height:28px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:11px;font-family:var(--font-mono);margin-top:4px;margin-left:150px">';
  h += '</div>';
  return h;
}

/* ── Helper: radio group ────────────────────────────────────────────────── */
function radioRow(name, options, current, onChange){
  var h = '<div class="adm-control-row" data-control="radio" data-name="'+esc(name)+'" style="display:flex;gap:6px;flex-wrap:wrap">';
  options.forEach(function(o){
    var checked = current===o.value ? 'checked' : '';
    h += '<label style="display:flex;align-items:center;gap:6px;padding:8px 14px;border:2px solid '
      +(checked?'var(--brand-2)':'var(--border)')+';border-radius:var(--radius-lg);cursor:pointer;background:'
      +(checked?'var(--bg-selected)':'var(--bg-surface)')+';flex:1;min-width:100px">'
      +'<input type="radio" name="'+name+'" value="'+o.value+'" '+checked
      +' onchange="'+onChange+'" style="accent-color:var(--brand-2);width:14px;height:14px">'
      +'<span style="font-size:1.1em">'+(o.icon||'')+'</span>'
      +'<span style="font-size:12px;font-weight:600">'+esc(o.label)+'</span>'
      +'</label>';
  });
  return h + '</div>';
}

/* ── Helper: section (collapsible) ──────────────────────────────────────── */
function statusChip(kind, label){
  var map = {
    full: {
      bg: 'color-mix(in srgb,var(--green,#16a34a) 12%,transparent)',
      border: 'color-mix(in srgb,var(--green,#16a34a) 28%,transparent)',
      color: 'var(--green,#15803d)'
    },
    partial: {
      bg: 'color-mix(in srgb,var(--amber,#f57f17) 12%,transparent)',
      border: 'color-mix(in srgb,var(--amber,#f57f17) 28%,transparent)',
      color: 'var(--amber,#d97706)'
    },
    preview: {
      bg: 'color-mix(in srgb,var(--brand-2,#1565c0) 12%,transparent)',
      border: 'color-mix(in srgb,var(--brand-2,#1565c0) 24%,transparent)',
      color: 'var(--brand-2,#1565c0)'
    },
    admin: {
      bg: 'color-mix(in srgb,var(--brand,#0c2d48) 12%,transparent)',
      border: 'color-mix(in srgb,var(--brand,#0c2d48) 24%,transparent)',
      color: 'var(--brand,#0c2d48)'
    }
  };
  var tone = map[kind] || map.preview;
  return '<span style="display:inline-flex;align-items:center;justify-content:center;padding:4px 8px;border-radius:999px;background:'+tone.bg+';border:1px solid '+tone.border+';color:'+tone.color+';font-size:10px;font-weight:800;letter-spacing:.03em;line-height:1;white-space:nowrap">'+esc(label)+'</span>';
}

function infoCard(title, body, kind){
  var tone = {
    full: {
      bg: 'color-mix(in srgb,var(--green,#16a34a) 8%,transparent)',
      border: 'color-mix(in srgb,var(--green,#16a34a) 24%,transparent)',
      title: 'var(--green,#15803d)'
    },
    partial: {
      bg: 'color-mix(in srgb,var(--amber,#f57f17) 8%,transparent)',
      border: 'color-mix(in srgb,var(--amber,#f57f17) 24%,transparent)',
      title: 'var(--amber,#d97706)'
    },
    preview: {
      bg: 'color-mix(in srgb,var(--brand-2,#1565c0) 8%,transparent)',
      border: 'color-mix(in srgb,var(--brand-2,#1565c0) 22%,transparent)',
      title: 'var(--brand-2,#1565c0)'
    },
    admin: {
      bg: 'color-mix(in srgb,var(--brand,#0c2d48) 8%,transparent)',
      border: 'color-mix(in srgb,var(--brand,#0c2d48) 22%,transparent)',
      title: 'var(--brand,#0c2d48)'
    },
    neutral: {
      bg: 'var(--bg-surface-alt,var(--bg-hover))',
      border: 'var(--border)',
      title: 'var(--text-primary)'
    }
  }[kind || 'neutral'];
  return '<div style="padding:12px 14px;border-radius:var(--radius-lg);background:'+tone.bg+';border:1px solid '+tone.border+'">'
    + '<div style="font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;color:'+tone.title+'">'+esc(title)+'</div>'
    + '<div style="margin-top:6px;font-size:12px;line-height:1.65;color:var(--text-secondary)">'+esc(body)+'</div>'
    + '</div>';
}

function sectionLead(title, body, chips){
  return '<div style="margin:0 0 14px;padding:12px 14px;border:1px dashed var(--border);border-radius:var(--radius-lg);background:var(--bg-surface-alt,var(--bg-hover))">'
    + '<div style="display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">'
    + '<div style="min-width:0">'
    + '<div style="font-size:12px;font-weight:800;color:var(--text-primary)">'+esc(title)+'</div>'
    + '<div style="margin-top:4px;font-size:11px;line-height:1.65;color:var(--text-secondary)">'+esc(body)+'</div>'
    + '</div>'
    + (chips ? '<div style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+chips+'</div>' : '')
    + '</div>'
    + '</div>';
}

function sect(title, content, open, metaHtml){
  return '<details style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface);overflow:hidden"'+(open?' open':'')+'>'
    +'<summary style="padding:12px 16px;font-weight:600;font-size:13px;cursor:pointer;background:var(--bg-surface-alt,var(--bg-hover));user-select:none">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;gap:10px;flex-wrap:wrap">'
    +'<span>'+title+'</span>'
    +(metaHtml?'<span style="display:flex;align-items:center;gap:6px;flex-wrap:wrap">'+metaHtml+'</span>':'')
    +'</div>'
    +'</summary>'
    +'<div style="padding:14px 16px">'+content+'</div>'
    +'</details>';
}

function previewBox(title, body, note){
  return '<div class="hm-appearance-preview" data-preview-title="'+esc(title||'Preview')+'" style="margin-top:14px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface-alt,var(--bg-hover))">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">'
    + '<div style="font-size:11px;font-weight:700;color:var(--text-secondary)">'+esc(title||'Preview')+'</div>'
    + (note ? '<div style="font-size:10px;color:var(--text-tertiary)">'+esc(note)+'</div>' : '')
    + '</div>'
    + body
    + '</div>';
}

function previewSwatch(label, bg, color, border){
  return '<div style="min-width:120px;flex:1;padding:10px 12px;border-radius:var(--radius-md);background:'+bg+';color:'+(color||'var(--text-primary)')+';border:'+(border||'1px solid var(--border)')+'">'
    + '<div style="font-size:10px;opacity:.72">'+esc(label)+'</div>'
    + '<div style="font-size:13px;font-weight:700;margin-top:4px">Aa 123</div>'
    + '</div>';
}

function previewScaleRow(label, varName, sample){
  return '<div style="display:flex;align-items:baseline;gap:12px;padding:6px 0;border-bottom:1px dashed var(--border)">'
    + '<span style="min-width:100px;font-size:11px;color:var(--text-tertiary)">'+esc(label)+'</span>'
    + '<span style="font-size:var('+varName+');font-weight:600;color:var(--text-primary)">'+esc(sample)+'</span>'
    + '</div>';
}

function previewTypographyFamily(){
  return previewBox('Preview typography',
    '<div style="display:grid;gap:8px">'
    + '<div style="font-family:var(--font-display,var(--font));font-weight:var(--font-display-weight,700);font-size:28px;line-height:var(--leading-tight,1.25);color:var(--text-primary)">Display / Hero Aa 123</div>'
    + '<div style="font-family:var(--font-heading,var(--font));font-weight:var(--font-heading-weight,600);font-size:20px;line-height:var(--leading-tight,1.25);color:var(--text-primary)">Heading sample</div>'
    + '<div style="font-family:var(--font-body,var(--font));font-weight:var(--font-body-weight,400);font-size:14px;line-height:var(--leading-normal,1.5);color:var(--text-secondary)">Body copy shows how paragraph text, secondary text and reading rhythm look in the current theme.</div>'
    + '<div style="font-family:var(--font-label,var(--font));font-weight:var(--font-label-weight,600);letter-spacing:var(--label-letter-spacing,0);text-transform:var(--label-transform,uppercase);font-size:11px;color:var(--text-tertiary)">quality gate label</div>'
    + '<div style="font-family:var(--font-mono,var(--mono));font-size:12px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);padding:8px 10px;color:var(--text-primary)">SELECT * FROM audit_log WHERE status = \'LIVE\';</div>'
    + '</div>'
  );
}

function previewFontScale(){
  return previewBox('Preview scale',
    '<div style="display:grid;gap:0">'
    + previewScaleRow('XS', '--text-xs', 'Caption / badge text')
    + previewScaleRow('SM', '--text-sm', 'Secondary body copy')
    + previewScaleRow('Base', '--text-base', 'Primary body copy')
    + previewScaleRow('MD', '--text-md', 'Section title')
    + previewScaleRow('LG', '--text-lg', 'Card title')
    + previewScaleRow('XL', '--text-xl', 'Page heading')
    + previewScaleRow('2XL', '--text-2xl', '42 KPI')
    + previewScaleRow('3XL', '--text-3xl', '128 Hero stat')
    + '</div>'
  );
}

function previewLineHeight(){
  function block(title, lh){
    return '<div style="flex:1;min-width:180px;padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">'
      + '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">'+esc(title)+'</div>'
      + '<div style="font-size:13px;line-height:'+lh+';color:var(--text-primary)">Quality documentation should stay readable even in dense screens, mobile forms and dashboard summaries.</div>'
      + '</div>';
  }
  return previewBox('Preview line height',
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + block('Tight', 'var(--leading-tight,1.25)')
    + block('Normal', 'var(--leading-normal,1.5)')
    + block('Relaxed', 'var(--leading-relaxed,1.75)')
    + '</div>'
  );
}

function previewLabelTransform(){
  return previewBox('Preview labels',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<span class="hm-label" style="margin:0">Quality Gate</span>'
    + '<span class="hm-label" style="margin:0">Shopfloor Status</span>'
    + '<span class="hm-badge hm-badge-review">Review</span>'
    + '<span class="hm-badge hm-badge-approved">Approved</span>'
    + '</div>'
  );
}

function previewBrandColors(){
  return previewBox('Preview brand',
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + previewSwatch('Primary', 'var(--brand-2)', 'var(--text-inverse)', '1px solid transparent')
    + previewSwatch('Brand', 'var(--brand)', 'var(--text-inverse)', '1px solid transparent')
    + previewSwatch('Brand Light', 'var(--brand-light)', 'var(--text-inverse)', '1px solid transparent')
    + previewSwatch('Darkest', 'var(--brand-dark)', 'var(--text-inverse)', '1px solid transparent')
    + previewSwatch('Accent', 'var(--accent)', '#111827', '1px solid transparent')
    + previewSwatch('Accent Light', 'var(--accent-light)', '#111827', '1px solid transparent')
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
    + '<button class="hm-btn hm-btn-primary">Primary CTA</button>'
    + '<button class="hm-btn hm-btn-secondary" style="border-color:var(--brand-2);color:var(--brand-2)">Secondary</button>'
    + '</div>'
    + '<div style="margin-top:10px;max-width:280px;border:1px solid color-mix(in srgb, var(--brand-2) 18%, transparent);border-radius:var(--radius-lg);overflow:hidden;display:grid;grid-template-columns:84px 1fr;background:var(--bg-surface)">'
    + '<div style="background:var(--bg-sidebar-light,var(--brand-dark));padding:10px 8px;display:grid;gap:6px;color:#fff">'
    + '<div style="font-size:10px;font-weight:700;opacity:.78">Sidebar</div>'
    + '<div style="padding:6px 8px;border-radius:8px;background:color-mix(in srgb, var(--brand-light) 28%, transparent);font-size:11px">Dashboard</div>'
    + '<div style="padding:6px 8px;border-radius:8px;background:color-mix(in srgb, var(--accent-light) 22%, transparent);font-size:11px;color:var(--accent)">Studio</div>'
    + '</div>'
    + '<div style="padding:10px 12px;background:linear-gradient(135deg,color-mix(in srgb, var(--bg-surface) 90%, var(--brand-2) 10%) 0%, color-mix(in srgb, var(--bg-surface) 92%, var(--accent-light) 8%) 100%)">'
    + '<div style="font-size:10px;font-weight:700;color:var(--text-secondary)">Portal Hero</div>'
    + '<div style="margin-top:6px;font-size:13px;font-weight:700;color:var(--text-primary)">Brand + accent interplay</div>'
    + '<div style="margin-top:6px;font-size:11px;color:var(--text-secondary)">This block shows primary, light brand, accent light and sidebar background together.</div>'
    + '</div>'
    + '</div>'
  );
}

function previewStatusColors(){
  return previewBox('Preview status',
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<span class="hm-badge" style="background:var(--green-light);color:#fff">Success</span>'
    + '<span class="hm-badge" style="background:var(--red-light);color:#fff">Error</span>'
    + '<span class="hm-badge" style="background:var(--amber-light);color:#111827">Warning</span>'
    + '<span class="hm-badge" style="background:var(--blue-light);color:#fff">Info</span>'
    + '<span class="hm-badge" style="background:var(--purple-light);color:#fff">Review</span>'
    + '<span class="hm-badge" style="background:var(--cyan-light);color:#083344">Planned</span>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:10px">'
    + '<span class="hm-badge" style="background:var(--green-dark);color:#0f172a">Dark success</span>'
    + '<span class="hm-badge" style="background:var(--red-dark);color:#0f172a">Dark error</span>'
    + '<span class="hm-badge" style="background:var(--amber-dark);color:#0f172a">Dark warning</span>'
    + '<span class="hm-badge" style="background:var(--blue-dark);color:#0f172a">Dark info</span>'
    + '<span class="hm-badge" style="background:var(--purple-dark);color:#0f172a">Dark review</span>'
    + '<span class="hm-badge" style="background:var(--cyan-dark);color:#0f172a">Dark planned</span>'
    + '</div>'
  );
}

function previewSurfaceStack(mode){
  var page = 'var(--bg-page-'+mode+')';
  var surface = 'var(--bg-surface-'+mode+')';
  var alt = 'var(--bg-surface-alt-'+mode+')';
  var header = 'var(--bg-header-'+mode+')';
  var modal = 'var(--bg-modal-'+mode+')';
  var hover = 'var(--bg-hover-'+mode+')';
  var sidebar = mode === 'light' ? 'var(--bg-sidebar-light)' : 'var(--bg-sidebar-dark)';
  var text = 'var(--text-primary-'+mode+')';
  var muted = mode === 'light' ? 'var(--text-secondary-light)' : 'var(--text-secondary-dark)';
  var border = mode === 'light' ? 'var(--border-light)' : 'var(--border-dark)';
  return previewBox('Preview '+mode+' surfaces',
    '<div style="padding:12px;border-radius:var(--radius-lg);background:'+page+';border:1px solid '+border+'">'
    + '<div style="display:grid;grid-template-columns:minmax(84px,104px) 1fr;gap:10px;align-items:stretch">'
    + '<div style="padding:10px;border-radius:var(--radius-md);background:'+sidebar+';border:1px solid '+border+';color:var(--text-inverse-'+mode+')">'
    + '<div style="font-size:10px;font-weight:700;opacity:.8">Sidebar</div>'
    + '<div style="margin-top:8px;padding:6px 8px;border-radius:8px;background:color-mix(in srgb, '+hover+' 92%, transparent)">Active nav</div>'
    + '</div>'
    + '<div style="padding:0;border-radius:var(--radius-md);background:'+surface+';border:1px solid '+border+';color:'+text+';overflow:hidden">'
    + '<div style="padding:10px 12px;background:'+header+';border-bottom:1px solid '+border+';font-size:12px;font-weight:700">Header surface</div>'
    + '<div style="padding:12px">'
    + '<div style="font-size:13px;font-weight:700">Surface</div>'
    + '<div style="font-size:12px;color:'+muted+';margin-top:4px">Nested layers show page, header, modal, hover and alternate surface.</div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:8px;margin-top:10px">'
    + '<div style="padding:10px;border-radius:var(--radius-md);background:'+alt+';border:1px solid '+border+'">Surface Alt</div>'
    + '<div style="padding:10px;border-radius:var(--radius-md);background:'+modal+';border:1px solid '+border+'">Modal</div>'
    + '<div style="padding:10px;border-radius:var(--radius-md);background:'+hover+';border:1px dashed '+border+'">Hover layer</div>'
    + '</div>'
    + '</div></div>'
    + '</div>'
    + '</div>'
  );
}

function previewTextColors(mode){
  var bg = mode === 'light' ? 'var(--bg-surface-light)' : 'var(--bg-surface-dark)';
  var primary = mode === 'light' ? 'var(--text-primary-light)' : 'var(--text-primary-dark)';
  var secondary = mode === 'light' ? 'var(--text-secondary-light)' : 'var(--text-secondary-dark)';
  var tertiary = mode === 'light' ? 'var(--text-tertiary-light)' : 'var(--text-tertiary-dark)';
  var link = mode === 'light' ? 'var(--text-link-light)' : 'var(--text-link-dark)';
  var inverse = mode === 'light' ? 'var(--text-inverse-light)' : 'var(--text-inverse-dark)';
  return previewBox('Preview '+mode+' text',
    '<div style="padding:12px;border-radius:var(--radius-lg);background:'+bg+';border:1px solid var(--border)">'
    + '<div style="color:'+primary+';font-weight:700">Primary text</div>'
    + '<div style="color:'+secondary+';margin-top:4px">Secondary text explains context and metadata.</div>'
    + '<div style="color:'+tertiary+';margin-top:4px">Muted text for helper or support content.</div>'
    + '<div style="color:'+link+';margin-top:6px;font-weight:600">Link / action text</div>'
    + '<div style="margin-top:10px;padding:8px 10px;border-radius:var(--radius-md);background:'+primary+';color:'+inverse+'">Inverse text sample</div>'
    + '</div>'
  );
}

function previewBorderColors(){
  return previewBox('Preview borders',
    '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Light</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + previewSwatch('Border', 'var(--bg-surface-light)', 'var(--text-primary-light)', '2px solid var(--border-light)')
    + previewSwatch('Focus', 'var(--bg-surface-light)', 'var(--text-primary-light)', '2px solid var(--border-focus-light)')
    + previewSwatch('Error', 'var(--bg-surface-light)', 'var(--text-primary-light)', '2px solid var(--border-error-light)')
    + previewSwatch('Success', 'var(--bg-surface-light)', 'var(--text-primary-light)', '2px solid var(--border-success-light)')
    + '</div>'
    + '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin:12px 0 8px">Dark</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + previewSwatch('Border', 'var(--bg-surface-dark)', 'var(--text-primary-dark)', '2px solid var(--border-dark)')
    + previewSwatch('Focus', 'var(--bg-surface-dark)', 'var(--text-primary-dark)', '2px solid var(--border-focus-dark)')
    + previewSwatch('Error', 'var(--bg-surface-dark)', 'var(--text-primary-dark)', '2px solid var(--border-error-dark)')
    + previewSwatch('Success', 'var(--bg-surface-dark)', 'var(--text-primary-dark)', '2px solid var(--border-success-dark)')
    + '</div>'
  );
}

function previewDensityControls(){
  return previewBox('Preview control sizing',
    '<div style="display:grid;gap:10px">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<button class="hm-btn hm-btn-sm hm-btn-secondary">Small</button>'
    + '<button class="hm-btn hm-btn-primary">Default</button>'
    + '<button class="hm-btn hm-btn-lg hm-btn-secondary">Large</button>'
    + '<input class="hm-input" value="Input sizing" style="max-width:180px">'
    + '<span class="hm-badge hm-badge-review"><i style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:currentColor;color:var(--text-inverse,#fff)">i</i>Badge</span>'
    + '</div>'
    + '<div style="display:flex;gap:10px;flex-wrap:wrap">'
    + '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">'
    + '<span style="font-size:var(--hds-icon-sm);width:var(--hds-icon-sm);height:var(--hds-icon-sm);display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:var(--brand-2);color:#fff">S</span>'
    + '<span style="font-size:11px;color:var(--text-secondary)">Icon sm</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">'
    + '<span style="font-size:var(--hds-icon-md);width:var(--hds-icon-md);height:var(--hds-icon-md);display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:var(--green);color:#fff">M</span>'
    + '<span style="font-size:11px;color:var(--text-secondary)">Icon md</span>'
    + '</div>'
    + '<div style="display:flex;align-items:center;gap:8px;padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">'
    + '<span style="font-size:var(--hds-icon-lg);width:var(--hds-icon-lg);height:var(--hds-icon-lg);display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:var(--amber);color:#111827">L</span>'
    + '<span style="font-size:11px;color:var(--text-secondary)">Icon lg</span>'
    + '</div>'
    + '</div>'
    + '</div>'
  );
}

function previewTableDensity(){
  return previewBox('Preview table',
    '<table class="hm-table"><thead><tr><th>Code</th><th>Status</th><th>Owner</th></tr></thead><tbody>'
    + '<tr><td>WI-201</td><td><span class="hm-badge hm-badge-approved">Live</span></td><td>QA</td></tr>'
    + '<tr><td>SOP-604</td><td><span class="hm-badge hm-badge-review">Review</span></td><td>Ops</td></tr>'
    + '</tbody></table>'
  );
}

function previewRadiusScale(){
  return previewBox('Preview radius',
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface)">SM</div>'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">MD</div>'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)">LG</div>'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-xl);background:var(--bg-surface)">XL</div>'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-2xl);background:var(--bg-surface)">2XL</div>'
    + '</div>'
  );
}

function previewSpacingScale(){
  function gapSample(token, value){
    return '<div style="display:grid;gap:6px">'
      + '<div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:var(--text-secondary)"><span>'+token+'</span><span>'+value+'</span></div>'
      + '<div style="display:flex;align-items:center">'
      + '<div style="width:22px;height:22px;border-radius:var(--radius-md);background:var(--brand-2)"></div>'
      + '<div style="width:'+value+';min-width:'+value+';height:6px;border-radius:999px;background:color-mix(in srgb, var(--brand-2) 28%, transparent);margin:0 4px"></div>'
      + '<div style="width:22px;height:22px;border-radius:var(--radius-md);background:var(--brand-light)"></div>'
      + '</div>'
      + '</div>';
  }
  return previewBox('Preview spacing',
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(132px,1fr));gap:10px;background:var(--bg-surface);padding:var(--space-4);border:1px solid var(--border);border-radius:var(--radius-lg)">'
    + gapSample('space-1', 'var(--space-1)')
    + gapSample('space-2', 'var(--space-2)')
    + gapSample('space-3', 'var(--space-3)')
    + gapSample('space-4', 'var(--space-4)')
    + gapSample('space-5', 'var(--space-5)')
    + gapSample('space-6', 'var(--space-6)')
    + gapSample('space-8', 'var(--space-8)')
    + gapSample('space-10', 'var(--space-10)')
    + '</div>'
  );
}

function previewLayoutDimensions(){
  return previewBox('Preview layout dimensions',
    '<div style="border:1px solid var(--border);border-radius:var(--radius-lg);overflow:hidden;background:var(--bg-page)">'
    + '<div style="display:flex;height:180px">'
    + '<div style="display:grid;grid-template-columns:min(132px,calc(var(--sidebar-w,260px) / 2.2)) min(54px,calc(var(--sidebar-w-collapsed,72px) / 1.2));gap:6px;padding:10px;background:var(--bg-page);border-right:1px solid var(--border)">'
    + '<div style="background:var(--brand);color:#fff;padding:12px;border-radius:var(--radius-md)">Sidebar</div>'
    + '<div style="background:color-mix(in srgb, var(--brand) 78%, #fff 22%);color:#fff;padding:12px 6px;border-radius:var(--radius-md);text-align:center">Mini</div>'
    + '</div>'
    + '<div style="flex:1;background:var(--bg-surface)">'
    + '<div style="height:var(--header-h,52px);max-height:70px;background:var(--bg-header,var(--bg-surface-alt));border-bottom:1px solid var(--border);padding:0 12px;display:flex;align-items:center">Header</div>'
    + '<div style="padding:12px">'
    + '<div style="max-width:min(100%,calc(var(--content-max-w,1400px) / 2.7));padding:10px 12px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt)">Content max width</div>'
    + '<div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap">'
    + '<div style="width:min(100%,calc(var(--modal-max-w,800px) / 3));padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-modal)">Modal max</div>'
    + '<div style="width:min(100%,calc(var(--modal-sm-max-w,480px) / 2));padding:8px 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-modal)">Modal sm</div>'
    + '</div>'
    + '</div></div></div></div>'
  );
}

var ADMIN_LAYOUT_PRESETS = {
  compact: {
    gapLg: '16px',
    gapMd: '12px',
    gapSm: '6px',
    panelPadding: '16px',
    cardPadding: '14px',
    rowPadding: '10px',
    panelRadius: '16px',
    surfaceRadius: '14px',
    nestedRadius: '10px'
  },
  default: {
    gapLg: '18px',
    gapMd: '14px',
    gapSm: '8px',
    panelPadding: '18px',
    cardPadding: '18px',
    rowPadding: '12px',
    panelRadius: '20px',
    surfaceRadius: '18px',
    nestedRadius: '14px'
  },
  comfortable: {
    gapLg: '22px',
    gapMd: '16px',
    gapSm: '10px',
    panelPadding: '20px',
    cardPadding: '20px',
    rowPadding: '14px',
    panelRadius: '22px',
    surfaceRadius: '20px',
    nestedRadius: '16px'
  }
};

window._hmApplyAdminLayoutTemplate = function(template){
  var next = String(template || 'default');
  var payload = { layout: { admin: { template: next } } };
  if(ADMIN_LAYOUT_PRESETS[next]){
    payload.layout.admin = Object.assign({ template: next }, ADMIN_LAYOUT_PRESETS[next]);
  }
  if(HmTheme.setPreviewAll) HmTheme.setPreviewAll(payload);
  else if(HmTheme.setPreviewDeep){
    HmTheme.setPreviewDeep('layout.admin', payload.layout.admin);
  } else {
    announceGraphics(L('Layout preview runtime is stale; draft was not cached.', 'Layout preview runtime is stale; draft was not cached.'));
    if(typeof showToast === 'function') showToast(L('Layout preview runtime is stale; draft was not cached.', 'Layout preview runtime is stale; draft was not cached.'), 'warning');
    return;
  }
  if(typeof renderAdminAppearance === 'function') renderAdminAppearance();
};

function previewAdminLayoutTemplate(){
  return previewBox(
    L('Xem trước layout admin', 'Preview admin layout'),
    '<div style="padding:var(--admin-panel-padding,18px);border:1px solid var(--border);border-radius:var(--admin-panel-radius,20px);background:var(--bg-page)">'
    + '<div style="display:grid;grid-template-columns:minmax(150px,190px) 1fr;gap:var(--admin-gap-lg,18px);align-items:start">'
    + '<div style="display:grid;gap:var(--admin-gap-md,14px);padding:var(--admin-card-padding,18px);border:1px solid var(--border);border-radius:var(--admin-panel-radius,20px);background:linear-gradient(165deg,color-mix(in srgb, var(--bg-surface,#fff) 94%, var(--brand-2,#1565c0) 6%) 0%,color-mix(in srgb, var(--bg-surface,#fff) 95%, var(--brand-light,#60a5fa) 5%) 100%)">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary)">Rail</div>'
    + '<div style="display:grid;gap:var(--admin-gap-sm,8px)">'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:rgba(255,255,255,.78)">Section A</div>'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:rgba(255,255,255,.78)">Section B</div>'
    + '</div>'
    + '</div>'
    + '<div style="display:grid;gap:var(--admin-gap-lg,18px)">'
    + '<div style="padding:var(--admin-card-padding,18px);border:1px solid var(--border);border-radius:var(--admin-surface-radius,18px);background:linear-gradient(135deg,color-mix(in srgb, var(--bg-surface,#fff) 90%, var(--brand-2,#1565c0) 6%) 0%,color-mix(in srgb, var(--bg-surface,#fff) 92%, var(--amber,#f59e0b) 8%) 100%);display:grid;gap:var(--admin-gap-sm,8px)">'
    + '<div style="font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:var(--text-secondary)">Hero</div>'
    + '<div style="height:10px;width:48%;border-radius:999px;background:color-mix(in srgb, var(--brand-2,#1565c0) 18%, transparent)"></div>'
    + '<div style="height:10px;width:76%;border-radius:999px;background:color-mix(in srgb, var(--brand-2,#1565c0) 10%, transparent)"></div>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--admin-gap-md,14px)">'
    + '<div style="padding:var(--admin-card-padding,18px);border:1px solid var(--border);border-radius:var(--admin-surface-radius,18px);background:var(--bg-surface);display:grid;gap:var(--admin-gap-md,14px)">'
    + '<div style="height:12px;width:56%;border-radius:999px;background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '</div>'
    + '<div style="padding:var(--admin-card-padding,18px);border:1px solid var(--border);border-radius:var(--admin-surface-radius,18px);background:var(--bg-surface);display:grid;gap:var(--admin-gap-sm,8px)">'
    + '<div style="height:12px;width:48%;border-radius:999px;background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '<div style="display:grid;gap:var(--admin-gap-sm,8px)">'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '<div style="padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:var(--bg-surface-alt,var(--bg-hover))"></div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    + '</div>',
    L('Preset đổi đồng thời gap, padding và radius của toàn bộ admin shell.', 'Presets update gap, padding, and radius together across the admin shell.')
  );
}

function previewMotion(){
  return previewBox('Preview motion',
    '<style>@keyframes hmAppearancePulse{0%{transform:translateX(0)}100%{transform:translateX(18px)}}</style>'
    + '<div style="display:grid;gap:10px">'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px">'
    + '<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)"><div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Fast</div><div style="width:22px;height:22px;border-radius:999px;background:var(--brand-2);animation:hmAppearancePulse var(--transition-fast) ease-in-out infinite alternate"></div></div>'
    + '<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)"><div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Normal</div><div style="width:22px;height:22px;border-radius:999px;background:var(--green);animation:hmAppearancePulse var(--transition-normal) ease-in-out infinite alternate"></div></div>'
    + '<div style="padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)"><div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Slow</div><div style="width:22px;height:22px;border-radius:999px;background:var(--amber);animation:hmAppearancePulse var(--transition-slow) ease-in-out infinite alternate"></div></div>'
    + '</div>'
    + '<div style="padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface);transition:transform var(--transition-spring),box-shadow var(--transition-spring);cursor:pointer" onmouseenter="this.style.transform=\'translateY(-4px)\';this.style.boxShadow=\'var(--shadow-lg)\'" onmouseleave="this.style.transform=\'none\';this.style.boxShadow=\'none\'">Spring timing stays available on hover, while the animated dots above give you an always-on speed preview.</div>'
    + '</div>',
    'Animated dots update live with fast, normal and slow motion values.'
  );
}

function previewFocus(){
  return previewBox('Preview focus ring',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<div style="padding:10px 14px;border-radius:var(--radius-md);background:var(--bg-surface);box-shadow:0 0 0 var(--focus-ring-width,3px) var(--focus-ring-color,rgba(21,101,192,0.12));outline:1px dashed color-mix(in srgb, var(--focus-ring-color,rgba(21,101,192,0.12)) 72%, #000 8%);outline-offset:var(--focus-ring-offset,0px)">Static ring sample</div>'
    + '<input class="hm-input" placeholder="Tab into me" style="max-width:220px">'
    + '<button class="hm-btn hm-btn-primary">Focusable button</button>'
    + '</div>',
    'The left sample mirrors width, color and offset immediately.'
  );
}

function previewSelection(){
  return previewBox('Preview selection',
    '<div style="display:grid;gap:8px">'
    + '<div style="display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 12px;border-radius:var(--radius-md);background:var(--selection-bg);color:var(--selection-color);font-weight:700;width:max-content">Selection preview chip</div>'
    + '<div style="padding:10px 12px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--text-primary)">Drag to select this sentence and verify browser text selection colors too.</div>'
    + '</div>'
  );
}

function previewCaret(){
  return previewBox('Preview caret', '<textarea class="hm-input hm-textarea" style="max-width:100%" rows="3">Place cursor here to inspect caret color.</textarea>');
}

function previewPlaceholder(){
  return previewBox('Preview placeholder',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<input class="hm-input" placeholder="Placeholder preview" style="max-width:220px">'
    + '<div style="padding:10px 12px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--placeholder-color)">Placeholder label sample</div>'
    + '</div>'
  );
}

function previewDisabled(){
  return previewBox('Preview disabled state',
    '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<div style="opacity:var(--disabled-opacity);display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
    + '<button class="hm-btn hm-btn-primary" disabled>Disabled button</button>'
    + '<input class="hm-input" disabled value="Disabled input" style="max-width:180px">'
    + '</div>'
    + '<div style="padding:10px 12px;border:1px dashed var(--border);border-radius:var(--radius-md);background:var(--bg-surface);opacity:var(--disabled-opacity)">Opacity mirror</div>'
    + '</div>'
  );
}

function previewScrollbar(){
  var lines = Array(10).fill('<div style="padding:6px 0;border-bottom:1px dashed var(--border)">Scrollable preview content</div>').join('');
  return previewBox('Preview scrollbar',
    '<div style="display:grid;gap:10px">'
    + '<div style="display:flex;align-items:center;gap:10px">'
    + '<div style="width:120px;height:var(--scrollbar-width);border-radius:var(--scrollbar-radius);background:var(--scrollbar-track);position:relative;overflow:hidden">'
    + '<div style="width:42%;height:100%;border-radius:var(--scrollbar-radius);background:var(--scrollbar-thumb)"></div>'
    + '</div>'
    + '<span style="font-size:11px;color:var(--text-secondary)">Track + thumb mirror</span>'
    + '</div>'
    + '<div style="max-height:110px;overflow:auto;padding:0 10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface)">'+lines+'</div>'
    + '</div>'
  );
}

function previewBackdrop(){
  return previewBox('Preview backdrop',
    '<div style="position:relative;height:120px;overflow:hidden;border-radius:var(--radius-lg);background:linear-gradient(135deg,var(--brand-light) 0%,var(--accent-light) 100%)">'
    + '<div style="position:absolute;inset:0;background:rgba(15,23,42,var(--overlay-opacity,0.4));backdrop-filter:blur(var(--backdrop-blur,0px))"></div>'
    + '<div style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);min-width:180px;padding:12px 14px;border:1px solid rgba(255,255,255,.25);border-radius:var(--radius-lg);background:rgba(255,255,255,.16);color:#fff;font-weight:700;text-align:center">Overlay preview</div>'
    + '</div>'
  );
}

function previewButtons(){
  return previewBox(
    L('Xem trước nút bấm', 'Button preview'),
    '<div style="display:grid;gap:10px">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="hm-btn hm-btn-primary"><span class="hm-btn-icon">🚀</span><span class="hm-btn-label">'+esc(L('Chính', 'Primary'))+'</span></button>'
    + '<button class="hm-btn hm-btn-secondary"><span class="hm-btn-icon">📄</span><span class="hm-btn-label">'+esc(L('Phụ', 'Secondary'))+'</span></button>'
    + '<button class="hm-btn hm-btn-ghost"><span class="hm-btn-icon">🧭</span><span class="hm-btn-label">'+esc(L('Nền trong', 'Ghost'))+'</span></button>'
    + '<button class="hm-btn hm-btn-danger"><span class="hm-btn-icon">⚠️</span><span class="hm-btn-label">'+esc(L('Nguy hiểm', 'Danger'))+'</span></button>'
    + '</div>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<button class="hm-btn hm-btn-primary hm-btn-icon-only" aria-label="'+esc(L('Lưu', 'Save'))+'"><span class="hm-btn-icon">💾</span></button>'
    + '<button class="hm-btn hm-btn-secondary hm-btn-icon-only" aria-label="'+esc(L('Tìm kiếm', 'Search'))+'"><span class="hm-btn-icon">🔍</span></button>'
    + '<button class="hm-btn hm-btn-ghost hm-btn-icon-only" aria-label="'+esc(L('Bố cục', 'Layout'))+'"><span class="hm-btn-icon">↔</span></button>'
    + '<button class="hm-btn hm-btn-danger hm-btn-icon-only" aria-label="'+esc(L('Xóa', 'Delete'))+'"><span class="hm-btn-icon">🗑</span></button>'
    + '</div>'
    + '</div>',
    L('Dùng mẫu này để chỉnh nhịp icon kèm chữ và icon độc lập trước khi áp dụng cùng quy tắc cho toàn hệ thống.', 'Use these samples to tune icon-leading vs icon-only rhythm before applying the same rule system-wide.')
  );
}

function previewTable(){
  return previewBox('Preview table', '<table class="hm-table"><thead><tr><th>Code</th><th>Owner</th><th>Status</th></tr></thead><tbody><tr><td>ANNEX-120</td><td>QA</td><td><span class="hm-badge hm-badge-approved">Live</span></td></tr><tr><td>WI-519</td><td>MES</td><td><span class="hm-badge hm-badge-review">Review</span></td></tr></tbody></table>');
}

function previewCard(){
  return previewBox('Preview card',
    '<div style="border:var(--card-border-width,1px) solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface);overflow:hidden">'
    + '<div style="padding:var(--card-header-padding-v,12px) 16px;background:var(--card-header-bg,transparent);border-bottom:1px solid var(--border);font-weight:700;color:var(--text-primary)">Card header</div>'
    + '<div style="padding:var(--card-body-padding,16px);color:var(--text-secondary)">Body preview for card padding, header background and border width.</div>'
    + '</div>'
  );
}

function previewBadges(){
  return previewBox('Preview badge', '<div style="display:flex;gap:8px;flex-wrap:wrap"><span class="hm-badge hm-badge-approved">Approved</span><span class="hm-badge hm-badge-review">Review</span><span class="hm-badge hm-badge-planned">Planned</span><span class="hm-badge hm-badge-cancelled">Rejected</span></div>');
}

function previewInputs(){
  return previewBox('Preview input', '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"><input class="hm-input" placeholder="Text input"><select class="hm-input hm-select"><option>Select option</option></select><textarea class="hm-input hm-textarea" rows="3" placeholder="Textarea preview"></textarea></div>');
}

function previewTabs(){
  return previewBox('Preview tab',
    '<div style="display:grid;gap:10px">'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap"><button type="button" class="admin-tab-v2"><span class="admin-tab-icon">👥</span><span class="admin-tab-label">Users</span><span class="tab-badge">20</span></button><button type="button" class="admin-tab-v2 active"><span class="admin-tab-icon">🎨</span><span class="admin-tab-label">Appearance</span></button><button type="button" class="admin-tab-v2"><span class="admin-tab-icon">🌐</span><span class="admin-tab-label">Portal</span></button></div>'
    + '<div class="hm-tabs" style="margin-bottom:0"><button class="hm-tab active"><span class="hm-tab-icon">📊</span><span class="hm-tab-label">Overview</span></button><button class="hm-tab"><span class="hm-tab-icon">⚙️</span><span class="hm-tab-label">Runtime</span></button><button class="hm-tab"><span class="hm-tab-icon">🕘</span><span class="hm-tab-label">History</span></button></div>'
    + '</div>',
    'Admin tabs expose radius, padding, gap and active indicator without hover.'
  );
}

function previewModal(){
  return previewBox('Preview modal',
    '<div style="display:flex;justify-content:center;padding:8px 0">'
    + '<div class="hm-form-modal" style="position:static;max-height:none;box-shadow:var(--shadow-lg);margin:0">'
    + '<div class="hm-form-modal-header"><h3>Modal title</h3><button class="hm-btn hm-btn-ghost hm-btn-sm">Close</button></div>'
    + '<div style="color:var(--text-secondary)">Preview body for modal radius, padding and header spacing.</div>'
    + '<div class="hm-form-modal-actions"><button class="hm-btn hm-btn-secondary">Cancel</button><button class="hm-btn hm-btn-primary">Confirm</button></div>'
    + '</div></div>'
  );
}

function previewFlow(){
  return previewBox('Preview flow',
    '<div style="display:flex;align-items:center;justify-content:center;gap:18px;padding:10px 0">'
    + '<div style="padding:var(--flow-node-padding,12px);border:var(--flow-node-border-w,2px) solid var(--flow-node-border-color,var(--border));border-radius:var(--flow-node-radius,8px);background:var(--flow-node-bg,var(--bg-surface));font-size:13px;font-weight:700;color:var(--text-primary)">Source</div>'
    + '<div style="position:relative;width:110px;height:max(2px,var(--flow-connector-width,2px));background:var(--flow-connector-color,var(--border))"><span style="position:absolute;right:-1px;top:50%;width:0;height:0;border-top:calc(var(--flow-arrow-size,8px) / 2) solid transparent;border-bottom:calc(var(--flow-arrow-size,8px) / 2) solid transparent;border-left:var(--flow-arrow-size,8px) solid var(--flow-connector-color,var(--border));transform:translateY(-50%)"></span></div>'
    + '<div style="padding:var(--flow-node-padding,12px);border:var(--flow-node-border-w,2px) solid var(--flow-node-border-color,var(--border));border-radius:var(--flow-node-radius,8px);background:var(--flow-node-bg,var(--bg-surface));font-size:13px;font-weight:700;color:var(--text-primary)">Target</div>'
    + '</div>'
  );
}

function previewIsoBox(){
  return previewBox('Preview ISO box',
    '<div style="border:var(--iso-box-border-w,1px) solid var(--border);border-radius:var(--iso-box-radius,8px);background:var(--iso-box-bg,var(--bg-surface));overflow:hidden">'
    + '<div style="padding:var(--iso-box-header-padding,10px 14px);background:var(--iso-box-header-bg,var(--bg-surface-alt));font-size:var(--iso-box-font-size,13px);font-weight:700;color:var(--text-primary)">ISO Header</div>'
    + '<div style="padding:var(--iso-box-body-padding,14px);font-size:var(--iso-box-font-size,13px);color:var(--text-secondary)">Document body preview with configurable box background, radius and padding.</div>'
    + '</div>'
  );
}

function previewIsoNote(){
  return previewBox('Preview ISO note',
    '<div style="display:flex;gap:10px;align-items:flex-start;padding:var(--iso-note-padding,10px 14px);border:1px solid var(--iso-note-border-color,#fcd34d);border-left:var(--iso-note-border-left-w,4px) solid var(--iso-note-border-left-color,#f59e0b);border-radius:var(--iso-note-radius,6px);background:var(--iso-note-bg,#fffbeb);font-size:var(--iso-note-font-size,13px);color:#713f12">'
    + '<div style="font-size:var(--iso-note-icon-size,16px);line-height:1">!</div>'
    + '<div><strong style="display:block;margin-bottom:4px">Attention note</strong><span>Use this preview to inspect callout spacing, icon size and emphasis.</span></div>'
    + '</div>'
  );
}

function previewKpi(){
  return previewBox('Preview KPI',
    '<div class="hm-kpi-row" style="margin-bottom:0">'
    + '<div class="hm-kpi-card" style="display:grid;gap:8px;justify-items:center">'
    + '<div style="font-size:var(--kpi-icon-size,24px);line-height:1">📈</div>'
    + '<div class="hm-kpi-value">128</div>'
    + '<div class="hm-kpi-label">Cycle Time</div>'
    + '<div class="hm-kpi-trend hm-kpi-trend-up">+4.6% this week</div>'
    + '</div>'
    + '</div>'
  );
}

function previewTooltip(){
  return previewBox('Preview tooltip',
    '<div style="display:flex;justify-content:center;padding:18px 0">'
    + '<div style="position:relative;display:inline-flex">'
    + '<button class="hm-btn hm-btn-secondary">Trigger</button>'
    + '<div style="position:absolute;left:50%;bottom:calc(100% + 10px);transform:translateX(-50%);background:var(--tooltip-bg,#0f172a);color:var(--tooltip-color,#fff);padding:var(--tooltip-padding-y,6px) var(--tooltip-padding-x,10px);border-radius:var(--tooltip-radius,6px);font-size:var(--tooltip-font-size,11px);max-width:var(--tooltip-max-width,280px);white-space:nowrap">Tooltip preview</div>'
    + '</div></div>'
  );
}

function previewDropdown(){
  return previewBox('Preview dropdown',
    '<div style="max-width:240px;border:1px solid var(--border);border-radius:var(--dropdown-radius,8px);background:var(--dropdown-bg,var(--bg-surface));box-shadow:var(--dropdown-shadow,var(--shadow-lg));overflow:hidden">'
    + '<div style="padding:var(--dropdown-item-padding,8px 12px);font-size:var(--dropdown-item-font-size,13px);color:var(--text-primary)">Overview</div>'
    + '<div style="padding:var(--dropdown-item-padding,8px 12px);font-size:var(--dropdown-item-font-size,13px);background:var(--dropdown-item-hover-bg,var(--bg-hover));color:var(--text-primary)">Active / hover item</div>'
    + '<div style="padding:var(--dropdown-item-padding,8px 12px);font-size:var(--dropdown-item-font-size,13px);color:var(--text-primary)">History</div>'
    + '</div>'
  );
}

function previewNav(){
  return previewBox('Preview navigation',
    '<div style="max-width:260px;padding:10px;border-radius:var(--radius-lg);background:var(--brand);display:grid;gap:6px">'
    + '<button type="button" class="nav-item active"><span class="icon">🏠</span><span>Dashboard</span></button>'
    + '<button type="button" class="nav-item"><span class="icon">📋</span><span>Dispatch</span><span class="badge">12</span></button>'
    + '<button type="button" class="nav-item"><span class="icon">📊</span><span>Reports</span></button>'
    + '</div>'
  );
}

function previewPagination(){
  return previewBox('Preview pagination',
    '<div class="at-page-controls" style="margin-top:0">'
    + '<button type="button" class="at-page-btn">&laquo;</button>'
    + '<button type="button" class="at-page-btn">&lsaquo;</button>'
    + '<button type="button" class="at-page-btn at-page-active">2</button>'
    + '<button type="button" class="at-page-btn">3</button>'
    + '<button type="button" class="at-page-btn">4</button>'
    + '<button type="button" class="at-page-btn">&rsaquo;</button>'
    + '</div>'
  );
}

function previewProgress(){
  return previewBox('Preview progress', '<div style="display:grid;gap:10px"><div class="hm-progress"><div class="hm-progress-fill hm-progress-blue" style="width:68%"></div></div><div class="hm-progress"><div class="hm-progress-fill hm-progress-green" style="width:42%"></div></div></div>');
}

function previewEmpty(){
  return previewBox('Preview empty state', '<div class="hm-empty" style="padding:22px 18px"><div class="hm-empty-icon">📭</div><div class="hm-empty-title">No records found</div><div>Filters are active. Adjust them to load more data.</div></div>');
}

function previewField(){
  return previewBox('Preview field',
    '<div style="display:grid;gap:var(--field-group-gap,24px)">'
    + '<div style="display:grid;gap:var(--field-gap,16px)">'
    + '<label class="hm-label">Document owner</label>'
    + '<input class="hm-input" placeholder="Enter owner name">'
    + '<div class="hm-field-error" style="margin-top:0">Helper / validation text preview</div>'
    + '</div>'
    + '</div>'
  );
}

function previewBreadcrumb(){
  return previewBox('Preview breadcrumb',
    '<div class="fm-breadcrumb" style="padding:0">'
    + '<span class="bc-seg">Home</span>'
    + '<span class="bc-sep">›</span>'
    + '<span class="bc-seg">Admin</span>'
    + '<span class="bc-sep">›</span>'
    + '<span class="bc-cur">Appearance</span>'
    + '</div>'
  );
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── TEMPLATE STUDIO DATA + STORAGE ────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */

var TEMPLATE_DRAFT_CACHE_KEY = 'hesem_graphics_template_draft_cache';
var TEMPLATE_PREVIEW_CACHE_KEY = 'hesem_graphics_template_preview_cache';
var _templateSearch = '';
var _templateCategory = 'all';
var _templateSort = 'name';
var _selectedTemplate = null;
var _templateView = 'gallery';
var _templateThemePreview = 'professional-light';
var _waiverSubject = '';
var _waiverReason = '';
var _waiverOwner = 'Admin Appearance';
var _waiverApprover = 'QA Governance';
var _waiverRiskClass = 'high';
var _waiverExpiresAt = '';

var TEMPLATE_SEED = {
  overview: [
    ["T01","Bảng điều khiển tổng hợp","Executive Dashboard","KPI hero 4-6 thẻ + biểu đồ xu hướng + sidebar tóm tắt + bảng dữ liệu. CEO/Giám đốc","header + kpi-bar + filter + main(2/3) + sidebar(1/3) + footer",5,"comfortable",["overview-t01"]],
    ["T02","Giám sát vận hành","Operations Monitor","KPI realtime + lưới trạng thái máy + cảnh báo. Giám sát sàn sản xuất","header + kpi-bar(4) + main(grid 2x2 status cards) + footer",6,"dense",["overview-t02"]],
    ["T03","Trung tâm phân tích","Analytics Hub","Lưới đa biểu đồ + bộ lọc thời gian. Phân tích đa chiều","header + filter + main(grid 2x2 charts)",5,"comfortable",["overview-t03"]],
    ["T04","Trung tâm chỉ số","KPI Center","KPI focus 4 thẻ lớn + bảng chi tiết bên dưới","header + kpi-bar(4 large) + main(table) + footer",4,"default",["overview-t04"]],
    ["T05","Tổng kết ca","Shift Summary","Sản lượng ca + chất lượng + ghi chú bàn giao","header + main(2-col: production + quality) + main(notes)",4,"default",["overview-t05"]],
    ["T06","Bảng năng lượng","Energy Dashboard","Giám sát năng lượng + xu hướng tiêu thụ + cảnh báo","header + main(chart large) + sidebar(kpi + alerts)",5,"comfortable",["overview-t06"]],
    ["T07","Tổng quan điều phối","Dispatch Overview","Trạng thái JO/WO + hàng đợi điều phối","header + kpi-bar(3) + main(grid 3-col cards) + main(queue table)",4,"default",["overview-t07"]],
    ["T08","Dashboard phòng ban","Department Dashboard","KPI phòng ban + tiến độ công việc + nhân sự","header + kpi-bar(4) + main(2/3 charts) + sidebar(1/3 team list)",5,"comfortable",["overview-t08"]],
    ["T09","Cockpit quản lý","Management Cockpit","Bảng điểm đa module + compliance + tài chính","header + kpi-bar(6) + tabs + main(multi-section scorecard)",6,"comfortable",["overview-t09"]],
    ["T10","Tổng quan IoT","IoT Overview","Sensor overview + machine map + alert feed","header + filter + main(sensor grid) + sidebar(alert feed)",5,"default",["overview-t10"]],
    ["T11","Dashboard an toàn","Safety Dashboard","Chỉ số HSE + sự cố + đào tạo an toàn","header + kpi-bar(4: incidents, near-miss, training, days-safe) + main(chart + table)",5,"comfortable",["overview-t11"]],
    ["T12","Bảng Lean Manufacturing","Lean Board","5S scores + kaizen tracker + waste reduction","header + kpi-bar(5S scores) + main(2-col: kaizen board + metrics)",4,"default",["overview-t12"]]
  ],
  sales: [
    ["T13","Danh sách đơn hàng","Sales Order List","Bảng SO + bộ lọc + pagination. CRUD cơ bản","header + filter + main(table) + footer(pagination)",4,"default",["sales-t13"]],
    ["T14","Chi tiết đơn hàng","Order Detail","Thông tin SO + items + timeline + sidebar metadata","header + tabs + main(form sections) + sidebar(metadata + timeline)",5,"default",["sales-t14"]],
    ["T15","Bảng theo dõi đơn hàng","Order Tracking Board","Pipeline stages: Lead → Qualified → Proposal → Won","header + filter + main(pipeline funnel + kanban)",4,"default",["sales-t15"]],
    ["T16","Lịch giao hàng","Delivery Schedule","Calendar view + Gantt timeline + job list","header + tabs(calendar/gantt/list) + main + footer",4,"default",["sales-t16"]],
    ["T17","Cổng khách hàng","Customer Order Portal","Khách hàng xem trạng thái đơn + tài liệu","header(hero) + filter + main(order cards) + footer",4,"default",["sales-t17"]],
    ["T18","Phân tích đơn hàng","Order Analytics","Doanh thu trend + backlog + OTD analysis","header + kpi-bar(4) + main(charts 2x2) + footer",5,"default",["sales-t18"]],
    ["T19","Trình tạo báo giá","Quotation Wizard","Multi-step wizard: Info → Items → Pricing → Review","header + stepper + main(form) + sidebar(summary) + footer(actions)",5,"default",["sales-t19"]],
    ["T20","Quản lý hợp đồng","Contract Management","Bảng hợp đồng + chi tiết + renewal tracking","header + filter + main(table) + sidebar(detail panel)",5,"default",["sales-t20"]]
  ],
  engineering: [
    ["T21","Danh mục chi tiết","Part Master","Bảng part master + click row → BOM + Routing","header + filter + main(table) + sidebar(selected part detail)",5,"default",["engineering-t21"]],
    ["T22","Cấu trúc sản phẩm","BOM Explorer","Tree BOM + component detail + where-used","header + sidebar(tree nav) + main(BOM table + detail)",5,"default",["engineering-t22"]],
    ["T23","Phiếu quy trình","Routing Sheet","Operation sequence + work centers + tooling","header + filter + main(routing table) + footer",4,"default",["engineering-t23"]],
    ["T24","Quản lý CAM","CAM Program Manager","Chương trình CNC + G-code + version tracking","header + filter + main(program table) + sidebar(code preview)",5,"default",["engineering-t24"]],
    ["T25","Yêu cầu thay đổi","ECR/ECN Manager","Change requests + approval flow + impact","header + filter + main(ECR table) + sidebar(approval timeline)",5,"default",["engineering-t25"]],
    ["T26","Thiết kế sản phẩm mới","NPI Dashboard","New product pipeline + milestone tracking","header + kpi-bar(3) + main(pipeline kanban) + footer",5,"default",["engineering-t26"]],
    ["T27","Bản vẽ kỹ thuật","Drawing Viewer","Document tree + drawing preview + markup","header + sidebar(tree) + main(viewer canvas) + footer(tools)",5,"default",["engineering-t27"]],
    ["T28","So sánh phiên bản","Revision Compare","Side-by-side BOM/routing comparison","header + main(split-pane comparison) + footer",4,"default",["engineering-t28"]]
  ],
  purchasing: [
    ["T29","Danh sách đặt mua","Purchase Order List","PO table + status filter + supplier filter","header + filter + main(table) + footer(pagination)",4,"default",["purchasing-t29"]],
    ["T30","Tạo đơn mua hàng","PO Creation Wizard","Wizard: Supplier → Items → Terms → Review","header + stepper + main(form) + sidebar(running total) + footer",5,"default",["purchasing-t30"]],
    ["T31","Bảng điểm NCC","Supplier Scorecard","Supplier performance: quality, delivery, price","header + kpi-bar(4) + main(chart + table) + sidebar(rating detail)",5,"default",["purchasing-t31"]],
    ["T32","Cổng nhà cung cấp","Supplier Portal","NCC xem PO + gửi hóa đơn + cập nhật giao hàng","header + filter + main(PO cards) + footer",4,"default",["purchasing-t32"]],
    ["T33","So sánh RFQ","RFQ Comparison","Side-by-side supplier quotes comparison","header + main(comparison table with highlight) + footer",4,"default",["purchasing-t33"]],
    ["T34","Phân tích mua hàng","Procurement Analytics","Spend analysis + supplier breakdown + trends","header + kpi-bar(4) + main(charts) + footer",5,"default",["purchasing-t34"]],
    ["T35","Dashboard mua hàng","Procurement Dashboard","PR pending + PO open + receiving status","header + kpi-bar(5) + tabs(PR/PO/Suppliers) + main(table)",5,"default",["purchasing-t35"]],
    ["T36","Nhập hàng","Goods Receipt","Receiving form + inspection + put-away","header + main(form: PO items + qty check + location) + footer",4,"default",["purchasing-t36"]]
  ],
  production: [
    ["T37","Trung tâm điều khiển MES","MES Control Center","Machine status grid + job queue + alerts","header + kpi-bar(3: Running/Setup/Down) + main(machine grid) + footer",5,"dense",["production-t37"]],
    ["T38","Giao diện thợ máy","Operator Mobile","Mobile-first, nút lớn, touch-friendly","header(large) + main(current job card + action buttons)",3,"comfortable",["production-t38"]],
    ["T39","Biểu đồ Gantt sản xuất","Gantt Schedule","Machine × Date × Shift Gantt chart","header + filter(date range) + main(gantt: left=machines, right=timeline)",4,"dense",["production-t39"]],
    ["T40","Lưới trạng thái máy","Machine Status Grid","Machine tiles với OEE + downtime detail","header + kpi-bar(4: OEE/Running/Uptime/PM) + main(machine cards grid)",5,"default",["production-t40"]],
    ["T41","Bảng Andon","Andon Board","Hiển thị cảnh báo lớn, dành cho TV xưởng","header(alert banner large) + main(status grid large font)",2,"comfortable",["production-t41"]],
    ["T42","Dashboard OEE","OEE Dashboard","OEE metrics + Availability/Performance/Quality breakdown","header + kpi-bar(3: A/P/Q) + main(OEE trend chart + table)",4,"default",["production-t42"]],
    ["T43","Chi tiết lệnh sản xuất","Work Order Detail","WO info + operations + materials + quality","header + tabs(info/ops/materials/quality) + main(form) + sidebar(status flow)",5,"default",["production-t43"]],
    ["T44","Trình tạo quy trình","Routing Builder","Drag-drop operation sequence builder","header + sidebar(operation library) + main(routing canvas) + footer(save)",5,"default",["production-t44"]],
    ["T45","Cây BOM sản xuất","BOM Production View","BOM tree + availability check + shortage alerts","header + sidebar(BOM tree) + main(component detail + availability)",5,"default",["production-t45"]],
    ["T46","Điều phối công việc","Job Dispatch Queue","Priority queue + machine assignment + scheduling","header + filter + main(dispatch table sortable) + sidebar(machine list) + footer",5,"dense",["production-t46"]],
    ["T47","Theo dõi sản xuất","Production Timeline","Timeline view of job progress + milestones","header + filter + main(vertical timeline) + footer",4,"default",["production-t47"]],
    ["T48","Hồ sơ lô","Batch Record","Batch traveler: materials + process + tests + sign-off","header + tabs + main(multi-section form) + sidebar(batch summary)",5,"default",["production-t48"]],
    ["T49","Theo dõi lao động","Labor Tracking","Time entry + operator assignment + efficiency","header + filter + main(timesheet table) + footer",4,"default",["production-t49"]],
    ["T50","Phân tích ngừng máy","Downtime Analysis","Downtime categories + Pareto + trend","header + kpi-bar(MTBF/MTTR) + main(pareto + trend charts) + footer",5,"default",["production-t50"]],
    ["T51","Ca làm việc","Shift Management","Weekly schedule grid + shift definitions + handover","header + tabs(schedule/definitions/handover) + main(grid/form)",4,"default",["production-t51"]]
  ],
  quality: [
    ["T52","Dashboard ngoại lệ","Exception Dashboard","NCR/CAPA summary + exception trend + category breakdown","header + kpi-bar(4: Open NCR/Critical/Avg Resolution/Scrap Cost) + main(charts 2x1) + footer",5,"default",["quality-t52"]],
    ["T53","Phiếu NCR/CAPA","NCR/CAPA Form","Exception entry form + corrective action + 8D steps","header + stepper(8D) + main(form sections) + sidebar(related items) + footer",5,"default",["quality-t53"]],
    ["T54","Biểu đồ kiểm soát SPC","SPC Control Chart","X-bar, R chart, Histogram, Run chart + process capability","header + filter(process selector) + tabs(X-bar/R/Histogram/Run) + main(chart) + sidebar(Cpk summary)",5,"default",["quality-t54"]],
    ["T55","Ma trận FMEA","FMEA Risk Matrix","S×O×D matrix + RPN ranking + mitigation","header + filter + main(FMEA table S/O/D/RPN) + footer",4,"dense",["quality-t55"]],
    ["T56","Phiếu kiểm tra","Inspection Form","FAI/IQC/IPQC/FQC/OQC inspection record","header + tabs(IQC/IPQC/FQC/OQC/MSA) + main(inspection table) + footer",5,"default",["quality-t56"]],
    ["T57","Báo cáo 8D","8D Report Wizard","8-discipline problem solving wizard","header + stepper(8 steps) + main(step form) + sidebar(team + timeline) + footer",5,"default",["quality-t57"]],
    ["T58","Kế hoạch đánh giá","Audit Plan","Audit schedule + findings + follow-up","header + kpi-bar(4) + main(stacked bar + table) + sidebar(finding detail)",5,"default",["quality-t58"]],
    ["T59","Quản lý hiệu chuẩn","Calibration Manager","Instrument register + calibration schedule + status","header + filter(status + type) + kpi-bar(4) + main(instrument table) + footer",5,"default",["quality-t59"]],
    ["T60","Phòng thí nghiệm","Quality Test Lab","Test orders + results entry + report generation","header + tabs(orders/results/reports) + main(table/form) + sidebar",5,"default",["quality-t60"]],
    ["T61","Năng lực quy trình","Process Capability","Cpk/Ppk analysis + capability matrix + trending","header + filter + main(capability bar chart) + sidebar(threshold legend)",5,"default",["quality-t61"]],
    ["T62","Kiểm soát đầu vào","Incoming Quality Control","IQC lot inspection + supplier quality trend","header + kpi-bar(3) + main(lot table) + sidebar(supplier trend)",5,"default",["quality-t62"]],
    ["T63","Theo dõi hành động","Corrective Action Tracker","CAPA pipeline + overdue alerts + effectiveness","header + filter + main(CAPA table with progress bars) + footer",5,"default",["quality-t63"]],
    ["T64","Ma trận rủi ro","Risk Assessment Matrix","5×5 risk matrix + risk register + mitigation plan","header + main(2/3: risk scatter chart + matrix grid) + sidebar(1/3: register)",5,"default",["quality-t64"]],
    ["T65","MSA/GR&amp;R","MSA Analysis","Gauge R&R study + operator comparison + trending","header + tabs(Studies/GR&R/Operator/Trending) + main(chart + table)",5,"default",["quality-t65"]]
  ],
  warehouse: [
    ["T66","Dashboard kho","Inventory Dashboard","Tổng quan tồn kho + SKU + alerts + warehouse zones","header + kpi-bar(4) + main(donut + bar chart) + sidebar(warehouse zones)",5,"comfortable",["warehouse-t66"]],
    ["T67","Lưới tồn kho","Stock Level Grid","Bảng vật tư + search + status ok, low, critical","header + filter + main(material register table) + footer",4,"dense",["warehouse-t67"]],
    ["T68","Bản đồ kho","Warehouse Map","Visual warehouse layout + bin locations + heat map","header + filter + main(warehouse visual map)",4,"comfortable",["warehouse-t68"]],
    ["T69","Phiếu nhập kho","Receiving Form","Nhập hàng theo PO + kiểm tra số lượng + put-away","header + main(form: PO lookup + items + location) + footer",4,"default",["warehouse-t69"]],
    ["T70","Kiểm kê","Cycle Count","Cycle count schedule + variance report","header + filter + main(count sheet table) + footer",4,"default",["warehouse-t70"]],
    ["T71","Danh mục vật tư","Material Master","Material register + specs + suppliers + history","header + filter + main(table) + sidebar(material detail)",5,"dense",["warehouse-t71"]],
    ["T72","Nhật ký xuất nhập","Movement Log","Inventory transactions timeline + filter","header + filter + main(timeline log) + footer",4,"dense",["warehouse-t72"]],
    ["T73","Hoạch định Min/Max","Min/Max Planning","Reorder point analysis + safety stock calculation","header + filter + main(planning table) + footer",4,"default",["warehouse-t73"]],
    ["T74","Truy xuất lô","Lot Traceability","Lot genealogy tree + forward/backward trace","header + filter + sidebar(lot tree) + main(trace detail)",4,"comfortable",["warehouse-t74"]],
    ["T75","Quản lý dụng cụ","Tool Crib","Tool inventory + life tracking + checkout and return","header + kpi-bar(3) + main(tool table with life bars) + sidebar(checkout log)",5,"default",["warehouse-t75"]],
    ["T76","Danh sách giao hàng","Shipment List","Shipment table + status pipeline + documents","header + filter + main(table) + footer",4,"dense",["warehouse-t76"]],
    ["T77","Lập phiếu giao","Shipping Wizard","Pack list creation + weight + carrier selection","header + stepper + main(form) + sidebar(package summary) + footer",5,"comfortable",["warehouse-t77"]],
    ["T78","Theo dõi vận chuyển","Delivery Tracking","Tracking timeline + carrier status + proof of delivery","header + main(tracking timeline + map placeholder) + footer",4,"comfortable",["warehouse-t78"]],
    ["T79","Lịch giao hàng","Delivery Calendar","Calendar view + scheduled vs actual delivery","header + filter + main(calendar grid) + footer",4,"default",["warehouse-t79"]]
  ],
  finance: [
    ["T80","Dashboard tài chính","Finance Dashboard","Doanh thu + chi phí + lợi nhuận + AR/AP","header + kpi-bar(4) + main(bar + pie charts) + sidebar(recent txns)",5,"comfortable",["finance-t80"]],
    ["T81","Sổ cái công việc","Job Costing","Cost breakdown by job: material + labor + overhead","header + filter + main(job cost table) + sidebar(cost waterfall chart)",5,"dense",["finance-t81"]],
    ["T82","Hóa đơn &amp; Thanh toán","Invoice Management","AR/AP aging + invoice table + payment status","header + kpi-bar(3: overdue, pending, paid) + main(table) + footer",4,"dense",["finance-t82"]],
    ["T83","Hồ sơ công việc","Job Evidence","Job folder: drawings + inspection + certifications","header + sidebar(job tree) + main(document list + preview)",5,"default",["finance-t83"]],
    ["T84","Báo cáo chi phí chất lượng","COPQ Report","Cost of Poor Quality analysis + Pareto + trend","header + kpi-bar(3) + main(pareto + trend charts) + footer",5,"comfortable",["finance-t84"]],
    ["T85","Bảng lương","Payroll Summary","Payroll summary + personnel cost analysis","header + kpi-bar(4) + main(payroll table) + footer",4,"dense",["finance-t85"]]
  ],
  hr: [
    ["T86","Danh bạ nhân viên","Employee Directory","Bảng NV + click row tới detail panel với avatar, KPI, phép","header + filter + main(table) + sidebar(employee detail card)",5,"dense",["hr-t86"]],
    ["T87","Quản lý nghỉ phép","Leave Management","Bảng đơn phép + approve, reject + calendar view","header + tabs(requests/calendar) + main(table/calendar) + footer",4,"default",["hr-t87"]],
    ["T88","Đánh giá KPI","KPI Evaluation","Bảng KPI nhân viên + target vs actual + leaderboard","header + kpi-bar(3) + main(KPI table) + sidebar(top performers)",5,"comfortable",["hr-t88"]],
    ["T89","Quản lý đào tạo","Training Records","Khóa đào tạo + enrollment + progress tracking","header + tabs(courses/matrix/sessions) + main + footer",5,"default",["hr-t89"]],
    ["T90","Ma trận năng lực","Competency Matrix","Heatmap nhân viên × kỹ năng × mức độ","header + filter + main(heatmap grid color-coded)",3,"dense",["hr-t90"]],
    ["T91","Bảng chấm công","Attendance Sheet","Bảng chấm công tháng + thống kê","header + filter(month) + main(attendance grid) + footer",4,"dense",["hr-t91"]],
    ["T92","Ca làm việc","Shift Schedule","Lịch ca tuần + machine assignment + handover","header + tabs(weekly/definitions) + main(schedule grid)",3,"default",["hr-t92"]],
    ["T93","Thông tin lương","Salary Info","Phiếu lương cá nhân + deductions + net pay","header + main(payslip form) + footer",3,"comfortable",["hr-t93"]],
    ["T94","Thông báo công ty","Announcements","Feed thông báo + pin + priority + likes/comments","header + main(announcement feed cards) + sidebar(quick links)",4,"comfortable",["hr-t94"]],
    ["T95","Cổng thông tin","Company Portal","Portal tổng hợp announcements + policies + calendar","header(hero banner) + main(3-col: news + policies + calendar)",4,"comfortable",["hr-t95"]]
  ],
  document: [
    ["T96","Duyệt tài liệu","Document Browser","Tree nav + document list + preview pane","header + sidebar(tree) + main(list) + sidebar-right(preview)",4,"default",["document-t96"]],
    ["T97","Xem báo cáo","Report Viewer","Toolbar + rendered report content + export","header + filter(toolbar) + main(report canvas)",3,"comfortable",["document-t97"]],
    ["T98","Nhật ký sự kiện","Timeline Log","Audit trail + event detail + filter by type","header + filter + main(vertical timeline) + footer",4,"dense",["document-t98"]],
    ["T99","Kho bằng chứng","Evidence Vault","Evidence list + file preview + compliance tags","header + filter + main(evidence table) + sidebar(file preview)",5,"default",["document-t99"]],
    ["T100","So sánh phiên bản","Version Compare","Side-by-side document version comparison","header + main(split-pane diff view) + footer",3,"default",["document-t100"]],
    ["T101","Trình soạn SOP","SOP Editor","Rich text editor + template structure + approval","header + sidebar(outline) + main(rich editor) + footer(actions)",4,"comfortable",["document-t101"]],
    ["T102","Quản lý thay đổi","Change Control","ECR/ECN table + impact analysis + approval flow","header + filter + main(change request table) + sidebar(approval workflow)",5,"default",["document-t102"]],
    ["T103","Đánh giá nội bộ","Audit Management","Audit schedule + findings + scoring","header + kpi-bar(4) + main(stacked bar + table) + sidebar(finding detail)",5,"default",["document-t103"]],
    ["T104","Quản lý rủi ro","Risk Management","5×5 risk matrix + FMEA register + mitigation","header + main(scatter chart + matrix grid) + sidebar(risk register)",4,"dense",["document-t104"]],
    ["T105","Hồ sơ đào tạo tuân thủ","Compliance Training","Training completion matrix + certification tracking","header + filter + main(compliance matrix) + footer",4,"dense",["document-t105"]]
  ],
  admin: [
    ["T106","Bảng cấu hình","Config Panel","Settings groups accordion + save + reset","header + main(settings accordion sections) + footer",3,"default",["admin-t106"]],
    ["T107","Quản lý người dùng","User Management","User table + role assignment + permissions","header + filter + main(user table) + footer",4,"dense",["admin-t107"]],
    ["T108","Ma trận phân quyền","Permission Matrix","Roles × modules matrix + CRUD toggles","header + main(scrollable matrix with sticky first column) + footer",3,"dense",["admin-t108"]],
    ["T109","Sơ đồ tổ chức","Org Chart","Expandable tree org chart + department badges","header + main(recursive tree diagram) + footer",3,"comfortable",["admin-t109"]],
    ["T110","Hiển thị module","Module Visibility","Toggle on/off modules per role","header + main(module toggle grid grouped by section) + footer",3,"dense",["admin-t110"]],
    ["T111","Trung tâm bảo mật","Security Center","Login logs + session management + 2FA settings","header + kpi-bar(3) + tabs(logs/sessions/settings) + main(table)",5,"default",["admin-t111"]],
    ["T112","Schema Studio","Schema Studio","Schema editor + field inspector + relation map","header + sidebar(table list) + main(field editor) + sidebar-right(inspector)",4,"dense",["admin-t112"]],
    ["T113","Giám sát hệ thống","System Health","Server status + API response times + error rates","header + kpi-bar(4) + main(charts: CPU, RAM, API latency) + footer",4,"comfortable",["admin-t113"]]
  ],
  generic: [
    ["T114","Bảng danh sách","Generic List Report","Filter + sortable table + pagination","header + filter + main(table) + footer",4,"dense",["generic-t114"]],
    ["T115","Chi tiết bản ghi","Generic Record Detail","Full record view + sidebar metadata","header + main(detail form) + sidebar(metadata) + footer",4,"default",["generic-t115"]],
    ["T116","Lưới thẻ","Generic Card Grid","Responsive card grid + filter + sort","header + filter + main(card grid)",3,"comfortable",["generic-t116"]],
    ["T117","Biểu mẫu wizard","Generic Form Wizard","Multi-step form + progress stepper","header + stepper + main(step form) + footer(back/next)",4,"comfortable",["generic-t117"]],
    ["T118","Bảng Kanban","Generic Kanban Board","Drag-drop columns + card detail","header + filter + main(kanban columns)",3,"default",["generic-t118"]],
    ["T119","Biểu đồ Gantt","Generic Gantt Chart","Resource × time Gantt + zoom + drag resize","header + filter + main(gantt: left resources + right timeline)",4,"dense",["generic-t119"]],
    ["T120","Master-Detail","Generic Master-Detail","List panel + detail panel click-to-view","header + sidebar(list panel) + main(detail panel) + footer",4,"default",["generic-t120"]],
    ["T121","Trống / Empty","Empty State Template","Beautiful empty state with illustration + CTA","header + main(centered empty state)",2,"comfortable",["generic-t121"]],
    ["T122","Dashboard trống","Blank Dashboard","Customizable grid + add widget buttons","header + main(grid with add-widget actions)",2,"comfortable",["generic-t122"]],
    ["T123","Trang in","Print Layout","Print-optimized layout + header + footer","header(print) + main(content) + footer(page number)",3,"default",["generic-t123"]]
  ]
};

var TEMPLATE_CATEGORIES = [
  { key:'overview', label:{ vi:'Tổng quan', en:'Overview' }, icon:'📊', color:'blue', count:12 },
  { key:'sales', label:{ vi:'Bán hàng', en:'Sales' }, icon:'💰', color:'cyan', count:8 },
  { key:'engineering', label:{ vi:'Kỹ thuật', en:'Engineering' }, icon:'⚙️', color:'indigo', count:8 },
  { key:'purchasing', label:{ vi:'Mua hàng', en:'Purchasing' }, icon:'🛒', color:'amber', count:8 },
  { key:'production', label:{ vi:'Sản xuất', en:'Production' }, icon:'🏭', color:'green', count:15 },
  { key:'quality', label:{ vi:'Chất lượng', en:'Quality' }, icon:'✅', color:'red', count:14 },
  { key:'warehouse', label:{ vi:'Kho vận', en:'Warehouse' }, icon:'📦', color:'teal', count:14 },
  { key:'finance', label:{ vi:'Tài chính', en:'Finance' }, icon:'💵', color:'amber', count:6 },
  { key:'hr', label:{ vi:'Nhân sự', en:'HR' }, icon:'👥', color:'pink', count:10 },
  { key:'document', label:{ vi:'Tài liệu', en:'Documents' }, icon:'📄', color:'purple', count:10 },
  { key:'admin', label:{ vi:'Quản trị', en:'Admin' }, icon:'🔧', color:'dark', count:8 },
  { key:'generic', label:{ vi:'Mẫu chung', en:'Generic' }, icon:'📐', color:'dark', count:10 }
];

var VISUAL_THEMES = [
  { id:'professional-light', name:{vi:'Chuyên nghiệp Sáng',en:'Professional Light'}, colors:{brand:'#0c2d48',brand2:'#1565c0',bgPage:'#f8fafc',bgSurface:'#ffffff',accent:'#f9a825'}, desc:{vi:'Mặc định. Tương phản cao, dễ đọc.',en:'Default. High contrast, easy to read.'} },
  { id:'professional-dark', name:{vi:'Chuyên nghiệp Tối',en:'Professional Dark'}, colors:{brand:'#1e293b',brand2:'#60a5fa',bgPage:'#0f172a',bgSurface:'#1e293b',accent:'#f9a825'}, desc:{vi:'Surface tối, hợp dashboard đêm.',en:'Dark surfaces for night operations.'} },
  { id:'midnight-navy', name:{vi:'Nửa đêm',en:'Midnight Navy'}, colors:{brand:'#0f172a',brand2:'#0891b2',bgPage:'#020617',bgSurface:'#111827',accent:'#22d3ee'}, desc:{vi:'Navy sâu cho ca đêm và control room.',en:'Deep navy for night shift control rooms.'} },
  { id:'ocean-breeze', name:{vi:'Đại dương',en:'Ocean Breeze'}, colors:{brand:'#0369a1',brand2:'#0891b2',bgPage:'#f0f9ff',bgSurface:'#ffffff',accent:'#38bdf8'}, desc:{vi:'Sáng, tươi và nhiều cyan.',en:'Fresh cyan-heavy visual direction.'} },
  { id:'forest-calm', name:{vi:'Rừng xanh',en:'Forest Calm'}, colors:{brand:'#166534',brand2:'#16a34a',bgPage:'#f0fdf4',bgSurface:'#ffffff',accent:'#84cc16'}, desc:{vi:'Mềm, xanh và yên tĩnh.',en:'Calm green palette for steady review.'} },
  { id:'sunrise-warm', name:{vi:'Bình minh',en:'Sunrise Warm'}, colors:{brand:'#9a3412',brand2:'#ea580c',bgPage:'#fffbeb',bgSurface:'#fff7ed',accent:'#f59e0b'}, desc:{vi:'Ấm áp, phù hợp sales hoặc portal.',en:'Warm palette for sales and portals.'} },
  { id:'sunset-ember', name:{vi:'Hoàng hôn',en:'Sunset Ember'}, colors:{brand:'#7c2d12',brand2:'#dc2626',bgPage:'#fef2f2',bgSurface:'#fff7ed',accent:'#fb7185'}, desc:{vi:'Mạnh, thiên đỏ cam.',en:'Strong red-orange emphasis.'} },
  { id:'arctic-snow', name:{vi:'Bắc Cực',en:'Arctic Snow'}, colors:{brand:'#1e3a5f',brand2:'#3b82f6',bgPage:'#f8fafc',bgSurface:'#ffffff',accent:'#94a3b8'}, desc:{vi:'Sạch, lạnh, tương phản rõ.',en:'Clean high-contrast icy palette.'} },
  { id:'cherry-blossom', name:{vi:'Hoa Anh Đào',en:'Cherry Blossom'}, colors:{brand:'#9d174d',brand2:'#db2777',bgPage:'#fdf2f8',bgSurface:'#ffffff',accent:'#f9a8d4'}, desc:{vi:'Hồng nhẹ cho HR và portal mềm.',en:'Soft pink for HR and friendly portal flows.'} },
  { id:'lavender-dream', name:{vi:'Oải hương',en:'Lavender Dream'}, colors:{brand:'#6d28d9',brand2:'#8b5cf6',bgPage:'#faf5ff',bgSurface:'#ffffff',accent:'#c084fc'}, desc:{vi:'Sáng tạo và hơi premium.',en:'Creative and premium purple tone.'} },
  { id:'industrial-steel', name:{vi:'Thép công nghiệp',en:'Industrial Steel'}, colors:{brand:'#374151',brand2:'#6b7280',bgPage:'#f3f4f6',bgSurface:'#ffffff',accent:'#94a3b8'}, desc:{vi:'Khô, chắc, thiên công nghiệp.',en:'Dry industrial gray palette.'} },
  { id:'shopfloor-signal', name:{vi:'Tín hiệu xưởng',en:'Shopfloor Signal'}, colors:{brand:'#dc2626',brand2:'#16a34a',bgPage:'#fff7ed',bgSurface:'#ffffff',accent:'#d97706'}, desc:{vi:'High contrast cho màn hình xưởng.',en:'High-contrast for shop floor screens.'} },
  { id:'executive-glass', name:{vi:'Kính điều hành',en:'Executive Glass'}, colors:{brand:'#0f172a',brand2:'#2563eb',bgPage:'#eef4ff',bgSurface:'#ffffff',accent:'#38bdf8'}, desc:{vi:'Glass nhẹ và sang trọng.',en:'Light glassy executive finish.'} },
  { id:'compliance-paper', name:{vi:'Giấy tuân thủ',en:'Compliance Paper'}, colors:{brand:'#57534e',brand2:'#78716c',bgPage:'#fafaf9',bgSurface:'#fffbeb',accent:'#a16207'}, desc:{vi:'Document-like, trung tính và dễ in.',en:'Document-first neutral paper tone.'} },
  { id:'focus-mode', name:{vi:'Tập trung',en:'Focus Mode'}, colors:{brand:'#18181b',brand2:'#3f3f46',bgPage:'#fafafa',bgSurface:'#ffffff',accent:'#27272a'}, desc:{vi:'Tối giản, ít nhiễu.',en:'Minimal and distraction-free.'} },
  { id:'vibrant-energy', name:{vi:'Năng lượng',en:'Vibrant Energy'}, colors:{brand:'#7c3aed',brand2:'#06b6d4',bgPage:'#f5f3ff',bgSurface:'#ffffff',accent:'#f97316'}, desc:{vi:'Sinh động, nhiều gradient.',en:'Energetic, gradient-friendly preset.'} },
  { id:'soft-pastel', name:{vi:'Pastel mềm',en:'Soft Pastel'}, colors:{brand:'#6366f1',brand2:'#a5b4fc',bgPage:'#f8fafc',bgSurface:'#ffffff',accent:'#f9a8d4'}, desc:{vi:'Dịu, phù hợp HR và onboarding.',en:'Soft pastel for onboarding and HR flows.'} },
  { id:'earth-tone', name:{vi:'Đất',en:'Earth Tone'}, colors:{brand:'#78350f',brand2:'#92400e',bgPage:'#fefce8',bgSurface:'#fff7ed',accent:'#ca8a04'}, desc:{vi:'Nâu ấm, organic.',en:'Warm organic brown palette.'} },
  { id:'neon-pulse', name:{vi:'Neon',en:'Neon Pulse'}, colors:{brand:'#09090b',brand2:'#22c55e',bgPage:'#09090b',bgSurface:'#18181b',accent:'#06b6d4'}, desc:{vi:'Dark tech với accent neon.',en:'Dark tech preset with neon accents.'} },
  { id:'zen-minimal', name:{vi:'Thiền',en:'Zen Minimal'}, colors:{brand:'#737373',brand2:'#a3a3a3',bgPage:'#fafafa',bgSurface:'#ffffff',accent:'#d4d4d4'}, desc:{vi:'Whitespace tối đa, trang nhã.',en:'Maximum whitespace, minimal chrome.'} },
  { id:'ember-industrial', name:{vi:'Than công nghiệp',en:'Ember Industrial'}, colors:{brand:'#9a3412',brand2:'#f97316',bgPage:'#fff7ed',bgSurface:'#ffffff',accent:'#facc15'}, desc:{vi:'Màu cảnh báo ấm cho khu công nghiệp, phải qua impact analysis trước rollout.',en:'Warm industrial warning palette; impact analysis required before rollout.'} },
  { id:'graphite-amber', name:{vi:'Graphite hổ phách',en:'Graphite Amber'}, colors:{brand:'#334155',brand2:'#f59e0b',bgPage:'#f8fafc',bgSurface:'#ffffff',accent:'#fbbf24'}, desc:{vi:'Tối trung tính với hổ phách cho dashboard và review.',en:'Neutral dark graphite with amber for dashboards and reviews.'} },
  { id:'slate-ice', name:{vi:'Đá phiến lạnh',en:'Slate Ice'}, colors:{brand:'#1e293b',brand2:'#38bdf8',bgPage:'#f8fafc',bgSurface:'#ffffff',accent:'#14b8a6'}, desc:{vi:'Tông lạnh cho control room, vẫn phải giữ tương phản và focus token.',en:'Cool control-room palette while preserving contrast and focus tokens.'} }
];

function normalizeSubTab(subTab){
  var aliases = { overview:'templates', typography:'tokens', colors:'tokens', layout:'tokens', a11y:'accessibility', export:'analytics', exports:'analytics' };
  var valid = { templates:1, tokens:1, components:1, effects:1, accessibility:1, analytics:1, governance:1, advanced:1, standard:1 };
  var resolved = aliases[subTab] || subTab || 'templates';
  return valid[resolved] ? resolved : 'templates';
}

function decodeHtmlText(v){
  return String(v || '').replace(/&amp;/g, '&');
}

function inferZones(layoutMeta, zoneCount){
  var text = String(layoutMeta || '').toLowerCase();
  var zones = [];
  function push(z){ if(zones.indexOf(z) === -1) zones.push(z); }
  if(text.indexOf('header') >= 0) push('header');
  if(text.indexOf('kpi-bar') >= 0) push('kpi-bar');
  if(text.indexOf('tabs') >= 0 || text.indexOf('stepper') >= 0) push('tabs');
  if(text.indexOf('filter') >= 0) push('filter');
  if(text.indexOf('sidebar') >= 0) push('sidebar');
  if(text.indexOf('chart') >= 0 && text.indexOf('main(chart') >= 0) push('chart-area');
  if(text.indexOf('main') >= 0 || zoneCount >= 2) push('main');
  if(text.indexOf('footer') >= 0) push('footer');
  ['header','kpi-bar','tabs','filter','main','sidebar','chart-area','footer'].forEach(function(z){
    if(zones.length < zoneCount) push(z);
  });
  return zones.slice(0, Math.max(2, zoneCount || zones.length || 2));
}

function inferZoneLayout(zones){
  var hasSidebar = zones.indexOf('sidebar') >= 0;
  var hasKpi = zones.indexOf('kpi-bar') >= 0;
  var hasTabs = zones.indexOf('tabs') >= 0;
  var hasFilter = zones.indexOf('filter') >= 0;
  var hasFooter = zones.indexOf('footer') >= 0;
  if(hasSidebar && hasKpi && hasFilter && hasFooter) return { gridCols:'2fr 1fr', gridRows:'auto auto auto 1fr auto' };
  if(hasSidebar && hasFooter) return { gridCols:'1fr 1.4fr', gridRows:'auto auto 1fr auto' };
  if(hasTabs && hasFooter) return { gridCols:'1fr', gridRows:'auto auto 1fr auto' };
  if(hasFilter && hasFooter) return { gridCols:'1fr', gridRows:'auto auto 1fr auto' };
  if(hasSidebar) return { gridCols:'2fr 1fr', gridRows:'auto 1fr auto' };
  return { gridCols:'1fr', gridRows:'auto 1fr auto' };
}

function themeRuntimeCapability(themeId){
  var id = String(themeId || '');
  var hm = window.HmTheme || null;
  var runtimeIds = [];
  if(hm && typeof hm.isVisualThemeRuntimeSupported === 'function'){
    var direct = false;
    try { direct = hm.isVisualThemeRuntimeSupported(id) === true; } catch(e0){ direct = false; }
    if(direct){
      return {
        supported: true,
        status: 'runtime-supported',
        badge: L('Runtime supported', 'Runtime supported'),
        reason: L('Theme này có preset runtime trong HmTheme và có thể preview qua control plane.', 'This theme has an HmTheme runtime preset and can be previewed through the control plane.'),
        runtimeCount: null
      };
    }
  }
  if(hm && typeof hm.getVisualThemePresetIds === 'function'){
    try { runtimeIds = hm.getVisualThemePresetIds() || []; } catch(e){ runtimeIds = []; }
  } else if(hm && typeof hm.getVisualThemePresets === 'function'){
    try { runtimeIds = Object.keys(hm.getVisualThemePresets() || {}); } catch(e2){ runtimeIds = []; }
  }
  var supported = runtimeIds.indexOf(id) >= 0;
  return {
    supported: supported,
    status: supported ? 'runtime-supported' : 'publish-blocked',
    badge: supported ? L('Runtime supported', 'Runtime supported') : L('Runtime blocked', 'Runtime blocked'),
    reason: supported
      ? L('Theme này có preset runtime trong HmTheme và có thể preview qua control plane.', 'This theme has an HmTheme runtime preset and can be previewed through the control plane.')
      : L('Theme này chưa có preset runtime được kiểm soát; không được apply/publish từ Admin.', 'This theme does not have a governed runtime preset; Admin apply/publish is blocked.'),
    runtimeCount: runtimeIds.length
  };
}

function renderThemeControlButton(theme){
  var cap = themeRuntimeCapability(theme.id);
  var disabled = cap.supported ? '' : ' disabled aria-disabled="true"';
  var cursor = cap.supported ? 'pointer' : 'not-allowed';
  var opacity = cap.supported ? '1' : '.62';
  var border = _templateThemePreview === theme.id ? 'var(--brand-2)' : (cap.supported ? 'var(--border)' : 'var(--danger,#dc2626)');
  var onclick = cap.supported
    ? "_admTplApplyTheme('"+esc(theme.id)+"')"
    : "announceGraphics('"+esc(cap.reason)+"')";
  return '<button type="button"'+disabled+' onclick="'+onclick+'" title="'+esc(cap.reason)+'" style="text-align:left;padding:10px;border:1px solid '+border+';border-radius:10px;background:var(--bg-surface);cursor:'+cursor+';opacity:'+opacity+'">'
    + '<div class="theme-swatch-bar"><div style="flex:2;border-radius:4px;background:'+theme.colors.brand+'"></div><div style="flex:2;border-radius:4px;background:'+theme.colors.brand2+'"></div><div style="flex:3;border-radius:4px;background:'+theme.colors.bgSurface+';border:1px solid rgba(148,163,184,.24)"></div><div style="flex:1;border-radius:4px;background:'+theme.colors.accent+'"></div></div>'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px"><div style="font-size:11px;font-weight:700;color:var(--text-primary)">'+esc(theme.name[lang === 'en' ? 'en' : 'vi'])+'</div><span style="font-size:9px;font-weight:800;text-transform:uppercase;color:'+(cap.supported ? 'var(--success,#16a34a)' : 'var(--danger,#dc2626)')+'">'+esc(cap.badge)+'</span></div>'
    + '<div style="font-size:10px;color:var(--text-secondary);margin-top:3px">'+esc(theme.desc[lang === 'en' ? 'en' : 'vi'])+'</div>'
    + '<div style="font-size:10px;color:var(--text-tertiary);margin-top:4px">'+esc(cap.reason)+'</div>'
    + '</button>';
}

function buildTemplatePresets(){
  var presets = [];
  TEMPLATE_CATEGORIES.forEach(function(cat){
    (TEMPLATE_SEED[cat.key] || []).forEach(function(row){
      var zones = inferZones(row[4], row[5]);
      presets.push({
        id: row[0],
        name: { vi: decodeHtmlText(row[1]), en: decodeHtmlText(row[2]) },
        desc: { vi: decodeHtmlText(row[3]), en: decodeHtmlText(row[3]) },
        category: cat.key,
        categoryLabel: cat.label,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
        zones: zones,
        zoneCount: row[5],
        zoneLayout: inferZoneLayout(zones),
        density: row[6],
        modules: row[7] || [],
        layoutMeta: decodeHtmlText(row[4]),
        zoneSettings: zones.map(function(z){
          return { name:z, type:z, scroll:(z==='main' || z==='sidebar') ? 'data-only' : 'sticky', allowed:(z==='main') ? 'ALL data/chart/form blocks' : (z==='sidebar' ? 'summary/list/chart blocks' : 'layout/navigation/action blocks') };
        })
      });
    });
  });
  return presets;
}

var TEMPLATE_PRESETS = buildTemplatePresets();
var BASE_TEMPLATE_PRESETS = TEMPLATE_PRESETS;

function graphicsSvc(){
  return window.HmGraphicsGovernance || null;
}

function readDraftCache(){
  try {
    var svc = graphicsSvc();
    if(svc && typeof svc.getDraftCache === 'function') return svc.getDraftCache() || {};
    var raw = localStorage.getItem(TEMPLATE_DRAFT_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}

function writeDraftCache(store){
  try {
    var svc = graphicsSvc();
    if(svc && typeof svc.replaceDraftCache === 'function'){
      svc.replaceDraftCache(store || {});
      return;
    }
    localStorage.setItem(TEMPLATE_DRAFT_CACHE_KEY, JSON.stringify(store || {}));
  } catch(e){}
}

function readPreviewCache(){
  try {
    var svc = graphicsSvc();
    if(svc && typeof svc.getPreviewCache === 'function') return svc.getPreviewCache() || {};
    var raw = localStorage.getItem(TEMPLATE_PREVIEW_CACHE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch(e){ return {}; }
}

function writePreviewCache(store){
  try {
    var svc = graphicsSvc();
    if(svc && typeof svc.replacePreviewCache === 'function'){
      svc.replacePreviewCache(store || {});
      return;
    }
    localStorage.setItem(TEMPLATE_PREVIEW_CACHE_KEY, JSON.stringify(store || {}));
  } catch(e){}
}

function graphicsSnapshot(){
  var svc = graphicsSvc();
  if(svc && typeof svc.getSnapshot === 'function') return svc.getSnapshot(BASE_TEMPLATE_PRESETS);
  return {
    version:'fallback',
    registryAuthority:'backend-unavailable-preview-seed',
    backendAvailable:false,
    endpointStatus:{},
    templates:BASE_TEMPLATE_PRESETS.map(function(tpl){
      var c = cloneTemplateData(tpl);
      c.templateId = c.id;
      c.version = c.version || '1.0.0';
      c.status = c.source === 'custom' ? 'draft-only' : 'legacy-bridged';
      c.owner = c.owner || 'HESEM Platform Architecture';
      c.governedModules = c.modules || [];
      c.controlMode = c.status === 'legacy-bridged' ? 'bridged' : 'draft-cache';
      return c;
    }),
	    modules:[],
	    compliance:[],
	    debt:null,
	    drift:null,
	    runtimeDiagnostics:null,
	    releaseLink:null,
	    releaseBlockers:[],
	    audit:[],
	    waivers:[],
	    impact:null
  };
}

function ensureGraphicsRefresh(){
  var svc = graphicsSvc();
  if(_graphicsRefreshStarted || !svc || typeof svc.refresh !== 'function') return;
  _graphicsRefreshStarted = true;
  svc.refresh(BASE_TEMPLATE_PRESETS).then(function(){
    if(typeof renderAdminAppearance === 'function') renderAdminAppearance();
  }).catch(function(){});
}

function cloneTemplateData(tpl){
  return JSON.parse(JSON.stringify(tpl));
}

function cacheUnsavedTemplateDraftRecord(tpl){
  if(!tpl || !tpl.id) return;
  var svc = graphicsSvc();
  var payload = cloneTemplateData(tpl);
  payload.templateId = payload.templateId || payload.id;
  if(svc && typeof svc.cacheUnsavedTemplateDraft === 'function'){
    svc.cacheUnsavedTemplateDraft(payload);
    return;
  }
  var store = readDraftCache();
  store[tpl.id] = cloneTemplateData(tpl);
  writeDraftCache(store);
}

function deleteUnsavedTemplateDraftRecord(id){
  var svc = graphicsSvc();
  if(svc && typeof svc.deleteTemplateDraft === 'function'){
    svc.deleteTemplateDraft(id);
    return;
  }
  var store = readDraftCache();
  delete store[id];
  writeDraftCache(store);
}

function getAllTemplates(){
  var snapshot = graphicsSnapshot();
  return (snapshot.templates || []).map(function(tpl){
    var out = cloneTemplateData(tpl);
    out.id = out.id || out.templateId;
    out.templateId = out.templateId || out.id;
    out.version = out.version || '1.0.0';
    out.owner = out.owner || 'HESEM Platform Architecture';
    out.status = out.status || 'legacy-bridged';
    out.governedModules = out.governedModules || out.modules || [];
    out.modules = out.governedModules.slice ? out.governedModules.slice() : [];
    out.zoneCount = out.zoneCount || (out.zones || []).length;
    return out;
  });
}

function getTemplates(){
  var list = getAllTemplates().filter(function(tpl){
    var hay = [tpl.id, tpl.name.vi, tpl.name.en, tpl.desc.vi, tpl.category, tpl.density].join(' ').toLowerCase();
    var passSearch = !_templateSearch || hay.indexOf(String(_templateSearch).toLowerCase()) >= 0;
    var passCat = !_templateCategory || _templateCategory === 'all' || tpl.category === _templateCategory;
    return passSearch && passCat;
  });
  list.sort(function(a, b){
    if(_templateSort === 'zones') return (b.zoneCount || 0) - (a.zoneCount || 0) || a.id.localeCompare(b.id);
    if(_templateSort === 'category') return String(a.category).localeCompare(String(b.category)) || a.id.localeCompare(b.id);
    var aName = String(((lang === 'en' ? a.name.en : a.name.vi) || a.name.vi || a.id)).toLowerCase();
    var bName = String(((lang === 'en' ? b.name.en : b.name.vi) || b.name.vi || b.id)).toLowerCase();
    return aName.localeCompare(bName) || a.id.localeCompare(b.id);
  });
  return list;
}

function getTemplateById(id){
  return getAllTemplates().find(function(tpl){ return tpl.id === id || tpl.templateId === id; }) || null;
}

function getGovernedModulesForTemplate(tpl){
  var svc = graphicsSvc();
  if(svc && typeof svc.getModulesForTemplate === 'function'){
    return (svc.getModulesForTemplate(tpl.templateId || tpl.id, BASE_TEMPLATE_PRESETS) || []).map(function(m){ return m.moduleId || m.route || ''; }).filter(Boolean);
  }
  return (tpl.governedModules || tpl.modules || []).slice();
}

function templateDisplayName(tpl){
  if(!tpl) return '';
  var name = tpl.name || {};
  return String((lang === 'en' ? name.en : name.vi) || name.vi || name.en || tpl.templateId || tpl.id || '');
}

function templateStatusLabel(status){
  var map = {
    'draft-only': L('Draft only', 'Draft only'),
    'controlled-draft': L('Controlled draft', 'Controlled draft'),
    validated: L('Validated', 'Validated'),
    'publish-blocked': L('Publish blocked', 'Publish blocked'),
    published: L('Published', 'Published'),
    deprecated: L('Deprecated', 'Deprecated'),
    'legacy-bridged': L('Legacy bridged', 'Legacy bridged')
  };
  return map[String(status || '')] || String(status || '-');
}

function statusKindForTemplate(status){
  if(status === 'published' || status === 'validated') return 'full';
  if(status === 'publish-blocked' || status === 'deprecated') return 'partial';
  if(status === 'legacy-bridged') return 'admin';
  return 'preview';
}

function templateStatusChip(tpl){
  return statusChip(statusKindForTemplate(tpl.status), templateStatusLabel(tpl.status));
}

function templateControlBadge(tpl){
  var mode = String(tpl.controlMode || '').toLowerCase();
  if(mode === 'controlled') return statusChip('full', L('Controlled', 'Controlled'));
  if(mode === 'bridged') return statusChip('admin', L('Bridged', 'Bridged'));
  if(mode === 'draft-cache') return statusChip('preview', L('Draft cache', 'Draft cache'));
  if(mode === 'preview-seed') return statusChip('preview', L('Preview seed', 'Preview seed'));
  return statusChip('partial', L('Legacy', 'Legacy'));
}

function templateCompatibility(tpl, key){
  var value = String((tpl && tpl[key]) || '').trim();
  if(value) return value;
  var modules = getGovernedModulesForTemplate(tpl || {});
  if(key === 'regulatedCompatibility'){
    return modules.some(function(id){ return /quality|qms|eqms|document|compliance/i.test(String(id)); }) ? 'explicit-required' : 'not-regulated';
  }
  return modules.some(function(id){ return /production|shopfloor|mes|dispatch|execution|line/i.test(String(id)); }) ? 'explicit-required' : 'standard-compatible';
}

function templateReleaseBlockers(tpl){
  var id = tpl && (tpl.templateId || tpl.id) || '';
  if(!id) return [];
  var snap = graphicsSnapshot();
  return (snap.releaseBlockers || []).filter(function(row){
    var hay = [
      row.templateId,
      row.targetId,
      row.subjectId,
      row.moduleId,
      row.reason,
      row.message,
      row.summary
    ].join(' ');
    return hay.indexOf(id) >= 0;
  });
}

function templateDriftState(tpl){
  var blockers = templateReleaseBlockers(tpl);
  if(blockers.some(function(row){ return /drift/i.test([row.kind, row.type, row.reason, row.message].join(' ')); })) return 'drift-blocker';
  if(String(tpl && tpl.status || '') === 'legacy-bridged') return 'legacy bridge';
  return 'tracked';
}

function templatePublishEligibility(tpl){
  if(!tpl) return 'no-template';
  if(templateReleaseBlockers(tpl).length) return 'blocked';
  if(tpl.status === 'validated' || tpl.status === 'controlled-draft' || tpl.status === 'published') return 'eligible';
  if(tpl.status === 'draft-only') return 'save-draft-required';
  return 'not-eligible';
}

function templateStateMachine(){
  var states = [
    ['draft-only', L('Cache xem trước / nháp chưa kiểm soát', 'Preview cache or unsaved draft only')],
    ['controlled-draft', L('Backend đã nhận draft có owner/version', 'Backend has accepted owner/versioned draft')],
    ['validated', L('Schema, zone, block và token gates đã qua', 'Schema, zone, block, and token gates passed')],
    ['publish-blocked', L('Có blocker hoặc endpoint authority chưa sẵn sàng', 'A blocker exists or authority endpoint is unavailable')],
    ['published', L('Được phép dùng production và rollback được', 'Production-allowed and rollback-capable')],
    ['deprecated', L('Không cho module mới, cần migration plan', 'Blocked for new modules; migration plan required')],
    ['legacy-bridged', L('Template cũ chỉ bridge về shared tokens', 'Legacy template bridged back to shared tokens')]
  ];
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:8px">'
    + states.map(function(row, idx){
      return '<div style="padding:10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)">'
        + '<div style="display:flex;align-items:center;gap:8px">'
        + '<span style="font-family:var(--font-mono);font-size:11px;color:var(--text-tertiary)">'+String(idx + 1)+'</span>'
        + statusChip(statusKindForTemplate(row[0]), templateStatusLabel(row[0]))
        + '</div>'
        + '<div style="margin-top:7px;font-size:11px;line-height:1.55;color:var(--text-secondary)">'+esc(row[1])+'</div>'
        + '</div>';
    }).join('')
    + '</div>';
}

function smallMeta(label, value){
  return '<div style="min-width:0;padding:8px 10px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface-alt,var(--bg-hover))">'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;color:var(--text-tertiary)">'+esc(label)+'</div>'
    + '<div style="margin-top:4px;font-size:12px;font-weight:700;color:var(--text-primary);word-break:break-word">'+esc(value == null || value === '' ? '-' : String(value))+'</div>'
    + '</div>';
}

function refreshImpactPanel(){
  var content = renderImpactAnalysisPanel(false);
  var els = document.querySelectorAll ? document.querySelectorAll('[id="adm-graphics-impact-panel"]') : [];
  if(!els || !els.length) return;
  for(var i=0;i<els.length;i++) els[i].innerHTML = content;
  announceGraphics(L('Impact analysis preview đã cập nhật.', 'Impact analysis preview updated.'));
}

window._admGraphicsMarkChange = function(kind, target, value){
  var svc = graphicsSvc();
  var label = String(target || kind || '');
  if(value !== undefined && value !== null && value !== '') label += ' = ' + String(value).slice(0, 48);
  if(svc && typeof svc.markChange === 'function') svc.markChange({ kind:kind, target:target, path:target, label:label }, BASE_TEMPLATE_PRESETS);
  refreshImpactPanel();
  announceGraphics(L('Đã ghi nhận thay đổi đồ họa, cần impact analysis: ', 'Graphics change recorded; impact analysis required: ') + label);
};

window._admGraphicsRunImpact = function(kind, target){
  var svc = graphicsSvc();
  var change = { kind:kind, target:target, path:target, label:kind + ': ' + target };
  if(svc && typeof svc.analyzeImpact === 'function'){
    announceGraphics(L('Đang chạy impact analysis backend cho ', 'Running backend impact analysis for ') + change.label);
    svc.analyzeImpact(change, BASE_TEMPLATE_PRESETS).then(function(){
      announceGraphics(L('Impact analysis backend đã cập nhật cho ', 'Backend impact analysis updated for ') + change.label);
      renderAdminAppearance();
    }).catch(function(err){
      announceGraphics(L('Impact analysis không hoàn tất; publish/apply vẫn bị chặn.', 'Impact analysis did not complete; publish/apply remains blocked.'));
      if(typeof showToast === 'function') showToast(String(err && err.message || err || 'impact_failed'), 'warning');
      renderAdminAppearance();
    });
    refreshImpactPanel();
    return;
  }
  if(svc && typeof svc.markChange === 'function'){
    svc.markChange(change, BASE_TEMPLATE_PRESETS);
  }
  renderAdminAppearance();
};

window._admGraphicsRunPolicyPackImpact = function(policyPack){
  var svc = graphicsSvc();
  var pack = String(policyPack || '');
  if(svc && typeof svc.analyzePolicyPackImpact === 'function'){
    announceGraphics(L('Đang chạy impact analysis cho policy pack ', 'Running impact analysis for policy pack ') + pack);
    svc.analyzePolicyPackImpact(pack, { policyPack:pack }).then(function(){
      announceGraphics(L('Policy pack impact analysis đã cập nhật: ', 'Policy pack impact analysis updated: ') + pack);
      renderAdminAppearance();
    }).catch(function(err){
      announceGraphics(L('Policy pack impact analysis không hoàn tất; rollout vẫn bị chặn.', 'Policy pack impact analysis did not complete; rollout remains blocked.'));
      if(typeof showToast === 'function') showToast(String(err && err.message || err || 'impact_failed'), 'warning');
      renderAdminAppearance();
    });
    refreshImpactPanel();
    return;
  }
  window._admGraphicsRunImpact('environment-policy', pack);
};

window._admGraphicsTemplateAction = function(action, id){
  var tpl = getTemplateById(id);
  if(!tpl) return;
  var svc = graphicsSvc();
  if(action === 'preview'){
    if(svc && typeof svc.saveTemplatePreview === 'function') svc.saveTemplatePreview(tpl);
    announceGraphics(L('Preview cache đã lưu; backend authority không đổi.', 'Preview cache saved; backend authority unchanged.'));
    if(typeof showToast === 'function') showToast(L('Đã lưu cache xem trước, chưa thay authority', 'Preview cache saved; authority unchanged'), 'success');
    renderAdminAppearance();
    return;
  }
  if(!svc || typeof svc.templateAction !== 'function'){
    announceGraphics(L('Graphics governance service chưa sẵn sàng; workflow bị chặn.', 'Graphics governance service is not ready; workflow blocked.'));
    if(typeof showToast === 'function') showToast(L('Graphics governance service chưa sẵn sàng', 'Graphics governance service is not ready'), 'error');
    return;
  }
  var payload = { template:tpl };
  var snap = graphicsSnapshot();
  if(action === 'publish' && snap.releaseEvidencePack){
    payload.releaseEvidence = snap.releaseEvidencePack;
  }
  svc.templateAction(action, tpl.templateId || tpl.id, payload).then(function(result){
    announceGraphics((result && result.message) ? result.message : (L('Workflow template đã ghi nhận: ', 'Template workflow recorded: ') + action));
    if(typeof showToast === 'function'){
      showToast(result && result.message ? result.message : (L('Đã ghi nhận workflow', 'Workflow recorded') + ': ' + action), result && result.ok === false ? 'warning' : 'success');
    }
    renderAdminAppearance();
  }).catch(function(err){
    announceGraphics(L('Workflow template thất bại; authority không đổi.', 'Template workflow failed; authority unchanged.'));
    if(typeof showToast === 'function') showToast(String(err && err.message || err || 'workflow_failed'), 'error');
    renderAdminAppearance();
  });
};

window._admGraphicsWaiverAction = function(action, waiverId){
  var svc = graphicsSvc();
  if(!svc || !waiverId) return;
  var fn = action === 'approve' ? svc.approveWaiver : (action === 'expire' ? svc.expireWaiver : null);
  if(typeof fn !== 'function'){
    announceGraphics(L('Waiver lifecycle endpoint chưa sẵn sàng.', 'Waiver lifecycle endpoint is not ready.'));
    if(typeof showToast === 'function') showToast(L('Waiver endpoint chưa sẵn sàng', 'Waiver endpoint is not ready'), 'warning');
    return;
  }
  fn.call(svc, { waiverId:waiverId }).then(function(result){
    announceGraphics((result && result.message) || (action + ' waiver ' + waiverId));
    if(typeof showToast === 'function') showToast((result && result.message) || (action + ' waiver'), result && result.ok === false ? 'warning' : 'success');
    renderAdminAppearance();
  }).catch(function(err){
    announceGraphics(L('Waiver action bị backend chặn.', 'Waiver action was blocked by backend authority.'));
    if(typeof showToast === 'function') showToast(String(err && err.message || err || 'waiver_action_failed'), 'error');
    renderAdminAppearance();
  });
};

window._admGraphicsStageCanary = function(id){
  var tpl = getTemplateById(id);
  if(!tpl) return;
  var svc = graphicsSvc();
  if(!svc || typeof svc.stageGraphicsRollout !== 'function'){
    announceGraphics(L('Graphics governance service chưa sẵn sàng; không thể stage canary.', 'Graphics governance service is not ready; cannot stage canary.'));
    if(typeof showToast === 'function') showToast(L('Graphics governance service chưa sẵn sàng', 'Graphics governance service is not ready'), 'error');
    return;
  }
  announceGraphics(L('Đang stage canary rollout cho template ', 'Staging canary rollout for template ') + (tpl.templateId || tpl.id));
  svc.stageGraphicsRollout({
    templateId: tpl.templateId || tpl.id,
    impactType:'template',
    scope:{
      mode:'canary-module-group',
      templates:[tpl.templateId || tpl.id],
      modules:tpl.governedModules || tpl.modules || []
    },
    releaseManifestRefs:[{
      refType:'release_manifest',
      refId:'admin-appearance-canary-shell',
      uri:'mom/data/registry/graphics-governance-registry.json'
    }]
  }).then(function(result){
    announceGraphics((result && result.message) ? result.message : L('Canary rollout đã được stage.', 'Canary rollout staged.'));
    if(typeof showToast === 'function'){
      showToast(result && result.message ? result.message : L('Đã stage canary rollout', 'Canary rollout staged'), result && result.ok === false ? 'warning' : 'success');
    }
    renderAdminAppearance();
  }).catch(function(err){
    announceGraphics(L('Stage canary rollout thất bại; apply vẫn bị chặn.', 'Canary rollout staging failed; apply remains blocked.'));
    if(typeof showToast === 'function') showToast(String(err && err.message || err || 'rollout_failed'), 'error');
    renderAdminAppearance();
  });
};

window._admGraphicsSetWaiver = function(field, value){
  if(field === 'subject') _waiverSubject = value || '';
  if(field === 'reason') _waiverReason = value || '';
  if(field === 'owner') _waiverOwner = value || '';
  if(field === 'approver') _waiverApprover = value || '';
  if(field === 'riskClass') _waiverRiskClass = value || 'high';
  if(field === 'expiresAt') _waiverExpiresAt = value || '';
};

window._admGraphicsRequestWaiver = function(){
  var svc = graphicsSvc();
  if(!svc || typeof svc.requestWaiver !== 'function'){
    announceGraphics(L('Graphics governance service chưa sẵn sàng; không thể gửi waiver.', 'Graphics governance service is not ready; cannot request waiver.'));
    return;
  }
  var target = _waiverSubject || 'G19-graphics-governance';
  var waiverScope = (target === 'G19-graphics-governance' || target === 'graphics-governance') ? 'graphics-governance' : (/^T\d+/i.test(target) ? 'template' : 'module');
  var expiresAt = _waiverExpiresAt ? (new Date(_waiverExpiresAt + 'T23:59:59Z')).toISOString() : (function(){ var d = new Date(); d.setDate(d.getDate() + 30); return d.toISOString(); })();
  announceGraphics(L('Đang gửi waiver governance cho ', 'Submitting governance waiver for ') + target);
  svc.requestWaiver({
    subjectId: target,
    targetId: target,
    reason: _waiverReason || L('Cần đánh giá ngoại lệ đồ họa trước rollout.', 'Graphics exception requires review before rollout.'),
    reasonText: _waiverReason || L('Cần đánh giá ngoại lệ đồ họa trước rollout.', 'Graphics exception requires review before rollout.'),
    risk: (_waiverRiskClass || 'high') + ' graphics governance exception',
    riskClass: _waiverRiskClass || 'high',
    compensatingControl: L('Giữ rollback plan và evidence snapshot cho đến khi quay lại shared token/component authority.', 'Keep rollback plan and evidence snapshot until the change returns to shared token/component authority.'),
    owner: _waiverOwner || 'Admin Appearance',
    approver: _waiverApprover || 'QA Governance',
    expiresAt: expiresAt,
    requestedBy: 'Admin Appearance',
    scope: waiverScope,
    releaseManifestRefs: [
      { refType:'release_manifest', refId:'mom/release/manifests/release-manifest.template.json', uri:'mom/release/manifests/release-manifest.template.json' },
      { refType:'graphics_evidence_pack', refId:'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseEvidencePack', uri:'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseEvidencePack' }
    ],
    documentControlRefs: [
      'mom/data/registry/graphics-governance-registry.json#/controlledEmergencyOverridePath',
      'mom/data/registry/graphics-governance-registry.json#/graphicsReleaseLink'
    ]
  }).then(function(result){
    announceGraphics((result && result.message) ? result.message : L('Waiver request đã gửi vào backend governance.', 'Waiver request submitted to backend governance.'));
    if(typeof showToast === 'function'){
      showToast(result && result.message ? result.message : L('Đã gửi yêu cầu waiver', 'Waiver request submitted'), result && result.ok === false ? 'warning' : 'success');
    }
    renderAdminAppearance();
  }).catch(function(err){
    announceGraphics(L('Waiver request thất bại; blocker vẫn active.', 'Waiver request failed; blocker remains active.'));
    if(typeof showToast === 'function') showToast(String(err && err.message || err || 'waiver_failed'), 'error');
    renderAdminAppearance();
  });
};

window._admGraphicsProbeContracts = function(){
  var svc = graphicsSvc();
  if(!svc || typeof svc.probeContracts !== 'function'){
    if(typeof showToast === 'function') showToast(L('Graphics governance service chưa sẵn sàng.', 'Graphics governance service not ready.'), 'warning');
    return;
  }
  announceGraphics(L('Đang probe tất cả endpoints...', 'Probing all endpoints...'));
  svc.probeContracts().then(function(result){
    var statuses = result.endpointStatus || {};
    var keys = Object.keys(statuses);
    var online = keys.filter(function(k){ return statuses[k] === 'online'; }).length;
    if(typeof showToast === 'function') showToast(online + '/' + keys.length + ' endpoints online', online === keys.length ? 'success' : 'warning');
    _refreshAuthorityPanelOnly();
  }).catch(function(){
    if(typeof showToast === 'function') showToast(L('Probe thất bại.', 'Probe failed.'), 'error');
    _refreshAuthorityPanelOnly();
  });
};

window._admGraphicsForceRefresh = function(){
  var svc = graphicsSvc();
  if(!svc || typeof svc.refresh !== 'function'){
    if(typeof showToast === 'function') showToast(L('Graphics governance service chưa sẵn sàng.', 'Graphics governance service not ready.'), 'warning');
    return;
  }
  // Do NOT reset _graphicsRefreshStarted — that guard prevents ensureGraphicsRefresh()
  // from starting another refresh after renderAdminAppearance() is called, which
  // would create an infinite render loop.
  announceGraphics(L('Đang refresh live governance data...', 'Refreshing live governance data...'));
  svc.refresh(BASE_TEMPLATE_PRESETS).then(function(){
    if(typeof showToast === 'function') showToast(L('Governance data đã được cập nhật.', 'Governance data refreshed.'), 'success');
    _refreshAuthorityPanelOnly();
  }).catch(function(){
    if(typeof showToast === 'function') showToast(L('Refresh thất bại.', 'Refresh failed.'), 'error');
    _refreshAuthorityPanelOnly();
  });
};

function joinList(items, emptyText){
  items = items || [];
  return items.length ? items.map(esc).join(', ') : esc(emptyText || '-');
}

function _contractStatusChip(state){
  if(!state || state === 'not checked'){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:var(--bg-surface-alt,#f1f5f9);color:var(--text-secondary,#64748b);border:1px solid var(--border,#e2e8f0)">⬜ not checked</span>';
  }
  if(state === 'online'){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--green,#16a34a) 12%,var(--bg-surface,#fff));color:var(--green,#166534);border:1px solid color-mix(in srgb,var(--green,#16a34a) 30%,transparent)">✅ online</span>';
  }
  if(state === 'auth-blocked'){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--amber,#f57f17) 10%,var(--bg-surface,#fff));color:color-mix(in srgb,var(--amber,#f57f17) 60%,#000 40%);border:1px solid color-mix(in srgb,var(--amber,#f57f17) 30%,transparent)">🔐 auth-blocked</span>';
  }
  if(state === 'not-found'){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--red,#c62828) 10%,var(--bg-surface,#fff));color:var(--red,#991b1b);border:1px solid color-mix(in srgb,var(--red,#c62828) 25%,transparent)">❌ not-found</span>';
  }
  if(/^offline/.test(state)){
    return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--red,#c62828) 10%,var(--bg-surface,#fff));color:var(--red,#991b1b);border:1px solid color-mix(in srgb,var(--red,#c62828) 25%,transparent)">🔴 '+esc(state)+'</span>';
  }
  return '<span style="display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:color-mix(in srgb,var(--amber,#f57f17) 10%,var(--bg-surface,#fff));color:color-mix(in srgb,var(--amber,#f57f17) 60%,#000 40%);border:1px solid color-mix(in srgb,var(--amber,#f57f17) 28%,transparent)">⚠️ '+esc(state)+'</span>';
}

/* ─────────────────────────────────────────────────────────────────────────
   MODULE COMPLIANCE EDITOR
   Reads compliance matrix → shows violations per module → edits CSS override
   stored in design-system-config.json ▸ moduleOverrides
───────────────────────────────────────────────────────────────────────── */
var _moduleOverrideDrafts = {};

function _moduleOverrideGetCfg(){
  var tm = (typeof HmTheme !== 'undefined') ? HmTheme : null;
  var cfg = tm && typeof tm.getAdminConfig === 'function' ? tm.getAdminConfig() : {};
  return cfg && cfg.moduleOverrides ? cfg.moduleOverrides : {};
}

function _moduleDebtScore(row){
  return ((row.bridgeAliasDebt||0)*2) + ((row.privateCssDebt||0)*1.5) + ((row.hardcodedStyleDebt||0)*3) + (row.usesPrivateCssShell ? 20 : 0);
}

function _moduleComplianceBadge(row){
  if(!row) return statusChip('neutral','unknown');
  var s = row.linkageStatus || row.status || '';
  if(s === 'full-admin-controlled' || s === 'full') return statusChip('full', L('Tuân thủ','Compliant'));
  if(s === 'bridged-to-shared-tokens') return statusChip('preview', L('Bridged','Bridged'));
  if(s === 'legacy-private-css') return statusChip('partial', L('Vi phạm','Non-compliant'));
  if(s === 'blocked') return statusChip('partial', L('Blocked','Blocked'));
  return statusChip('neutral', esc(s || 'unknown'));
}

function _moduleDebtBar(score){
  var pct = Math.min(100, Math.round(score));
  var color = pct < 20 ? 'var(--green,#22c55e)' : pct < 50 ? 'var(--amber,#f59e0b)' : 'var(--red,#ef4444)';
  return '<div style="display:flex;align-items:center;gap:6px">'
    + '<div style="flex:1;height:6px;border-radius:3px;background:var(--border,#e2e8f0);overflow:hidden">'
    + '<div style="height:100%;width:'+pct+'%;background:'+color+';border-radius:3px;transition:width .3s"></div>'
    + '</div>'
    + '<span style="font-size:10px;color:var(--text-secondary);min-width:28px;text-align:right">'+pct+'</span>'
    + '</div>';
}

function _renderModuleOverrideEditor(moduleId, complianceRow){
  var savedOverrides = _moduleOverrideGetCfg();
  var saved = savedOverrides[moduleId] || {};
  var draft = _moduleOverrideDrafts[moduleId] || null;
  if(!draft){
    _moduleOverrideDrafts[moduleId] = {
      scope: saved.scope || '',
      tokens: JSON.parse(JSON.stringify(saved.tokens || {})),
      css: saved.css || '',
      enabled: saved.enabled !== false && !!saved.scope
    };
    draft = _moduleOverrideDrafts[moduleId];
  }
  var hasOverride = !!saved.scope;
  var isEnabled = hasOverride && saved.enabled !== false;

  var tokenRows = Object.keys(draft.tokens).map(function(prop, i){
    return '<tr>'
      + '<td style="padding:4px 6px"><input type="text" value="'+esc(prop)+'" oninput="_admModuleOverrideTokenKey(\''+esc(moduleId)+'\','+i+',this.value)" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:var(--font-mono);background:var(--bg-surface)"></td>'
      + '<td style="padding:4px 6px"><input type="text" value="'+esc(draft.tokens[prop])+'" oninput="_admModuleOverrideTokenVal(\''+esc(moduleId)+'\','+i+',this.value)" style="width:100%;padding:3px 6px;border:1px solid var(--border);border-radius:4px;font-size:11px;font-family:var(--font-mono);background:var(--bg-surface)"></td>'
      + '<td style="padding:4px 6px;text-align:center"><button onclick="_admModuleOverrideTokenDel(\''+esc(moduleId)+'\','+i+')" style="padding:2px 8px;border:1px solid color-mix(in srgb,var(--red,#c62828) 30%,transparent);border-radius:4px;background:var(--bg-surface,#fff);color:var(--red,#dc2626);font-size:11px;cursor:pointer">✕</button></td>'
      + '</tr>';
  }).join('');

  return '<div id="mod-override-editor-'+esc(moduleId)+'" style="margin-top:12px;padding:14px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface-alt,var(--bg-hover))">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:12px;flex-wrap:wrap">'
    + '<div style="font-size:12px;font-weight:700;color:var(--text-primary)">🎨 Module CSS Override</div>'
    + '<div style="display:flex;gap:6px;align-items:center">'
    + (hasOverride ? '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:'+(isEnabled?'color-mix(in srgb,var(--green,#16a34a) 12%,var(--bg-surface,#fff))':'var(--bg-surface-alt,#f1f5f9)')+';color:'+(isEnabled?'var(--green,#166534)':'var(--text-secondary,#64748b)')+';border:1px solid '+(isEnabled?'color-mix(in srgb,var(--green,#16a34a) 28%,transparent)':'var(--border,#e2e8f0)')+';">'+(isEnabled?'● Enabled':'○ Disabled')+'</span>' : '')
    + (hasOverride ? '<button onclick="_admModuleOverrideToggle(\''+esc(moduleId)+'\')" style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-primary)">'+(isEnabled?L('Tắt','Disable'):L('Bật','Enable'))+'</button>' : '')
    + (hasOverride ? '<button onclick="_admModuleOverrideDelete(\''+esc(moduleId)+'\')" style="padding:3px 10px;border-radius:4px;font-size:11px;font-weight:600;cursor:pointer;border:1px solid color-mix(in srgb,var(--red,#c62828) 30%,transparent);background:var(--bg-surface,#fff);color:var(--red,#dc2626)">'+L('Xóa','Delete')+'</button>' : '')
    + '</div>'
    + '</div>'
    + '<div style="margin-bottom:10px">'
    + '<label style="display:block;font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px">'+L('CSS scope selector','CSS scope selector')+'</label>'
    + '<input type="text" id="mod-scope-'+esc(moduleId)+'" placeholder=".module-class, [data-module=\'id\']" value="'+esc(draft.scope)+'" oninput="_admModuleOverrideDraftScope(\''+esc(moduleId)+'\',this.value)" style="width:100%;padding:6px 10px;border:1px solid var(--border);border-radius:6px;font-size:12px;font-family:var(--font-mono);background:var(--bg-surface)">'
    + '<div style="font-size:10px;color:var(--text-tertiary);margin-top:3px">'+L('CSS selector bao ngoài module — ví dụ: .eqms-suite, [data-route]','Outer CSS selector for the module — e.g. .eqms-suite, [data-route]')+'</div>'
    + '</div>'
    + '<div style="margin-bottom:10px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">'
    + '<label style="font-size:11px;font-weight:700;color:var(--text-secondary)">'+L('Token mappings (CSS custom properties)','Token mappings (CSS custom properties)')+'</label>'
    + '<button onclick="_admModuleOverrideTokenAdd(\''+esc(moduleId)+'\')" style="padding:2px 10px;border:1px solid var(--border);border-radius:4px;font-size:11px;cursor:pointer;background:var(--bg-surface)">+ Add</button>'
    + '</div>'
    + '<table style="width:100%;border-collapse:collapse;font-size:11px"><thead><tr>'
    + '<th style="text-align:left;padding:4px 6px;font-size:10px;color:var(--text-secondary);font-weight:700;border-bottom:1px solid var(--border)">CSS property</th>'
    + '<th style="text-align:left;padding:4px 6px;font-size:10px;color:var(--text-secondary);font-weight:700;border-bottom:1px solid var(--border)">Value</th>'
    + '<th style="width:40px;border-bottom:1px solid var(--border)"></th>'
    + '</tr></thead><tbody id="mod-tokens-'+esc(moduleId)+'">'
    + (tokenRows || '<tr><td colspan="3" style="padding:8px;color:var(--text-tertiary);font-size:11px;font-style:italic">'+L('Chưa có token mapping nào.','No token mappings yet.')+'</td></tr>')
    + '</tbody></table>'
    + '</div>'
    + '<div style="margin-bottom:12px">'
    + '<label style="display:block;font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:4px">'+L('Raw CSS (tùy chỉnh nâng cao)','Raw CSS (advanced override)')+'</label>'
    + '<textarea id="mod-css-'+esc(moduleId)+'" rows="5" oninput="_admModuleOverrideDraftCss(\''+esc(moduleId)+'\',this.value)" style="width:100%;padding:8px 10px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-family:var(--font-mono);background:var(--bg-surface);resize:vertical;box-sizing:border-box" placeholder=".module-class .hm-table { background: var(--bg-surface); }">'+esc(draft.css)+'</textarea>'
    + '<div style="font-size:10px;color:var(--text-tertiary);margin-top:3px">'+L('CSS tùy chỉnh nằm trong scope selector. Sẽ được inject sau token mappings.','Custom CSS within the scope. Injected after token mappings.')+'</div>'
    + '</div>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button onclick="_admModuleOverridePreview(\''+esc(moduleId)+'\')" style="padding:6px 14px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-primary)">👁 '+L('Preview','Preview')+'</button>'
    + '<button onclick="_admModuleOverrideSave(\''+esc(moduleId)+'\')" style="padding:6px 16px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:var(--brand-2);color:var(--text-inverse,#fff)">💾 '+L('Lưu override','Save override')+'</button>'
    + '</div>'
    + '</div>';
}

function renderModuleComplianceEditorPanel(){
  var snap = graphicsSnapshot();
  var compliance = snap.compliance || [];
  var savedOverrides = _moduleOverrideGetCfg();

  var overrideCount = Object.keys(savedOverrides).filter(function(k){ return savedOverrides[k] && savedOverrides[k].enabled; }).length;
  var nonCompliant = compliance.filter(function(r){ return r.linkageStatus !== 'full-admin-controlled' && r.linkageStatus !== 'full'; });
  var compliant = compliance.filter(function(r){ return r.linkageStatus === 'full-admin-controlled' || r.linkageStatus === 'full'; });

  var summaryCards = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px">'
    + infoCard(L('Tổng module','Total modules'), String(compliance.length), 'neutral')
    + infoCard(L('Tuân thủ','Compliant'), String(compliant.length), compliant.length === compliance.length ? 'full' : 'partial')
    + infoCard(L('Vi phạm','Non-compliant'), String(nonCompliant.length), nonCompliant.length ? 'partial' : 'full')
    + infoCard(L('Override đang bật','Active overrides'), String(overrideCount), overrideCount ? 'preview' : 'neutral')
    + '</div>';

  var moduleCards = compliance.map(function(row){
    var moduleId = row.moduleId || '';
    var score = _moduleDebtScore(row);
    var hasOverride = !!(savedOverrides[moduleId] && savedOverrides[moduleId].scope);
    var isNonCompliant = row.linkageStatus !== 'full-admin-controlled' && row.linkageStatus !== 'full';
    var borderColor = isNonCompliant ? 'color-mix(in srgb,var(--red,#ef4444) 35%,transparent)' : 'color-mix(in srgb,var(--green,#16a34a) 30%,transparent)';
    var violations = [];
    if(row.usesPrivateCssShell) violations.push(L('Shell CSS riêng (không dùng hm-*)','Private CSS shell (not using hm-*)'));
    if(row.hardcodedStyleDebt > 0) violations.push(L('Hardcoded styles: ','Hardcoded styles: ') + row.hardcodedStyleDebt);
    if(row.privateCssDebt > 0) violations.push(L('Private CSS tokens: ','Private CSS tokens: ') + row.privateCssDebt);
    if(row.bridgeAliasDebt > 0) violations.push(L('Bridge alias debt: ','Bridge alias debt: ') + row.bridgeAliasDebt);
    if(!row.consumesSharedTokens) violations.push(L('Không dùng shared tokens','Not consuming shared tokens'));
    if(!row.consumesHmComponents) violations.push(L('Không dùng hm-* components','Not using hm-* components'));
    (row.findings || []).forEach(function(f){ if(f && (f.message || f.code)) violations.push(f.message || f.code); });

    return '<div id="mod-card-'+esc(moduleId)+'" style="border:1px solid '+borderColor+';border-radius:10px;overflow:hidden;background:var(--bg-surface)">'
      + '<div style="padding:12px 14px;background:var(--bg-surface-alt,var(--bg-hover));display:flex;align-items:flex-start;justify-content:space-between;gap:10px;flex-wrap:wrap">'
      + '<div>'
      + '<div style="font-size:13px;font-weight:700;color:var(--text-primary)">'+esc(row.moduleName || moduleId)+'</div>'
      + '<div style="font-size:11px;color:var(--text-secondary);margin-top:2px">'+esc(row.route || '')+(row.domain?' · '+esc(row.domain):'')+'</div>'
      + '</div>'
      + '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">'
      + _moduleComplianceBadge(row)
      + (hasOverride ? statusChip('preview', L('Override active','Override active')) : '')
      + '</div>'
      + '</div>'
      + '<div style="padding:12px 14px">'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
      + '<div><div style="font-size:10px;color:var(--text-secondary);font-weight:700;margin-bottom:4px">'+L('Debt score','Debt score')+'</div>'+_moduleDebtBar(score)+'</div>'
      + '<div><div style="font-size:10px;color:var(--text-secondary);font-weight:700;margin-bottom:4px">'+L('Linkage','Linkage')+'</div><div style="font-size:11px;color:var(--text-secondary);font-family:var(--font-mono)">'+esc(row.linkageStatus||'-')+'</div></div>'
      + '</div>'
      + (violations.length ? '<div style="margin-bottom:10px"><div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">'+L('Vi phạm','Violations')+'</div>'
        + '<ul style="margin:0;padding-left:16px">'
        + violations.map(function(v){ return '<li style="font-size:11px;color:var(--red,#dc2626);margin-bottom:2px">'+esc(String(v))+'</li>'; }).join('')
        + '</ul></div>' : '<div style="font-size:11px;color:var(--green,#22c55e);margin-bottom:10px">✓ '+L('Không có vi phạm được phát hiện','No violations detected')+'</div>')
      + _renderModuleOverrideEditor(moduleId, row)
      + '</div>'
      + '</div>';
  }).join('');

  var empty = !compliance.length ? '<div style="padding:24px;text-align:center;color:var(--text-secondary);font-size:13px">'+L('Chưa có dữ liệu compliance. Nhấn "Refresh live data" ở panel trên.','No compliance data. Click "Refresh live data" in the panel above.')+'</div>' : '';

  return sect(
    L('Module Compliance Editor', 'Module Compliance Editor'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px;line-height:1.6">'
    + L('Mỗi module có thể được cài CSS override scoped — token mappings + raw CSS — được inject thẳng vào trang qua ThemeManager mà không sửa code module. Override lưu vào design-system-config và áp dụng ngay.','Each module can have a scoped CSS override — token mappings + raw CSS — injected directly by ThemeManager without touching module source code. Overrides are saved to design-system-config and applied immediately.')
    + '</div>'
    + summaryCards
    + (empty || '<div style="display:flex;flex-direction:column;gap:12px">'+moduleCards+'</div>'),
    false,
    statusChip('admin', L('CSS injection','CSS injection'))
    + statusChip(nonCompliant.length ? 'partial' : 'full', nonCompliant.length + ' ' + L('vi phạm','non-compliant'))
  );
}

window._admModuleOverrideDraftScope = function(moduleId, value){
  if(!_moduleOverrideDrafts[moduleId]) _moduleOverrideDrafts[moduleId] = { scope:'', tokens:{}, css:'', enabled:true };
  _moduleOverrideDrafts[moduleId].scope = value;
};
window._admModuleOverrideDraftCss = function(moduleId, value){
  if(!_moduleOverrideDrafts[moduleId]) _moduleOverrideDrafts[moduleId] = { scope:'', tokens:{}, css:'', enabled:true };
  _moduleOverrideDrafts[moduleId].css = value;
};
window._admModuleOverrideTokenAdd = function(moduleId){
  if(!_moduleOverrideDrafts[moduleId]) _moduleOverrideDrafts[moduleId] = { scope:'', tokens:{}, css:'', enabled:true };
  _moduleOverrideDrafts[moduleId].tokens['--new-prop'] = 'var(--token)';
  var el = document.getElementById('mod-override-editor-'+moduleId);
  if(el){ el.outerHTML = _renderModuleOverrideEditor(moduleId, null); }
};
window._admModuleOverrideTokenKey = function(moduleId, idx, newKey){
  var draft = _moduleOverrideDrafts[moduleId];
  if(!draft) return;
  var keys = Object.keys(draft.tokens);
  if(idx < 0 || idx >= keys.length) return;
  var oldKey = keys[idx];
  var val = draft.tokens[oldKey];
  var rebuilt = {};
  keys.forEach(function(k, i){ rebuilt[i === idx ? newKey : k] = draft.tokens[k]; });
  draft.tokens = rebuilt;
};
window._admModuleOverrideTokenVal = function(moduleId, idx, newVal){
  var draft = _moduleOverrideDrafts[moduleId];
  if(!draft) return;
  var keys = Object.keys(draft.tokens);
  if(idx < 0 || idx >= keys.length) return;
  draft.tokens[keys[idx]] = newVal;
};
window._admModuleOverrideTokenDel = function(moduleId, idx){
  var draft = _moduleOverrideDrafts[moduleId];
  if(!draft) return;
  var keys = Object.keys(draft.tokens);
  if(idx < 0 || idx >= keys.length) return;
  delete draft.tokens[keys[idx]];
  var el = document.getElementById('mod-override-editor-'+moduleId);
  if(el){ el.outerHTML = _renderModuleOverrideEditor(moduleId, null); }
};
window._admModuleOverridePreview = function(moduleId){
  var draft = _moduleOverrideDrafts[moduleId];
  if(!draft || !draft.scope.trim()){ if(typeof showToast === 'function') showToast(L('Nhập scope selector trước.','Enter a scope selector first.'), 'warning'); return; }
  var id = 'hds-module-override-preview-' + moduleId.replace(/[^a-z0-9]/gi,'-');
  var el = document.getElementById(id);
  if(!el){ el = document.createElement('style'); el.id = id; document.head.appendChild(el); }
  var scope = draft.scope.trim();
  var tokenLines = Object.keys(draft.tokens).map(function(p){ return '  '+p.trim()+': '+String(draft.tokens[p]||'')+';'; });
  var block = tokenLines.length ? scope + ' {\n' + tokenLines.join('\n') + '\n}' : '';
  el.textContent = (block ? block + '\n\n' : '') + (draft.css ? '/* preview */\n' + draft.css : '');
  if(typeof showToast === 'function') showToast(L('Preview đang áp dụng — chưa lưu.','Preview applied — not yet saved.'), 'info');
};
window._admModuleOverrideSave = function(moduleId){
  var draft = _moduleOverrideDrafts[moduleId];
  if(!draft){ if(typeof showToast === 'function') showToast(L('Không có thay đổi để lưu.','Nothing to save.'), 'warning'); return; }
  if(!draft.scope.trim()){ if(typeof showToast === 'function') showToast(L('Scope selector không được để trống.','Scope selector is required.'), 'warning'); return; }
  var tm = (typeof HmTheme !== 'undefined') ? HmTheme : null;
  if(!tm || typeof tm.getAdminConfig !== 'function' || typeof tm.saveAdminConfig !== 'function'){ if(typeof showToast === 'function') showToast(L('ThemeManager chưa sẵn sàng.','ThemeManager not ready.'), 'error'); return; }
  var cfg = JSON.parse(JSON.stringify(tm.getAdminConfig() || {}));
  if(!cfg.moduleOverrides) cfg.moduleOverrides = {};
  cfg.moduleOverrides[moduleId] = { scope: draft.scope.trim(), tokens: draft.tokens, css: draft.css, enabled: draft.enabled !== false };
  delete _moduleOverrideDrafts[moduleId];
  tm.saveAdminConfig(cfg, function(ok){
    if(typeof showToast === 'function') showToast(ok ? L('Module override đã lưu và áp dụng.','Module override saved and applied.') : L('Lưu thất bại — override đang ở trạng thái preview.','Save failed — override is in preview state.'), ok ? 'success' : 'error');
    renderAdminAppearance();
  });
};
window._admModuleOverrideToggle = function(moduleId){
  var tm = (typeof HmTheme !== 'undefined') ? HmTheme : null;
  if(!tm) return;
  var cfg = JSON.parse(JSON.stringify(tm.getAdminConfig() || {}));
  if(!cfg.moduleOverrides || !cfg.moduleOverrides[moduleId]) return;
  cfg.moduleOverrides[moduleId].enabled = !cfg.moduleOverrides[moduleId].enabled;
  tm.saveAdminConfig(cfg, function(ok){
    if(typeof showToast === 'function') showToast(ok ? L('Đã cập nhật trạng thái override.','Override status updated.') : L('Lưu thất bại.','Save failed.'), ok ? 'success' : 'error');
    renderAdminAppearance();
  });
};
window._admModuleOverrideDelete = function(moduleId){
  var tm = (typeof HmTheme !== 'undefined') ? HmTheme : null;
  if(!tm) return;
  var cfg = JSON.parse(JSON.stringify(tm.getAdminConfig() || {}));
  if(cfg.moduleOverrides) delete cfg.moduleOverrides[moduleId];
  delete _moduleOverrideDrafts[moduleId];
  tm.saveAdminConfig(cfg, function(ok){
    if(typeof showToast === 'function') showToast(ok ? L('Đã xóa override.','Override deleted.') : L('Lưu thất bại.','Save failed.'), ok ? 'success' : 'error');
    renderAdminAppearance();
  });
};

function renderAuthorityStatusPanel(){
  var snap = graphicsSnapshot();
  var endpoints = snap.endpoints || {};
  var statuses = snap.endpointStatus || {};

  var totalOnline = 0, totalAuthBlocked = 0, totalNotFound = 0, totalOffline = 0, totalUnchecked = 0;
  Object.keys(endpoints).forEach(function(k){
    var s = statuses[k] || '';
    if(s === 'online') totalOnline++;
    else if(s === 'auth-blocked') totalAuthBlocked++;
    else if(s === 'not-found') totalNotFound++;
    else if(/^offline/.test(s)) totalOffline++;
    else totalUnchecked++;
  });

  var probeBtn = '<button onclick="_admGraphicsProbeContracts()" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-primary)">🔍 Probe all endpoints</button>';
  var refreshBtn = '<button onclick="_admGraphicsForceRefresh()" style="display:inline-flex;align-items:center;gap:6px;padding:6px 14px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-primary)">↻ Refresh live data</button>';
  var lastRefresh = snap.lastLoadedAt ? '<span style="font-size:11px;color:var(--text-secondary)">Last refresh: '+esc(snap.lastLoadedAt.replace('T',' ').replace(/\.\d+Z$/,' UTC'))+'</span>' : '';
  var lastProbe = (snap.lastProbeAt) ? '<span style="font-size:11px;color:var(--text-secondary)">Last probe: '+esc(snap.lastProbeAt.replace('T',' ').replace(/\.\d+Z$/,' UTC'))+'</span>' : '<span style="font-size:11px;color:var(--text-secondary)">Not probed yet — POST endpoints require manual probe</span>';

  var actionBar = '<div style="display:flex;align-items:center;flex-wrap:wrap;gap:8px;margin-bottom:14px">'
    + probeBtn + refreshBtn + lastRefresh + lastProbe + '</div>';

  var summaryCards = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px">'
    + infoCard('✅ Online', String(totalOnline) + ' / ' + String(Object.keys(endpoints).length), totalOnline === Object.keys(endpoints).length ? 'full' : 'partial')
    + infoCard('🔐 Auth-blocked', String(totalAuthBlocked), totalAuthBlocked ? 'preview' : 'neutral')
    + infoCard('❌ Not found', String(totalNotFound), totalNotFound ? 'partial' : 'neutral')
    + infoCard('🔴 Offline', String(totalOffline), totalOffline ? 'partial' : 'neutral')
    + infoCard('⬜ Not checked', String(totalUnchecked), totalUnchecked ? 'preview' : 'neutral')
    + infoCard(L('Registry authority', 'Registry authority'), snap.backendAvailable ? 'Backend online' : 'Backend offline', snap.backendAvailable ? 'full' : 'partial')
    + '</div>';

  var endpointRows = Object.keys(endpoints).map(function(key){
    var ep = endpoints[key];
    var state = statuses[key] || 'not checked';
    var isPost = ep.method === 'POST';
    var methodCell = isPost
      ? '<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--amber,#f59e0b) 14%,var(--bg-surface,#fff));color:var(--amber-dark,#92400e);font-family:var(--font-mono)">POST</span>'
      : '<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,var(--bg-surface,#fff));color:var(--brand-2,#075985);font-family:var(--font-mono)">GET</span>';
    var noteCell = isPost && state === 'not checked'
      ? '<span style="font-size:10px;color:var(--text-tertiary,#94a3b8);font-style:italic">mutation — probe to verify</span>'
      : (isPost ? '<span style="font-size:10px;color:var(--text-tertiary,#94a3b8);font-style:italic">mutation</span>' : '');
    return '<tr>'
      + '<td style="padding:7px 8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;white-space:nowrap">'+esc(key)+'</td>'
      + '<td style="padding:7px 8px;border-bottom:1px solid var(--border)">'+methodCell+'</td>'
      + '<td style="padding:7px 8px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary);font-family:var(--font-mono)">'+esc(ep.action)+'</td>'
      + '<td style="padding:7px 8px;border-bottom:1px solid var(--border)">'+_contractStatusChip(state)+'</td>'
      + '<td style="padding:7px 8px;border-bottom:1px solid var(--border)">'+noteCell+'</td>'
      + '</tr>';
  }).join('');

  var authorityCards = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">'
    + infoCard('Standard 36', L('Production authority cho template, block, token, QA gate và release evidence.', 'Production authority for templates, blocks, tokens, QA gates, and release evidence.'), 'full')
    + infoCard(L('Graphics governance', 'Graphics governance'), L('Admin Appearance là token editor + governance console.', 'Admin Appearance is token editor plus governance console.'), 'full')
    + infoCard(L('Local cache policy', 'Local cache policy'), L('Chỉ dùng preview_cache và draft_cache cho preview/draft.', 'Only preview_cache and draft_cache are used for preview/draft.'), 'preview')
    + '</div>';

  return sect(
    L('Contract Authority & Endpoint Health', 'Contract Authority & Endpoint Health'),
    authorityCards
    + actionBar
    + summaryCards
    + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
    + '<th style="text-align:left;padding:7px 8px;border-bottom:2px solid var(--border);font-size:11px">Contract</th>'
    + '<th style="text-align:left;padding:7px 8px;border-bottom:2px solid var(--border);font-size:11px">Method</th>'
    + '<th style="text-align:left;padding:7px 8px;border-bottom:2px solid var(--border);font-size:11px">Action</th>'
    + '<th style="text-align:left;padding:7px 8px;border-bottom:2px solid var(--border);font-size:11px">Status</th>'
    + '<th style="text-align:left;padding:7px 8px;border-bottom:2px solid var(--border);font-size:11px">Note</th>'
    + '</tr></thead><tbody>'+endpointRows+'</tbody></table>',
    true,
    statusChip(snap.backendAvailable ? 'full' : 'partial', snap.registryAuthority || 'fallback')
  );
}

function renderAuthorityStatusPanelWrapped(){
  return '<div id="adm-authority-panel">'+renderAuthorityStatusPanel()+'</div>';
}

function _refreshAuthorityPanelOnly(){
  var el = document.getElementById('adm-authority-panel');
  if(el){ el.innerHTML = renderAuthorityStatusPanel(); }
  else { renderAdminAppearance(); }
}

function renderControlledRegistrySummary(){
  var snap = graphicsSnapshot();
  var templates = getAllTemplates();
  var controlledTemplates = templates.filter(function(tpl){
    return /backend-graphics-authority|backend|controlled/i.test(String(tpl.sourceAuthority || tpl.controlMode || ''))
      && !/preview-cache|unsaved-draft-cache|draft-cache|preview-seed/i.test(String(tpl.sourceAuthority || tpl.controlMode || ''));
  });
  var overlayTemplates = snap.localCacheTemplates || [];
  var counts = {};
  templates.forEach(function(tpl){ counts[tpl.status] = (counts[tpl.status] || 0) + 1; });
  return '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;margin-bottom:12px">'
    + infoCard(L('Controlled registry', 'Controlled registry'), String(controlledTemplates.length) + ' / ' + String(templates.length) + ' ' + T('templateCount'), snap.backendAvailable ? 'full' : 'partial')
    + infoCard(L('Preview/draft overlays', 'Preview/draft overlays'), String(overlayTemplates.length), overlayTemplates.length ? 'preview' : 'neutral')
    + infoCard('Published', String(counts.published || 0), 'full')
    + infoCard('Validated', String(counts.validated || 0), 'full')
    + infoCard('Draft only', String(counts['draft-only'] || 0), 'preview')
    + infoCard('Legacy bridged', String(counts['legacy-bridged'] || 0), 'admin')
    + infoCard('Publish blocked', String(counts['publish-blocked'] || 0), counts['publish-blocked'] ? 'partial' : 'neutral')
    + '</div>';
}

function renderLocalTemplateCachePanel(){
  var snap = graphicsSnapshot();
  var rows = (snap.localCacheTemplates || []).slice(0, 8).map(function(tpl){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(tpl.templateId || tpl.id || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+statusChip('preview', tpl.sourceAuthority || tpl.controlMode || 'cache')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary)">'+esc(L('Không được dùng làm registry authority hoặc publish state.', 'Not used as registry authority or publish state.'))+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Draft / preview cache inventory', 'Draft / preview cache inventory'),
    '<div style="font-size:11px;line-height:1.65;color:var(--text-secondary);margin-bottom:10px">'
      + esc(L('Các bản này chỉ là cache trình duyệt để xem trước hoặc khôi phục draft chưa lưu; registry controlled bên trên không bị shadow bởi localStorage.', 'These records are browser cache only for preview or unsaved draft recovery; the controlled registry above is not shadowed by localStorage.'))
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">templateId</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">cache state</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">authority rule</th>'
      + '</tr></thead><tbody>'
      + (rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-secondary)">No local draft or preview cache records</td></tr>')
      + '</tbody></table>',
    false,
    statusChip('preview', L('cache-only', 'cache-only'))
  );
}

function renderImpactAnalysisPanel(wrap){
  var snap = graphicsSnapshot();
  var impact = snap.impact || (graphicsSvc() && graphicsSvc().computeImpact ? graphicsSvc().computeImpact(snap.lastChange || {}, BASE_TEMPLATE_PRESETS) : null) || {};
  var content = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">'
    + infoCard(L('Module bị ảnh hưởng', 'Affected modules'), String((impact.affectedModules || []).length), (impact.affectedModules || []).length ? 'partial' : 'neutral')
    + infoCard(L('Route bị ảnh hưởng', 'Affected routes'), String((impact.affectedRoutes || []).length), 'preview')
    + infoCard(L('Màn hình bị ảnh hưởng', 'Affected screens'), String((impact.affectedScreens || []).length), 'preview')
    + infoCard(L('Nhóm khối bị ảnh hưởng', 'Block families'), String((impact.affectedBlockFamilies || []).length), 'admin')
    + infoCard(L('Template bị ảnh hưởng', 'Affected templates'), String((impact.affectedTemplates || []).length), 'admin')
    + infoCard(L('Mức nghiêm trọng', 'Severity'), impact.severityClass || 'low', (impact.severityClass === 'regulated' || impact.severityClass === 'shopfloor-critical' || impact.severityClass === 'high') ? 'partial' : 'full')
    + infoCard(L('Bán kính ảnh hưởng', 'Blast radius'), String((impact.blastRadius && impact.blastRadius.score) || 0), (impact.blastRadius && impact.blastRadius.score > 60) ? 'partial' : 'full')
    + infoCard(L('Chạm module kiểm soát', 'Regulated touched'), String((impact.regulatedModules || []).length), (impact.regulatedModules || []).length ? 'partial' : 'full')
    + infoCard(L('Chạm shopfloor', 'Shopfloor touched'), String((impact.shopfloorModules || []).length), (impact.shopfloorModules || []).length ? 'partial' : 'full')
    + '</div>'
    + '<div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:10px">'
    + '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)">'
    + '<div style="font-size:11px;font-weight:800;color:var(--text-primary);margin-bottom:8px">'+esc(L('Phạm vi ảnh hưởng', 'Impact scope'))+'</div>'
    + '<div style="font-size:11px;line-height:1.75;color:var(--text-secondary)">'
    + '<strong>'+esc(L('Thay đổi', 'Change'))+':</strong> '+esc((impact.kind || '-') + ' / ' + (impact.target || '-'))+'<br>'
    + '<strong>'+esc(L('Module', 'Modules'))+':</strong> '+joinList(impact.affectedModules)+'<br>'
    + '<strong>'+esc(L('Route', 'Routes'))+':</strong> '+joinList(impact.affectedRoutes)+'<br>'
    + '<strong>'+esc(L('Màn hình', 'Screens'))+':</strong> '+joinList((impact.affectedScreens || []).slice(0, 10), '-')+'<br>'
    + '<strong>'+esc(L('Template', 'Templates'))+':</strong> '+joinList(impact.affectedTemplates)+'<br>'
    + '<strong>'+esc(L('Nhóm khối', 'Block families'))+':</strong> '+joinList(impact.affectedBlockFamilies)
    + '</div></div>'
    + '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)">'
    + '<div style="font-size:11px;font-weight:800;color:var(--text-primary);margin-bottom:8px">'+esc(L('Chặn phát hành', 'Release blockers'))+'</div>'
    + '<div style="font-size:11px;line-height:1.75;color:var(--text-secondary)">'
    + '<strong>'+esc(L('Gates cần rerun', 'Gates to rerun'))+':</strong> '+joinList(impact.gatesToRerun)+'<br>'
    + '<strong>'+esc(L('Bằng chứng', 'Evidence'))+':</strong> '+joinList((impact.requiredEvidence || []).map(function(row){ return row.evidenceType || row; }))+'<br>'
    + '<strong>'+esc(L('Module kiểm soát', 'Regulated modules'))+':</strong> '+joinList(impact.regulatedModules)+'<br>'
    + '<strong>'+esc(L('Module shopfloor', 'Shopfloor modules'))+':</strong> '+joinList(impact.shopfloorModules)+'<br>'
    + '<strong>'+esc(L('Xác nhận', 'Attestation'))+':</strong> '+esc(impact.backendAttested ? L('Máy chủ đã xác nhận', 'Backend attested') : L('Ước tính từ giao diện', 'Frontend estimate'))+'<br>'
    + '<strong>'+esc(L('Tóm tắt', 'Summary'))+':</strong> '+esc(impact.releaseBlockerSummary || '-')
    + '</div></div>'
    + '</div>';
  if(wrap === false) return content;
  return '<div id="adm-graphics-impact-panel">'+content+'</div>';
}

function renderRolloutControls(tpl){
  var id = tpl && (tpl.templateId || tpl.id) || (_selectedTemplate || '');
  var disabled = id ? '' : ' disabled';
  var snap = graphicsSnapshot();
  var stagedRolloutId = id && snap.rolloutsByTemplate ? snap.rolloutsByTemplate[id] : '';
  return sect(
    L('Publish / Apply / Rollback', 'Publish / Apply / Rollback'),
    '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'preview\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Preview only', 'Preview only'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'saveDraft\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Save draft', 'Save draft'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'validate\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Validate', 'Validate'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsRunImpact(\'template-zone\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Run impact analysis', 'Run impact analysis'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'publish\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Publish template', 'Publish template'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'stage\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Stage rollout', 'Stage rollout'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsStageCanary(\''+esc(id)+'\')"'+disabled+'>'+esc(L('Stage canary', 'Stage canary'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'canaryApply\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Apply canary', 'Apply canary'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-primary" onclick="_admGraphicsTemplateAction(\'apply\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Apply globally', 'Apply globally'))+'</button>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsTemplateAction(\'rollback\',\''+esc(id)+'\')"'+disabled+'>'+esc(L('Rollback', 'Rollback'))+'</button>'
      + '</div>'
      + '<div style="font-size:11px;line-height:1.7;color:var(--text-secondary)">'
      + esc(L('Apply globally và rollback chỉ được promote khi backend authority endpoint xác nhận. Nếu endpoint chưa online, UI ghi audit và giữ trạng thái publish blocked.', 'Apply globally and rollback are promoted only when the backend authority endpoint attests them. If the endpoint is offline, the UI records audit and keeps publish blocked.'))
      + '<br><strong>'+esc(L('Staged rollout', 'Staged rollout'))+':</strong> '+esc(stagedRolloutId || L('Chưa stage trong phiên này', 'Not staged in this session'))
      + '</div>',
    true,
    statusChip(tpl && tpl.status === 'published' ? 'full' : 'partial', tpl ? templateStatusLabel(tpl.status) : L('No template selected', 'No template selected'))
  );
}

function renderAuditHistoryPanel(limit){
  var snap = graphicsSnapshot();
  var rows = (snap.audit || []).slice(0, limit || 8).map(function(row){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;white-space:nowrap">'+esc(row.at || '-').replace('T',' ').slice(0, 19)+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.actor || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(row.action || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.subject || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.result || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Audit history', 'Audit history'),
    '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Time</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Actor</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Action</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Subject</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Result</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="5" style="padding:12px;color:var(--text-secondary)">No audit events</td></tr>')+'</tbody></table>',
    false,
    statusChip('preview', L('View audit history', 'View audit history'))
  );
}

function renderComplianceMatrixPanel(){
  var snap = graphicsSnapshot();
  var rows = (snap.compliance || []).map(function(row){
    var ok = row.linkageStatus === 'full-admin-controlled';
    var blocked = row.linkageStatus === 'blocked' || row.linkageStatus === 'legacy-private-css';
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top"><strong>'+esc(row.moduleId)+'</strong><div style="font-size:11px;color:var(--text-secondary)">'+esc(row.route || '-')+'</div></td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top">'+statusChip(ok ? 'full' : (blocked ? 'partial' : 'admin'), row.linkageStatus || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top;font-family:var(--font-mono);font-size:11px">'+esc(String(row.selectorDebt || 0))+' / '+esc(String(row.privateTokenDebt || 0))+' / '+esc(String(row.hardcodedStyleDebt || 0))+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top">'+(row.consumesHmComponents ? statusChip('full','hm-*') : statusChip('partial','no hm-*'))+' '+(row.consumesSharedTokens ? statusChip('full','tokens') : statusChip('partial','no tokens'))+' '+(row.usesPrivateCssShell ? statusChip('partial','private shell') : statusChip('full','no private shell'))+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top;color:var(--text-secondary);line-height:1.55">'+esc(row.reason || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Graphics compliance matrix', 'Graphics compliance matrix'),
    '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Debt columns: selector debt / private token debt / hardcoded style debt.', 'Debt columns: selector debt / private token debt / hardcoded style debt.'))+'</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Module</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Linkage status</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Debt</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Consumers</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Reason</th>'
      + '</tr></thead><tbody>'+rows+'</tbody></table>',
    true,
    statusChip('full', L('Module linkage visible', 'Module linkage visible'))
  );
}

function renderDriftDetectorPanel(){
  var snap = graphicsSnapshot();
  var compliance = snap.compliance || [];
  var drift = snap.drift || {};
  var debt = snap.debt || {};
  var selectorDebt = 0;
  var privateTokenDebt = 0;
  var hardcodedDebt = 0;
  var blocked = 0;
  compliance.forEach(function(row){
    selectorDebt += Number(row.selectorDebt || 0);
    privateTokenDebt += Number(row.privateTokenDebt || 0);
    hardcodedDebt += Number(row.hardcodedStyleDebt || 0);
    if(row.linkageStatus === 'blocked' || row.linkageStatus === 'legacy-private-css') blocked++;
  });
  if(drift.bridgeAliasDebt) selectorDebt = Number(drift.bridgeAliasDebt.debtCount || selectorDebt);
  if(drift.privateCssDebt) hardcodedDebt = Number(drift.privateCssDebt.totalDebtScore || hardcodedDebt);
  if(drift.moduleCompliance) blocked = Number(drift.moduleCompliance.nonCompliantCount || blocked);
  if(debt.summary){
    selectorDebt = Number(debt.summary.bridgeAliasDebtCount || selectorDebt);
    hardcodedDebt = Number(debt.summary.privateCssDebtScore || hardcodedDebt);
  }
  return sect(
    L('Drift detector', 'Drift detector'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Selector debt', 'Selector debt'), String(selectorDebt), selectorDebt ? 'partial' : 'full')
      + infoCard(L('Private token debt', 'Private token debt'), String(privateTokenDebt), privateTokenDebt ? 'partial' : 'full')
      + infoCard(L('Hardcoded style debt', 'Hardcoded style debt'), String(hardcodedDebt), hardcodedDebt ? 'partial' : 'full')
      + infoCard(L('Blocked modules', 'Blocked modules'), String(blocked), blocked ? 'partial' : 'full')
      + '</div>'
      + '<div style="font-size:11px;line-height:1.7;color:var(--text-secondary)">'
      + esc(L('Detector ưu tiên các dấu hiệu vi phạm Standard 36: private visual shell, token riêng, hardcoded style, component không dùng hm-* và module không có reason text.', 'Detector prioritizes Standard 36 violations: private visual shell, private tokens, hardcoded style, non-hm components, and modules without reason text.'))
      + '</div>',
    true,
    statusChip(blocked ? 'partial' : 'full', blocked ? L('Drift found', 'Drift found') : L('No blocked module', 'No blocked module'))
	  );
	}

	function renderReleaseBlockersPanel(limit){
	  var snap = graphicsSnapshot();
	  var blockers = snap.releaseBlockers || [];
	  var releaseBlocked = blockers.some(function(row){
	    return row.releaseBlocked !== false && row.status !== 'waived' && row.waived !== true;
	  });
	  var rows = blockers.slice(0, limit || 10).map(function(row){
	    return '<tr>'
	      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(row.blockerId || row.id || row.kind || row.type || '-')+'</td>'
	      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+statusChip(row.waived || row.status === 'waived' ? 'preview' : 'partial', row.status || row.severity || 'active')+'</td>'
	      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.moduleId || row.templateId || row.targetId || row.subjectId || '-')+'</td>'
	      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary);line-height:1.55">'+esc(row.reason || row.message || row.summary || '-')+'</td>'
	      + '</tr>';
	  }).join('');
	  return sect(
	    L('Release blockers', 'Release blockers'),
	    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">'
	      + infoCard(L('Active blockers', 'Active blockers'), String(blockers.length), blockers.length ? 'partial' : 'full')
	      + infoCard(L('Release status', 'Release status'), releaseBlocked ? L('Blocked', 'Blocked') : L('Open', 'Open'), releaseBlocked ? 'partial' : 'full')
	      + infoCard(L('Backend authority', 'Backend authority'), snap.backendAvailable ? L('Online', 'Online') : L('Fallback only', 'Fallback only'), snap.backendAvailable ? 'full' : 'partial')
	      + '</div>'
	      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
	      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Blocker</th>'
	      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">State</th>'
	      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Scope</th>'
	      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Reason</th>'
	      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="4" style="padding:12px;color:var(--text-secondary)">No active release blockers in current snapshot</td></tr>')+'</tbody></table>',
	    true,
	    statusChip(releaseBlocked ? 'partial' : 'full', releaseBlocked ? L('Release blocked', 'Release blocked') : L('No blocker', 'No blocker'))
	  );
	}

	function renderRuntimeGraphicsDiagnosticsPanel(){
	  var snap = graphicsSnapshot();
	  var dx = snap.runtimeDiagnostics || {};
	  return sect(
	    L('Runtime graphics diagnostics', 'Runtime graphics diagnostics'),
	    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px">'
	      + infoCard(L('Linkage status', 'Linkage status'), dx.linkageStatus || 'not checked', dx.linkageStatus === 'full-admin-controlled' ? 'full' : (dx.linkageStatus === 'blocked' ? 'partial' : 'admin'))
	      + infoCard(L('Shared token probe', 'Shared token probe'), String(dx.sharedTokenProbeCount || 0), (dx.sharedTokenProbeCount || 0) >= 3 ? 'full' : 'partial')
	      + infoCard(L('hm-* consumers', 'hm-* consumers'), String(dx.hmComponentConsumerCount || 0), (dx.hmComponentConsumerCount || 0) ? 'full' : 'partial')
	      + infoCard(L('Private shell selectors', 'Private shell selectors'), String(dx.privateShellSelectorCount || 0), (dx.privateShellSelectorCount || 0) ? 'partial' : 'full')
	      + infoCard(L('Inline style count', 'Inline style count'), String(dx.inlineStyleCount || 0), (dx.inlineStyleCount || 0) ? 'admin' : 'full')
	      + '</div>'
	      + '<div style="margin-top:10px;font-size:11px;line-height:1.7;color:var(--text-secondary)">'
	      + esc(L('Diagnostics chứng minh runtime shell đang đọc shared tokens/hm-* contracts. Legacy private CSS vẫn được ghi nhận là debt và có thể tạo release blocker.', 'Diagnostics prove whether the runtime shell consumes shared tokens and hm-* contracts. Legacy private CSS remains recorded as debt and may produce release blockers.'))
	      + '</div>',
	    true,
	    statusChip(dx.releaseBlocker ? 'partial' : 'full', dx.releaseBlocker ? L('Runtime blocker', 'Runtime blocker') : L('Runtime linked', 'Runtime linked'))
	  );
	}

function renderChangeSetPanel(){
  var snap = graphicsSnapshot();
  var cs = snap.changeSet || {};
  var impact = cs.impact || snap.impact || {};
  var scopes = cs.rolloutScopePlan || impact.rolloutScopes || [];
  var scopeRows = scopes.map(function(scope){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(scope.mode || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+statusChip(scope.allowed ? 'full' : 'partial', scope.allowed ? 'allowed' : 'blocked')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary);line-height:1.55">'+esc(scope.releaseCondition || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Graphics change set', 'Graphics change set'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Change set', 'Change set'), cs.changeSetId || '-', cs.source === 'backend-attested' || cs.source === 'backend_graphics_governance_state' ? 'full' : 'preview')
      + infoCard(L('Status', 'Status'), cs.status || 'preview-only', cs.status === 'impact-recorded' ? 'full' : 'preview')
      + infoCard(L('Severity', 'Severity'), (cs.risk && cs.risk.severityClass) || impact.severityClass || 'low', ((cs.risk && cs.risk.severityClass) || impact.severityClass) === 'low' ? 'full' : 'partial')
      + infoCard(L('Evidence items', 'Evidence items'), String((cs.evidenceChecklist || impact.requiredEvidence || []).length), 'admin')
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Rollout scope</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Allowed</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Release condition</th>'
      + '</tr></thead><tbody>'+(scopeRows || '<tr><td colspan="3" style="padding:12px;color:var(--text-secondary)">No rollout scope plan</td></tr>')+'</tbody></table>',
    true,
    statusChip('admin', L('Diff + impact + rollout scope', 'Diff + impact + rollout scope'))
  );
}

function renderLineageGraphPanel(){
  var snap = graphicsSnapshot();
  var graph = snap.lineageGraph || {};
  var nodes = graph.nodes || [];
  var edges = graph.edges || [];
  var rows = edges.slice(0, 12).map(function(edge){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.from || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.relation || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.to || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Module graphics lineage graph', 'Module graphics lineage graph'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Nodes', 'Nodes'), String(nodes.length || (graph.summary && graph.summary.nodeCount) || 0), 'full')
      + infoCard(L('Edges', 'Edges'), String(edges.length || (graph.summary && graph.summary.edgeCount) || 0), 'full')
      + infoCard(L('Templates', 'Templates'), String((graph.summary && graph.summary.templateCount) || 0), 'admin')
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">From</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Relation</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">To</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-secondary)">No lineage edges</td></tr>')+'</tbody></table>',
    true,
    statusChip('full', 'Admin -> backend -> tokens -> components -> module')
  );
}

function renderRuntimeBeaconPanel(){
  var snap = graphicsSnapshot();
  var beacon = snap.runtimeBeacon || {};
  var rows = (beacon.beacons || []).slice(0, 12).map(function(row){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)"><strong>'+esc(row.moduleId || '-')+'</strong><div style="font-size:11px;color:var(--text-secondary)">'+esc(row.route || '-')+'</div></td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+statusChip(row.linkageStatus === 'full-admin-controlled' ? 'full' : 'partial', row.linkageStatus || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+(row.sharedTokenProbe ? statusChip('full','tokens') : statusChip('partial','no tokens'))+' '+(row.hmComponentProbe ? statusChip('full','hm-*') : statusChip('partial','no hm-*'))+' '+(row.privateCssProbe ? statusChip('partial','private css') : statusChip('full','no private css'))+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.beaconStatus || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Runtime graphics compliance beacon', 'Runtime graphics compliance beacon'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Reported modules', 'Reported modules'), String((beacon.summary && beacon.summary.reportedModules) || (beacon.beacons || []).length || 0), 'full')
      + infoCard(L('Blocking modules', 'Blocking modules'), String((beacon.summary && beacon.summary.releaseBlockingModules) || 0), (beacon.summary && beacon.summary.releaseBlockingModules) ? 'partial' : 'full')
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Module</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Linkage</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Runtime probes</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Beacon</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="4" style="padding:12px;color:var(--text-secondary)">No runtime beacon rows</td></tr>')+'</tbody></table>',
    true,
    statusChip('admin', L('Runtime proof', 'Runtime proof'))
  );
}

function renderDebtObservatoryPanel(){
  var snap = graphicsSnapshot();
  var obs = snap.debtObservatory || {};
  var rows = (obs.byModule || []).slice(0, 12).map(function(row){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)"><strong>'+esc(row.moduleId || '-')+'</strong><div style="font-size:11px;color:var(--text-secondary)">'+esc(row.route || '-')+'</div></td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.domain || 'unclassified')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.ownerTeam || 'Frontend Platform')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(String(row.bridgeAliasDebt || 0))+' / '+esc(String(row.privateCssDebt || 0))+' / '+esc(String(row.hardcodedStyleDebt || 0))+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(String(row.debtScore || 0))+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Visual debt observatory', 'Visual debt observatory'),
    '<div style="font-size:11px;color:var(--text-secondary);margin-bottom:8px">'+esc(L('Debt columns: bridge alias / private CSS / hardcoded style. Observatory groups debt by module, domain, team, and route when backend provides those dimensions.', 'Debt columns: bridge alias / private CSS / hardcoded style. Observatory groups debt by module, domain, team, and route when backend provides those dimensions.'))+'</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Module</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Domain</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Team</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Debt</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Score</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="5" style="padding:12px;color:var(--text-secondary)">No visual debt rows</td></tr>')+'</tbody></table>',
    true,
    statusChip((obs.summary && obs.summary.moduleDebtCount) ? 'partial' : 'full', L('Debt observable', 'Debt observable'))
  );
}

function renderPolicyPacksPanel(){
  var snap = graphicsSnapshot();
  var packs = (snap.environmentPolicyPacks && snap.environmentPolicyPacks.packs) || [];
  var multiSite = (snap.environmentPolicyPacks && snap.environmentPolicyPacks.multiSitePlantBranding) || {};
  var rows = packs.map(function(pack){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(pack.environment || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary)">'+esc(JSON.stringify(pack.tokenOverrides || {}))+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary)">'+joinList(pack.componentPolicy || [])+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);color:var(--text-secondary)">'+joinList(pack.evidenceObligations || [])+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)"><button type="button" class="hm-btn hm-btn-sm hm-btn-secondary" onclick="_admGraphicsRunPolicyPackImpact(\''+esc(pack.environment || '')+'\')">'+esc(L('Analyze', 'Analyze'))+'</button></td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Environment policy packs', 'Environment policy packs'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Policy packs', 'Policy packs'), String(packs.length), 'admin')
      + infoCard(L('Branding levels', 'Branding levels'), joinList(multiSite.levels || [], '-'), 'preview')
      + infoCard(L('Prohibited overrides', 'Prohibited overrides'), joinList(multiSite.prohibitedOverrideTypes || [], '-'), 'partial')
      + '</div>'
      + '<div style="font-size:11px;color:var(--text-secondary);line-height:1.7;margin-bottom:10px">'+esc(multiSite.releaseRule || L('Multi-site branding may vary identity tokens only; semantic status and component contracts stay controlled by shared authority.', 'Multi-site branding may vary identity tokens only; semantic status and component contracts stay controlled by shared authority.'))+'</div>'
      +
    '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Environment</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Token policy</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Component policy</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Evidence obligations</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Impact</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="5" style="padding:12px;color:var(--text-secondary)">No policy packs</td></tr>')+'</tbody></table>',
    false,
    statusChip('admin', L('Environment scoped rollout', 'Environment scoped rollout'))
  );
}

function renderReleaseDashboardPanel(){
  var snap = graphicsSnapshot();
  var dash = snap.releaseDashboard || {};
  var summary = dash.complianceSummary || {};
  var debt = dash.debtSummary || {};
  var trend = dash.trendDashboard || {};
  var override = dash.emergencyOverridePath || {};
  return sect(
    L('Graphics release dashboard', 'Graphics release dashboard'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Readiness', 'Readiness'), dash.readiness || 'unknown', dash.readiness === 'ready' ? 'full' : 'partial')
      + infoCard(L('Blocked modules', 'Blocked modules'), String(summary.blockedCount || summary.nonCompliantCount || 0), (summary.blockedCount || summary.nonCompliantCount) ? 'partial' : 'full')
      + infoCard(L('Legacy shell debt', 'Legacy shell debt'), String(debt.uncontrolledLegacyShellDebt || 0), debt.uncontrolledLegacyShellDebt ? 'partial' : 'full')
      + infoCard(L('Rollouts', 'Rollouts'), String((dash.rolloutSummary && dash.rolloutSummary.rolloutCount) || 0), 'admin')
      + infoCard(L('Debt trend score', 'Debt trend score'), String(trend.currentDebtScore || 0), trend.currentDebtScore ? 'partial' : 'full')
      + infoCard(L('Emergency override', 'Emergency override'), override.status || 'exception-only', 'partial')
      + '</div>'
      + '<div style="font-size:11px;line-height:1.7;color:var(--text-secondary)">'
      + esc(L('Release dashboard buộc release manifest/evidence bundle phải chứa graphics authority refs, compliance snapshot, impact report ref, waiver refs và rollback plan ref.', 'Release dashboard requires release manifest/evidence bundle to carry graphics authority refs, compliance snapshot, impact report ref, waiver refs, and rollback plan ref.'))
      + '<br><strong>'+esc(L('Trend', 'Trend'))+':</strong> '+esc(trend.releaseReadinessTrend || '-')+'; <strong>'+esc(L('Override rule', 'Override rule'))+':</strong> '+esc(override.releaseCondition || L('Approved waiver, expiry, rollback plan and retrospective required.', 'Approved waiver, expiry, rollback plan and retrospective required.'))
      + '</div>',
    true,
    statusChip(dash.readiness === 'ready' ? 'full' : 'partial', dash.readiness || 'pending')
  );
}

function renderReleaseLinkagePanel(){
  var snap = graphicsSnapshot();
  var link = snap.releaseLink || {};
  var refs = link.graphicsAuthorityRefs || [];
  var evidence = link.evidenceBundleRequirements || [];
  return sect(
    L('Release evidence linkage', 'Release evidence linkage'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard(L('Registry version', 'Registry version'), link.templateRegistryVersion || snap.registryVersion || '-', 'admin')
      + infoCard(L('Registry checksum', 'Registry checksum'), link.templateRegistryChecksum || snap.registryEtag || '-', 'preview')
      + infoCard(L('Release blocked', 'Release blocked'), link.releaseBlocked ? L('Yes', 'Yes') : L('No', 'No'), link.releaseBlocked ? 'partial' : 'full')
      + infoCard(L('Blocker count', 'Blocker count'), String(link.blockerCount || 0), link.blockerCount ? 'partial' : 'full')
      + '</div>'
      + '<div style="display:grid;grid-template-columns:minmax(220px,1fr) minmax(220px,1fr);gap:10px">'
      + '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)"><div style="font-size:11px;font-weight:800;margin-bottom:8px">'+esc(L('Authority refs', 'Authority refs'))+'</div><div style="font-size:11px;line-height:1.75;color:var(--text-secondary)">'+joinList(refs, '-')+'</div></div>'
      + '<div style="padding:12px;border:1px solid var(--border);border-radius:8px;background:var(--bg-surface)"><div style="font-size:11px;font-weight:800;margin-bottom:8px">'+esc(L('Evidence bundle', 'Evidence bundle'))+'</div><div style="font-size:11px;line-height:1.75;color:var(--text-secondary)">'+joinList(evidence, '-')+'</div></div>'
      + '</div>',
    false,
    statusChip(link.releaseBlocked ? 'partial' : 'full', L('Release manifest refs', 'Release manifest refs'))
  );
}

function renderWaiverGovernancePanel(){
  var snap = graphicsSnapshot();
  var waiverRows = (snap.waivers || []).slice(0, 5).map(function(row){
    var waiverId = String(row.waiverId || row.id || '');
    var canApprove = waiverId && String(row.status || '') !== 'approved' && String(row.status || '') !== 'expired';
    var canExpire = waiverId && String(row.status || '') !== 'expired';
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(waiverId || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.subjectId || row.targetId || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(row.status || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);white-space:nowrap">'
      + '<button type="button" class="hm-btn hm-btn-sm hm-btn-secondary" onclick="_admGraphicsWaiverAction(\'approve\',\''+esc(waiverId)+'\')"'+(canApprove?'':' disabled')+'>'+esc(L('Approve', 'Approve'))+'</button> '
      + '<button type="button" class="hm-btn hm-btn-sm hm-btn-secondary" onclick="_admGraphicsWaiverAction(\'expire\',\''+esc(waiverId)+'\')"'+(canExpire?'':' disabled')+'>'+esc(L('Expire', 'Expire'))+'</button>'
      + '</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Waiver / exception governance', 'Waiver / exception governance'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(210px,1fr));gap:10px;margin-bottom:12px">'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">'+esc(L('Subject', 'Subject'))+'<input class="hm-input" value="'+esc(_waiverSubject || (_selectedTemplate || ''))+'" oninput="_admGraphicsSetWaiver(\'subject\',this.value)" placeholder="templateId / moduleId / selector"></label>'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">'+esc(L('Reason text', 'Reason text'))+'<input class="hm-input" value="'+esc(_waiverReason)+'" oninput="_admGraphicsSetWaiver(\'reason\',this.value)" placeholder="'+esc(L('Lý do ngoại lệ, thời hạn, owner', 'Exception reason, expiry, owner'))+'"></label>'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">'+esc(L('Owner', 'Owner'))+'<input class="hm-input" value="'+esc(_waiverOwner)+'" oninput="_admGraphicsSetWaiver(\'owner\',this.value)" placeholder="Admin Appearance"></label>'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">'+esc(L('Approver', 'Approver'))+'<input class="hm-input" value="'+esc(_waiverApprover)+'" oninput="_admGraphicsSetWaiver(\'approver\',this.value)" placeholder="QA Governance"></label>'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">Risk class<select class="hm-input" onchange="_admGraphicsSetWaiver(\'riskClass\',this.value)"><option value="high"'+(_waiverRiskClass==='high'?' selected':'')+'>high</option><option value="regulated"'+(_waiverRiskClass==='regulated'?' selected':'')+'>regulated</option><option value="shopfloor-critical"'+(_waiverRiskClass==='shopfloor-critical'?' selected':'')+'>shopfloor-critical</option></select></label>'
      + '<label style="display:grid;gap:6px;font-size:11px;color:var(--text-secondary)">Expires at<input class="hm-input" type="date" value="'+esc(_waiverExpiresAt)+'" oninput="_admGraphicsSetWaiver(\'expiresAt\',this.value)"></label>'
      + '</div>'
      + '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admGraphicsRequestWaiver()">'+esc(L('Request waiver', 'Request waiver'))+'</button>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px;margin-top:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Waiver</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Subject</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Status</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Lifecycle</th>'
      + '</tr></thead><tbody>'+(waiverRows || '<tr><td colspan="4" style="padding:12px;color:var(--text-secondary)">No waiver requests in current snapshot</td></tr>')+'</tbody></table>',
    false,
    statusChip('preview', L('Exception path', 'Exception path'))
  );
}

function renderApiContractPanel(){
  var snap = graphicsSnapshot();
  var statuses = snap.endpointStatus || {};
  var endpointKeys = Object.keys(snap.endpoints || {});
  var pendingCount = endpointKeys.filter(function(key){ return !statuses[key] || statuses[key] === 'pending backend'; }).length;
  var apiChip = snap.backendAvailable && pendingCount === 0
    ? statusChip('full', 'backend-ready')
    : statusChip('partial', pendingCount ? ('contract catalog: ' + pendingCount + ' pending') : 'backend fallback');
  var rows = Object.keys(snap.endpoints || {}).map(function(key){
    var ep = snap.endpoints[key];
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(key)+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(ep.method)+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">api.php?action='+esc(ep.action)+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc((snap.endpointStatus || {})[key] || 'pending backend')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('API client contract expected by frontend', 'API client contract expected by frontend'),
    '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Client method</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">HTTP</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Endpoint</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Runtime status</th>'
      + '</tr></thead><tbody>'+rows+'</tbody></table>',
    false,
    apiChip
  );
}

function densityChipStyle(density){
  if(density === 'dense') return 'background:color-mix(in srgb,var(--amber,#f57f17) 12%,transparent);color:color-mix(in srgb,var(--amber,#f57f17) 70%,#000 30%);border:1px solid color-mix(in srgb,var(--amber,#f57f17) 18%,transparent)';
  if(density === 'comfortable') return 'background:color-mix(in srgb,var(--green,#16a34a) 12%,transparent);color:var(--green,#15803d);border:1px solid color-mix(in srgb,var(--green,#16a34a) 18%,transparent)';
  return 'background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,transparent);color:var(--brand-2,#1565c0);border:1px solid color-mix(in srgb,var(--brand-2,#1565c0) 18%,transparent)';
}

function renderTemplateSvg(tpl){
  var zones = tpl.zones || [];
  var has = function(z){ return zones.indexOf(z) >= 0; };
  var s = '<svg viewBox="0 0 200 118" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">';
  s += '<rect x="0" y="0" width="200" height="118" rx="4" fill="#f8fbff"/>';
  if(has('header')) s += '<rect x="4" y="4" width="192" height="14" rx="3" fill="rgba(21,101,192,.10)"/>';
  if(has('kpi-bar')) s += '<rect x="4" y="22" width="45" height="16" rx="2" fill="rgba(249,168,37,.14)"/><rect x="52" y="22" width="45" height="16" rx="2" fill="rgba(249,168,37,.14)"/><rect x="100" y="22" width="45" height="16" rx="2" fill="rgba(249,168,37,.14)"/><rect x="148" y="22" width="48" height="16" rx="2" fill="rgba(249,168,37,.14)"/>';
  if(has('tabs')) s += '<rect x="4" y="22" width="192" height="12" rx="2" fill="rgba(8,145,178,.08)"/>';
  if(has('filter')) s += '<rect x="4" y="40" width="192" height="10" rx="2" fill="rgba(8,145,178,.08)"/>';
  if(has('sidebar')){
    s += '<rect x="4" y="54" width="128" height="50" rx="3" fill="rgba(22,163,74,.07)"/>';
    s += '<rect x="136" y="54" width="60" height="50" rx="3" fill="rgba(124,58,237,.07)"/>';
  } else {
    s += '<rect x="4" y="54" width="192" height="50" rx="3" fill="rgba(22,163,74,.07)"/>';
  }
  if(has('chart-area')) s += '<rect x="12" y="62" width="176" height="8" rx="2" fill="rgba(37,99,235,.11)"/><rect x="12" y="76" width="140" height="8" rx="2" fill="rgba(37,99,235,.11)"/>';
  if(has('footer')) s += '<rect x="4" y="108" width="192" height="8" rx="2" fill="rgba(100,116,139,.08)"/>';
  s += '</svg>';
  return s;
}

function renderZoneMiniDiagram(tpl){
  var zones = tpl.zones || [];
  var cols = tpl.zoneLayout && tpl.zoneLayout.gridCols ? tpl.zoneLayout.gridCols : '1fr';
  var rows = tpl.zoneLayout && tpl.zoneLayout.gridRows ? tpl.zoneLayout.gridRows : 'auto 1fr auto';
  function zoneClass(z){
    var map = {
      header:'zone-header',
      'kpi-bar':'zone-kpi',
      tabs:'zone-tabs',
      filter:'zone-filter',
      main:'zone-main',
      sidebar:'zone-sidebar',
      'chart-area':'zone-chart',
      footer:'zone-footer'
    };
    return map[z] || '';
  }
  var html = '<div class="zone-config-grid" style="grid-template-columns:'+cols+';grid-template-rows:'+rows+'">';
  zones.forEach(function(z){
    var spanAll = (z === 'header' || z === 'kpi-bar' || z === 'tabs' || z === 'filter' || z === 'footer') ? 'grid-column:1/-1;' : '';
    html += '<div class="zone-config-cell '+zoneClass(z)+'" style="'+spanAll+'min-height:'+(z === 'main' || z === 'sidebar' ? '72px' : '32px')+'">'+esc(z.toUpperCase())+'</div>';
  });
  html += '</div>';
  return html;
}

window._admTplSetState = function(key, value){
  if(key === 'search') _templateSearch = value || '';
  if(key === 'category') _templateCategory = value || 'all';
  if(key === 'sort') _templateSort = value || 'name';
  if(key === 'view') _templateView = value || 'gallery';
  if(key === 'theme') _templateThemePreview = value || 'professional-light';
  if(key === 'template') _selectedTemplate = value || null;
  renderAdminAppearance();
};

window._admTplPick = function(id){
  _selectedTemplate = id;
  _templateView = 'detail';
  _subTab = 'templates';
  renderAdminAppearance();
};

window._admTplEdit = function(id){
  _selectedTemplate = id;
  _templateView = 'editor';
  _subTab = 'templates';
  renderAdminAppearance();
};

window._admTplBack = function(){
  _templateView = 'gallery';
  renderAdminAppearance();
};

window._admTplCreate = function(){
  var base = getTemplateById('T122') || getAllTemplates()[0];
  var clone = cloneTemplateData(base);
  clone.id = 'C' + String(Date.now()).slice(-6);
  clone.name.vi = clone.name.vi + ' (Bản sao)';
  clone.name.en = clone.name.en + ' Copy';
  clone.modules = [];
  clone.source = 'custom';
  clone.status = 'draft-only';
  clone.controlMode = 'draft-cache';
  clone.owner = 'HESEM Platform Architecture';
  clone.version = '0.1.0';
	  cacheUnsavedTemplateDraftRecord(clone);
	  _selectedTemplate = clone.id;
	  _templateView = 'editor';
	  announceGraphics(L('Template draft-only mới đã tạo trong local draft cache; backend authority chưa đổi.', 'New draft-only template created in local draft cache; backend authority unchanged.'));
	  if(typeof showToast === 'function') showToast(L('Đã tạo template mới','Template created'), 'success');
	  renderAdminAppearance();
	};

window._admTplClone = function(id){
  var tpl = getTemplateById(id);
  if(!tpl) return;
  var clone = cloneTemplateData(tpl);
  clone.id = 'C' + String(Date.now()).slice(-6);
  clone.name.vi = clone.name.vi + ' (Bản sao)';
  clone.name.en = clone.name.en + ' Copy';
  clone.modules = [];
  clone.source = 'custom';
  clone.status = 'draft-only';
  clone.controlMode = 'draft-cache';
  clone.owner = tpl.owner || 'HESEM Platform Architecture';
  clone.version = '0.1.0';
	  cacheUnsavedTemplateDraftRecord(clone);
	  _selectedTemplate = clone.id;
	  _templateView = 'detail';
	  announceGraphics(L('Template đã clone vào draft cache; cần save draft backend để thành controlled draft.', 'Template cloned into draft cache; backend save draft is required for controlled draft.'));
	  if(typeof showToast === 'function') showToast(L('Đã nhân bản template','Template cloned'), 'success');
	  renderAdminAppearance();
	};

window._admTplDelete = function(id){
	  if(!id) return;
	  deleteUnsavedTemplateDraftRecord(id);
	  if(_selectedTemplate === id){ _selectedTemplate = null; _templateView = 'gallery'; }
	  announceGraphics(L('Đã xóa template draft cache; controlled registry không đổi.', 'Template draft cache removed; controlled registry unchanged.'));
	  if(typeof showToast === 'function') showToast(L('Đã xóa draft cache của template','Template draft cache removed'), 'success');
	  renderAdminAppearance();
	};

window._admTplSaveField = function(id, field, value){
  var tpl = cloneTemplateData(getTemplateById(id));
  if(!tpl) return;
  if(field === 'name.vi') tpl.name.vi = value;
  if(field === 'name.en') tpl.name.en = value;
  if(field === 'desc.vi') tpl.desc.vi = value;
  if(field === 'version') tpl.version = value;
  if(field === 'owner') tpl.owner = value;
  if(field === 'regulatedCompatibility') tpl.regulatedCompatibility = value;
  if(field === 'shopfloorCompatibility') tpl.shopfloorCompatibility = value;
  if(field === 'themePreset') tpl.themePreset = value;
  cacheUnsavedTemplateDraftRecord(tpl);
  window._admGraphicsMarkChange(/Compatibility|version|owner/.test(field) ? 'template-contract' : 'template-zone', id, field);
};

window._admTplSaveZone = function(id, index, key, value){
  var tpl = cloneTemplateData(getTemplateById(id));
  if(!tpl || !tpl.zoneSettings || !tpl.zoneSettings[index]) return;
  tpl.zoneSettings[index][key] = value;
  if(key === 'allowed'){
    tpl.allowedBlocks = tpl.allowedBlocks || {};
    tpl.allowedBlocks[tpl.zoneSettings[index].name] = value;
  }
  cacheUnsavedTemplateDraftRecord(tpl);
  window._admGraphicsMarkChange(key === 'allowed' ? 'template-allowed-blocks' : 'template-zone', id, tpl.zoneSettings[index].name + '.' + key);
};

window._admTplApplyTheme = function(themeId){
  if(!window.HmTheme) return;
  var cap = themeRuntimeCapability(themeId);
  if(!cap.supported){
    announceGraphics(cap.reason);
    if(typeof showToast === 'function') showToast(cap.reason, 'error');
    return;
  }
  _templateThemePreview = themeId;
  var applied = false;
  if(typeof HmTheme.applyVisualTheme === 'function'){
    applied = HmTheme.applyVisualTheme(themeId) === true;
  }
	  if(!applied){
	    announceGraphics(L('Theme preview runtime is stale; full preset was not applied.', 'Theme preview runtime is stale; full preset was not applied.'));
	    if(typeof showToast === 'function') showToast(L('Theme preview runtime is stale; full preset was not applied.', 'Theme preview runtime is stale; full preset was not applied.'), 'warning');
	    return;
	  }
	  announceGraphics(L('Preset giao diện đã áp dụng trong preview; impact analysis được ghi nhận.', 'Visual theme preset applied in preview; impact analysis recorded.'));
	  if(typeof showToast === 'function') showToast(L('Đã áp dụng preset giao diện','Visual theme applied'), 'success');
	  window._admGraphicsMarkChange('theme-preset', themeId, themeId);
	  renderAdminAppearance();
	};

	window._admExportTheme = function(){
	  var j = HmTheme.getAdminConfigDraft ? JSON.stringify(HmTheme.getAdminConfigDraft(), null, 2) : HmTheme.exportTheme();
	  var b = new Blob([j], { type:'application/json' });
	  var a = document.createElement('a');
	  a.href = URL.createObjectURL(b);
	  a.download = 'hesem-theme.json';
	  a.click();
	  announceGraphics(L('Đã export admin draft theme JSON; unsaved preview edits đi kèm như draft, không phải production authority.', 'Admin draft theme JSON exported; unsaved preview edits are included as draft, not production authority.'));
	};

	window._admImportTheme = function(){
	  var i = document.createElement('input');
	  i.type = 'file';
	  i.accept = '.json';
	  i.onchange = function(){
	    var r = new FileReader();
	    r.onload = function(){
	      if(HmTheme.importTheme(r.result)){
	        announceGraphics(L('Theme đã import vào preview/user preference; cần save backend để thành admin config.', 'Theme imported into preview/user preference; backend save is required for admin config authority.'));
	        renderAdminAppearance();
	        if(typeof showToast === 'function') showToast('Theme imported', 'success');
	      } else {
	        announceGraphics(L('Theme JSON import thất bại.', 'Theme JSON import failed.'));
	      }
	    };
	    r.readAsText(i.files[0]);
	  };
	  i.click();
	};

	window._admExportDraftCache = function(){
	  var j = JSON.stringify(readDraftCache(), null, 2);
	  var b = new Blob([j], { type:'application/json' });
	  var a = document.createElement('a');
	  a.href = URL.createObjectURL(b);
	  a.download = 'hesem-template-draft-cache.json';
	  a.click();
	  announceGraphics(L('Đã export template draft cache; backend authority không đổi.', 'Template draft cache exported; backend authority unchanged.'));
	};

	window._admImportDraftCache = function(){
	  var i = document.createElement('input');
	  i.type = 'file';
	  i.accept = '.json';
	  i.onchange = function(){
	    var r = new FileReader();
	    r.onload = function(){
	      try {
	        writeDraftCache(JSON.parse(r.result || '{}'));
	        announceGraphics(L('Đã nhập draft cache; backend authority không đổi.', 'Draft cache imported; backend authority unchanged.'));
	        renderAdminAppearance();
	        if(typeof showToast === 'function') showToast(L('Đã nhập draft cache; chưa thay authority','Draft cache imported; authority unchanged'), 'success');
	      } catch(e) {
	        announceGraphics(L('JSON draft cache không hợp lệ.', 'Draft cache JSON is invalid.'));
	        if(typeof showToast === 'function') showToast(L('JSON không hợp lệ','Invalid JSON'), 'error');
	      }
	    };
	    r.readAsText(i.files[0]);
	  };
	  i.click();
	};

function renderTemplateCard(tpl){
  var modulesUsing = getGovernedModulesForTemplate(tpl);
  return '<div class="tpl-gallery-card"'
    +' role="button" tabindex="0" aria-label="'+esc((tpl.templateId || tpl.id) + ' ' + templateDisplayName(tpl))+'"'
    +' onclick="_admTplPick(\''+tpl.id+'\')"'
    +' onkeydown="if(event.key===\'Enter\'||event.key===\' \'){event.preventDefault();_admTplPick(\''+tpl.id+'\')}"'
    +' onmouseover="this.style.borderColor=\'var(--brand-2)\';this.style.transform=\'translateY(-2px)\';this.style.boxShadow=\'var(--shadow-lg)\'"'
    +' onmouseout="this.style.borderColor=\'var(--border)\';this.style.transform=\'\';this.style.boxShadow=\'\'">'
    + '<div class="tpl-gallery-thumb">'+renderTemplateSvg(tpl)+'</div>'
    + '<div class="tpl-gallery-info">'
    +   '<div class="tpl-gallery-name">'+esc((tpl.templateId || tpl.id)+' '+templateDisplayName(tpl))+'</div>'
    +   '<div class="tpl-gallery-desc">'+esc((tpl.name && tpl.name.en) || '')+'</div>'
    +   '<div class="tpl-gallery-desc" style="margin-top:4px;color:var(--text-tertiary)">'+esc(tpl.desc.vi)+'</div>'
    +   '<div class="tpl-gallery-chips">'
	      +     templateStatusChip(tpl)
	      +     templateControlBadge(tpl)
	      +     statusChip(templatePublishEligibility(tpl) === 'eligible' ? 'full' : (templatePublishEligibility(tpl) === 'blocked' ? 'partial' : 'preview'), templatePublishEligibility(tpl))
	      +     '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,transparent);color:var(--brand-2,#1565c0);border:1px solid color-mix(in srgb,var(--brand-2,#1565c0) 18%,transparent);font-size:10px;font-weight:700">'+esc(String(tpl.zoneCount))+' zones</span>'
	      +     '<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700;'+densityChipStyle(tpl.density)+'">'+esc(tpl.density)+'</span>'
	      +   '</div>'
    +   '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;margin-top:8px">'
	      +     smallMeta('version', tpl.version || '1.0.0')
	      +     smallMeta('owner', tpl.owner || '-')
	      +     smallMeta('modules', modulesUsing.length)
	      +     smallMeta('authority', tpl.sourceAuthority || tpl.controlMode || '-')
	      +     smallMeta('regulated', templateCompatibility(tpl, 'regulatedCompatibility'))
	      +     smallMeta('shopfloor', templateCompatibility(tpl, 'shopfloorCompatibility'))
	      +   '</div>'
    + '</div>'
    + '</div>';
}

function renderTemplateGallery(){
  var templates = getTemplates();
  var h = sect(L('Template governance state machine', 'Template governance state machine'), templateStateMachine(), false, statusChip('admin', 'Standard 36'));
  h += renderRolloutControls(_selectedTemplate ? getTemplateById(_selectedTemplate) : null);
  h += renderControlledRegistrySummary();
  h += renderLocalTemplateCachePanel();
  h += '<div style="display:flex;gap:8px;align-items:center;margin-bottom:12px;position:sticky;top:0;z-index:10;background:var(--bg-surface);padding:8px 0">';
  h += '<input type="text" placeholder="'+esc(T('templateSearchHint'))+'" value="'+esc(_templateSearch)+'" oninput="_admTplSetState(\'search\',this.value)" style="flex:1;height:36px;padding:0 12px;border:1px solid var(--border);border-radius:8px;font-size:13px;background:var(--bg-surface)">';
  h += '<select onchange="_admTplSetState(\'category\',this.value)" style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-surface)">';
  h += '<option value="all">'+esc(T('allCategories'))+'</option>';
  TEMPLATE_CATEGORIES.forEach(function(cat){
    h += '<option value="'+cat.key+'" '+(_templateCategory === cat.key ? 'selected' : '')+'>'+esc(cat.label[lang === 'en' ? 'en' : 'vi'])+'</option>';
  });
  h += '</select>';
  h += '<select onchange="_admTplSetState(\'sort\',this.value)" style="height:36px;padding:0 10px;border:1px solid var(--border);border-radius:8px;font-size:12px;background:var(--bg-surface)">';
  h += '<option value="name" '+(_templateSort === 'name' ? 'selected' : '')+'>'+esc(T('sortByName'))+'</option>';
  h += '<option value="zones" '+(_templateSort === 'zones' ? 'selected' : '')+'>'+esc(T('sortByZones'))+'</option>';
  h += '<option value="category" '+(_templateSort === 'category' ? 'selected' : '')+'>'+esc(T('sortByCategory'))+'</option>';
  h += '</select>';
  h += '<button type="button" class="hm-btn hm-btn-secondary" onclick="_admTplCreate()">'+T('createTemplate')+'</button>';
  h += '</div>';
  if(!templates.length){
    h += '<div class="hm-empty">'+esc(T('noTemplatesFound'))+'</div>';
    return h;
  }
  h += '<div class="tpl-gallery-grid" role="list" aria-label="'+esc(L('Controlled template registry', 'Controlled template registry'))+'">';
  templates.forEach(function(tpl){ h += renderTemplateCard(tpl); });
  h += '</div>';
  return h;
}

function renderTemplateLineagePanel(tpl){
  var snap = graphicsSnapshot();
  var graph = snap.lineageGraph || {};
  var templateId = tpl && (tpl.templateId || tpl.id) || '';
  var migrationPlanRefs = Array.isArray(tpl && tpl.migrationPlanRefs) ? tpl.migrationPlanRefs : [];
  var deprecationWindow = tpl && tpl.deprecationWindow && typeof tpl.deprecationWindow === 'object' ? tpl.deprecationWindow : null;
  var edges = (graph.edges || []).filter(function(edge){
    return edge.from === 'template:' + templateId || edge.to === 'template:' + templateId;
  });
  var rows = edges.map(function(edge){
    return '<tr>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.from || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.relation || '-')+'</td>'
      + '<td style="padding:8px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px">'+esc(edge.to || '-')+'</td>'
      + '</tr>';
  }).join('');
  return sect(
    L('Template lineage', 'Template lineage'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:12px">'
      + infoCard('templateId', templateId || '-', 'admin')
      + infoCard('version', (tpl && tpl.version) || '-', 'admin')
      + infoCard(L('Deprecated window', 'Deprecated window'), deprecationWindow ? JSON.stringify(deprecationWindow) : '-', 'preview')
      + infoCard(L('Migration plan', 'Migration plan'), migrationPlanRefs.length ? joinList(migrationPlanRefs) : L('Required on deprecation', 'Required on deprecation'), 'preview')
      + '</div>'
      + '<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">From</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Relation</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">To</th>'
      + '</tr></thead><tbody>'+(rows || '<tr><td colspan="3" style="padding:12px;color:var(--text-secondary)">No backend lineage edge for selected template yet</td></tr>')+'</tbody></table>',
    false,
    statusChip('admin', L('Version lineage', 'Version lineage'))
  );
}

function renderTemplateDetail(id){
  var tpl = getTemplateById(id);
  if(!tpl) return '<div class="hm-empty">'+esc(T('noTemplate'))+'</div>';
  var modulesUsing = getGovernedModulesForTemplate(tpl);
  var cat = TEMPLATE_CATEGORIES.find(function(item){ return item.key === tpl.category; });
  var canDelete = /^C/.test(tpl.id) || tpl.source === 'custom';
  if(graphicsSvc() && typeof graphicsSvc().markChange === 'function') graphicsSvc().markChange({ kind:'template-zone', target:tpl.templateId || tpl.id, label:'Template detail selected' }, BASE_TEMPLATE_PRESETS);
  var h = '<div id="adm-graphics-impact-panel" style="margin-bottom:14px">'+renderImpactAnalysisPanel(false)+'</div>';
  h += renderRolloutControls(tpl);
  h += '<div style="display:flex;justify-content:space-between;gap:10px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px">';
  h += '<div><div style="font-size:18px;font-weight:800;color:var(--text-primary)">'+esc((tpl.templateId || tpl.id)+' '+templateDisplayName(tpl))+'</div><div style="font-size:12px;color:var(--text-secondary);margin-top:2px">'+esc((tpl.name && tpl.name.en) || '')+'</div><div style="font-size:12px;color:var(--text-tertiary);margin-top:6px;max-width:780px">'+esc(tpl.desc.vi)+'</div></div>';
  h += '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hm-btn hm-btn-secondary" onclick="_admTplBack()">'+T('backToGallery')+'</button><button class="hm-btn hm-btn-secondary" onclick="_admTplClone(\''+tpl.id+'\')">'+T('cloneTemplate')+'</button>'+(canDelete ? '<button class="hm-btn hm-btn-secondary" onclick="_admTplDelete(\''+tpl.id+'\')">'+T('deleteTemplate')+'</button>' : '')+'<button class="hm-btn hm-btn-primary" onclick="_admTplEdit(\''+tpl.id+'\')">'+T('editTemplate')+'</button></div>';
  h += '</div>';
  h += '<div class="tpl-detail-header" style="display:grid;grid-template-columns:minmax(280px,360px) 1fr;align-items:stretch">';
  h += '<div class="tpl-detail-preview" style="width:auto"><div style="aspect-ratio:16/10;display:flex;align-items:center;justify-content:center">'+renderTemplateSvg(tpl)+'</div></div>';
  h += '<div class="tpl-detail-meta"><div style="display:flex;gap:6px;flex-wrap:wrap"><span class="hm-badge">'+esc(cat ? cat.label[lang === 'en' ? 'en' : 'vi'] : tpl.category)+'</span>'+templateStatusChip(tpl)+templateControlBadge(tpl)+'<span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,transparent);color:var(--brand-2,#1565c0);border:1px solid color-mix(in srgb,var(--brand-2,#1565c0) 18%,transparent);font-size:10px;font-weight:700">'+esc(String(tpl.zoneCount))+' zones</span><span style="display:inline-flex;align-items:center;padding:2px 6px;border-radius:999px;font-size:10px;font-weight:700;'+densityChipStyle(tpl.density)+'">'+esc(tpl.density)+'</span></div>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin-top:10px">'
    + smallMeta('templateId', tpl.templateId || tpl.id)
    + smallMeta('version', tpl.version || '1.0.0')
    + smallMeta('status', templateStatusLabel(tpl.status))
	    + smallMeta('owner', tpl.owner || '-')
	    + smallMeta('zone count', tpl.zoneCount || 0)
	    + smallMeta('governed modules', modulesUsing.length)
	    + smallMeta('regulated compatibility', templateCompatibility(tpl, 'regulatedCompatibility'))
	    + smallMeta('shopfloor compatibility', templateCompatibility(tpl, 'shopfloorCompatibility'))
	    + smallMeta('drift state', templateDriftState(tpl))
	    + smallMeta('publish eligibility', templatePublishEligibility(tpl))
	    + '</div>'
    + '<div style="font-size:11px;color:var(--text-secondary);margin-top:10px;line-height:1.6"><strong>'+esc(T('layoutContract'))+':</strong> '+esc(tpl.layoutMeta)+'</div><div style="font-size:11px;color:var(--text-secondary);margin-top:6px;line-height:1.6"><strong>'+esc(T('modulesUsing'))+':</strong> '+esc(modulesUsing.join(', ') || '-')+'</div></div>';
  h += '</div>';
  h += '<div class="zone-scrollable" style="display:grid;gap:14px;max-height:620px;padding-right:4px">';
  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)"><div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-primary)">'+esc(T('zoneConfig'))+'</div>'+renderZoneMiniDiagram(tpl)+'</div>';
	  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)"><div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-primary)">'+esc(T('templateUsage'))+'</div><table style="width:100%;border-collapse:collapse;font-size:12px"><tr><td style="padding:6px 0;color:var(--text-secondary)">templateId</td><td style="padding:6px 0;text-align:right;color:var(--text-primary);font-family:var(--font-mono)">'+esc(tpl.templateId || tpl.id)+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">version</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(tpl.version || '1.0.0')+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">status</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+templateStatusChip(tpl)+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">owner</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(tpl.owner || '-')+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">'+esc(T('templateCategory'))+'</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(cat ? cat.label[lang === 'en' ? 'en' : 'vi'] : tpl.category)+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">'+esc(T('zoneCount'))+'</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(String(tpl.zoneCount))+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">'+esc(T('modulesUsing'))+'</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(String(modulesUsing.length))+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">regulated</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(templateCompatibility(tpl, 'regulatedCompatibility'))+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">shopfloor</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(templateCompatibility(tpl, 'shopfloorCompatibility'))+'</td></tr><tr><td style="padding:6px 0;color:var(--text-secondary)">publish eligibility</td><td style="padding:6px 0;text-align:right;color:var(--text-primary)">'+esc(templatePublishEligibility(tpl))+'</td></tr></table></div>';
  h += renderTemplateLineagePanel(tpl);
  h += '</div></div>';
  return h;
}

function renderTemplateEditor(id){
  var tpl = getTemplateById(id);
  if(!tpl) return '<div class="hm-empty">'+esc(T('noTemplate'))+'</div>';
  var canDelete = /^C/.test(tpl.id) || tpl.source === 'custom';
  if(graphicsSvc() && typeof graphicsSvc().markChange === 'function') graphicsSvc().markChange({ kind:'template-zone', target:tpl.templateId || tpl.id, label:'Template editor selected' }, BASE_TEMPLATE_PRESETS);
  var h = '<div id="adm-graphics-impact-panel" style="margin-bottom:14px">'+renderImpactAnalysisPanel(false)+'</div>';
  h += renderRolloutControls(tpl);
  h += renderTemplateLineagePanel(tpl);
  h += '<div style="display:flex;justify-content:space-between;gap:10px;align-items:center;flex-wrap:wrap;margin-bottom:12px"><div><div style="font-size:16px;font-weight:800;color:var(--text-primary)">'+esc(T('templateEditor'))+': '+(tpl.templateId || tpl.id)+' '+templateDisplayName(tpl)+'</div><div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:6px">'+templateStatusChip(tpl)+templateControlBadge(tpl)+statusChip('preview', tpl.sourceAuthority || 'draft cache')+'</div></div><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hm-btn hm-btn-secondary" onclick="_admTplPick(\''+tpl.id+'\')">'+T('detail')+'</button><button class="hm-btn hm-btn-secondary" onclick="_admTplBack()">'+T('backToGallery')+'</button>'+(canDelete ? '<button class="hm-btn hm-btn-secondary" onclick="_admTplDelete(\''+tpl.id+'\')">'+T('deleteTemplate')+'</button>' : '')+'</div></div>';
  h += '<div style="display:grid;grid-template-columns:minmax(320px,40%) 1fr;gap:14px">';
  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)">';
  h += '<div style="font-size:12px;font-weight:700;margin-bottom:10px;color:var(--text-primary)">'+esc(T('zoneConfig'))+'</div>';
  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;margin-bottom:12px">'
    + smallMeta('templateId', tpl.templateId || tpl.id)
    + smallMeta('version', tpl.version || '1.0.0')
    + smallMeta('status', templateStatusLabel(tpl.status))
	    + smallMeta('owner', tpl.owner || '-')
	    + smallMeta('zone count', tpl.zoneCount || 0)
	    + smallMeta('governed modules', getGovernedModulesForTemplate(tpl).length)
	    + smallMeta('regulated compatibility', templateCompatibility(tpl, 'regulatedCompatibility'))
	    + smallMeta('shopfloor compatibility', templateCompatibility(tpl, 'shopfloorCompatibility'))
	    + smallMeta('drift state', templateDriftState(tpl))
	    + smallMeta('publish eligibility', templatePublishEligibility(tpl))
	    + '</div>';
  h += textInput(L('Tên template (VI)','Template name (VI)'), '', 'template.editor.nameVi', tpl.name.vi, '').replace('oninput="_hmSet(\'\',\'template.editor.nameVi\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'name.vi\',this.value)"');
  h += textInput(L('Tên template (EN)','Template name (EN)'), '', 'template.editor.nameEn', tpl.name.en, '').replace('oninput="_hmSet(\'\',\'template.editor.nameEn\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'name.en\',this.value)"');
  h += textInput(L('Mô tả ngắn','Short description'), '', 'template.editor.desc', tpl.desc.vi, '').replace('oninput="_hmSet(\'\',\'template.editor.desc\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'desc.vi\',this.value)"');
  h += '<div style="display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:10px">';
  h += textInput('Version', '', 'template.editor.version', tpl.version || '1.0.0', '').replace('oninput="_hmSet(\'\',\'template.editor.version\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'version\',this.value)"');
  h += textInput('Owner', '', 'template.editor.owner', tpl.owner || '', '').replace('oninput="_hmSet(\'\',\'template.editor.owner\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'owner\',this.value)"');
  h += textInput(L('Regulated compatibility','Regulated compatibility'), '', 'template.editor.regulatedCompatibility', templateCompatibility(tpl, 'regulatedCompatibility'), '').replace('oninput="_hmSet(\'\',\'template.editor.regulatedCompatibility\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'regulatedCompatibility\',this.value)"');
  h += textInput(L('Shopfloor compatibility','Shopfloor compatibility'), '', 'template.editor.shopfloorCompatibility', templateCompatibility(tpl, 'shopfloorCompatibility'), '').replace('oninput="_hmSet(\'\',\'template.editor.shopfloorCompatibility\',this.value)"','oninput="_admTplSaveField(\''+tpl.id+'\',\'shopfloorCompatibility\',this.value)"');
  h += '</div>';
  h += '<div style="font-size:11px;line-height:1.6;color:var(--text-secondary);margin:8px 0 4px">'+esc(L('Save draft lên backend yêu cầu version lớn hơn bản published hiện tại; chỉnh version trước khi promote controlled draft.', 'Backend draft save requires a version greater than the current published template; update version before promoting a controlled draft.'))+'</div>';
  h += '<div style="margin:12px 0 8px;font-size:12px;font-weight:700;color:var(--text-secondary)">'+esc(T('templateZones'))+'</div>';
  (tpl.zoneSettings || []).forEach(function(zone, idx){
    h += '<div style="padding:10px;border:1px solid var(--border);border-radius:10px;background:var(--bg-surface-alt,#f8fafc);margin-bottom:8px">';
    h += '<div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:6px">'+esc(zone.name)+'</div>';
    h += '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">';
    h += '<input type="text" value="'+esc(zone.type || zone.name)+'" oninput="_admTplSaveZone(\''+tpl.id+'\','+idx+',\'type\',this.value)" style="height:30px;padding:0 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg-surface)">';
    h += '<select onchange="_admTplSaveZone(\''+tpl.id+'\','+idx+',\'scroll\',this.value)" style="height:30px;padding:0 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg-surface)"><option value="sticky" '+((zone.scroll || '') === 'sticky' ? 'selected' : '')+'>sticky</option><option value="data-only" '+((zone.scroll || '') === 'data-only' ? 'selected' : '')+'>data-only</option><option value="none" '+((zone.scroll || '') === 'none' ? 'selected' : '')+'>none</option></select>';
    h += '</div>';
    h += '<label style="display:grid;gap:4px;margin-top:8px;font-size:10px;font-weight:800;text-transform:uppercase;color:var(--text-tertiary)">'+esc(L('Allowed blocks', 'Allowed blocks'))+'<input type="text" aria-label="'+esc(zone.name+' allowed blocks')+'" value="'+esc(zone.allowed || '')+'" oninput="_admTplSaveZone(\''+tpl.id+'\','+idx+',\'allowed\',this.value)" style="width:100%;height:30px;padding:0 8px;border:1px solid var(--border);border-radius:6px;font-size:12px;background:var(--bg-surface)"></label>';
    h += '</div>';
  });
  h += '</div>';
  h += '<div style="display:grid;gap:14px">';
  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)"><div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-primary)">Live Preview</div>'+renderZoneMiniDiagram(tpl)+'<div style="margin-top:10px;padding:10px;border:1px dashed var(--border);border-radius:10px;background:var(--bg-surface-alt,#f8fafc)">'+renderTemplateSvg(tpl)+'</div></div>';
  h += '<div style="padding:14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)"><div style="font-size:12px;font-weight:700;margin-bottom:8px;color:var(--text-primary)">'+esc(T('themeLibrary'))+'</div><div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">';
  VISUAL_THEMES.forEach(function(theme){
    h += renderThemeControlButton(theme);
  });
  h += '</div></div>';
  h += '</div></div>';
  return h;
}

function renderTemplates(){
  ensureGraphicsRefresh();
  var count = getAllTemplates().length;
  var selected = _selectedTemplate ? getTemplateById(_selectedTemplate) : null;
  var intro = sectionLead(
    L('Graphics Control Plane cho template registry', 'Graphics Control Plane for template registry'),
    L('Tab này quản trị authority status, controlled registry, impact analysis, validation, rollout, rollback và audit trail. Local cache chỉ phục vụ preview hoặc nháp chưa lưu authority.', 'This tab governs authority status, controlled registry, impact analysis, validation, rollout, rollback, and audit trail. Local cache is only for preview or unsaved drafts.'),
    statusChip('admin', count + ' ' + T('templateCount')) + (selected ? templateStatusChip(selected) : '') + (selected ? statusChip('preview', selected.id) : '')
  );
  if(!_selectedTemplate && _templateView !== 'gallery') _templateView = 'gallery';
  if(_templateView === 'detail' && _selectedTemplate) return intro + renderTemplateDetail(_selectedTemplate);
  if(_templateView === 'editor' && _selectedTemplate) return intro + renderTemplateEditor(_selectedTemplate);
  return intro + renderTemplateGallery();
}

function renderTokens(){
  var h = sectionLead(
    L('Token hệ thống: Typography + Colors + Layout', 'System Tokens: Typography + Colors + Layout'),
    L('Mỗi chỉnh sửa token được ghi nhận thành change context để impact analysis xác định module, route, screen và block family bị ảnh hưởng.', 'Each token edit is recorded as a change context so impact analysis can identify affected modules, routes, screens, and block families.'),
    statusChip('full', L('Merged tab', 'Merged tab')) + statusChip('admin', L('Impact-aware', 'Impact-aware'))
  );
  h += renderTypography();
  h += renderColors();
  h += renderLayout();
  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ══════════════════════════════════════════════════════════════════════════ */
/* ── ACCESSIBILITY TAB ──────────────────────────────────────────────────── */
/* WCAG contrast checker · Color blindness simulation · Color role map      */
/* A11y compliance checklist · Contrast pair matrix                         */
/* ══════════════════════════════════════════════════════════════════════════ */

function _cfgColor(path){
  var tm = typeof HmTheme !== 'undefined' ? HmTheme : null;
  if(!tm || typeof tm.getAdminConfig !== 'function') return null;
  var cfg = tm.getAdminConfig() || {};
  var parts = path.split('.'); var val = cfg;
  for(var i=0;i<parts.length;i++){ if(val&&typeof val==='object') val=val[parts[i]]; else return null; }
  return typeof val==='string'&&/^#[0-9a-fA-F]{3,8}$/.test(val) ? val : null;
}

function _hexToRgb(hex){
  if(!hex) return null;
  hex=hex.replace('#','');
  if(hex.length===3) hex=hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  var r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);
  return isNaN(r)||isNaN(g)||isNaN(b)?null:{r:r,g:g,b:b};
}

function _computeContrast(hex1, hex2){
  var tm = typeof HmTheme !== 'undefined' ? HmTheme : null;
  if(tm && typeof tm.contrastRatio === 'function') return tm.contrastRatio(hex1, hex2);
  function lum(c){ var r=c.r/255,g=c.g/255,b=c.b/255; return [r,g,b].reduce(function(s,v,i){ v=v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4); return s+[0.2126,0.7152,0.0722][i]*v; },0); }
  var c1=_hexToRgb(hex1),c2=_hexToRgb(hex2); if(!c1||!c2) return 1;
  var l1=lum(c1),l2=lum(c2),hi=Math.max(l1,l2),lo=Math.min(l1,l2);
  return (hi+0.05)/(lo+0.05);
}

function _wcagChip(ratio){
  var r=ratio?ratio.toFixed(2):'?';
  if(ratio>=7) return '<span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--green,#16a34a) 12%,var(--bg-surface,#fff));color:var(--green,#166534);border:1px solid color-mix(in srgb,var(--green,#16a34a) 28%,transparent)">AAA '+r+':1</span>';
  if(ratio>=4.5) return '<span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--brand-2,#1565c0) 10%,var(--bg-surface,#fff));color:var(--brand-2,#1565c0);border:1px solid color-mix(in srgb,var(--brand-2,#1565c0) 25%,transparent)">AA '+r+':1</span>';
  if(ratio>=3) return '<span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--amber,#f57f17) 10%,var(--bg-surface,#fff));color:color-mix(in srgb,var(--amber,#f57f17) 60%,#000 40%);border:1px solid color-mix(in srgb,var(--amber,#f57f17) 28%,transparent)">AA-Large '+r+':1</span>';
  return '<span style="padding:2px 7px;border-radius:4px;font-size:10px;font-weight:800;background:color-mix(in srgb,var(--red,#c62828) 10%,var(--bg-surface,#fff));color:var(--red,#991b1b);border:1px solid color-mix(in srgb,var(--red,#c62828) 25%,transparent)">FAIL '+r+':1</span>';
}

function renderWcagContrastPanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig ? HmTheme.getAdminConfig()||{} : {};
  var cl = cfg.colorsLight||{}; var cd = cfg.colorsDark||{}; var br = cfg.brand||{}; var st = cfg.statusColors||{};
  var W='#ffffff', B='#000000';
  var lightPairs = [
    {fg:cl.textPrimary||'#1e293b', bg:cl.bgSurface||'#ffffff', label:'Text Primary / Surface'},
    {fg:cl.textPrimary||'#1e293b', bg:cl.bgPage||'#f8fafc', label:'Text Primary / Page'},
    {fg:cl.textSecondary||'#64748b', bg:cl.bgSurface||'#ffffff', label:'Text Secondary / Surface'},
    {fg:cl.textTertiary||'#94a3b8', bg:cl.bgSurface||'#ffffff', label:'Text Tertiary / Surface'},
    {fg:cl.textLink||'#1565c0', bg:cl.bgSurface||'#ffffff', label:'Link / Surface'},
    {fg:cl.textInverse||W, bg:br.primary||'#1565c0', label:'Inverse / Brand Primary'},
    {fg:W, bg:st.success||'#16a34a', label:'White / Success'},
    {fg:W, bg:st.error||'#dc2626', label:'White / Error'},
    {fg:W, bg:st.warning||'#d97706', label:'White / Warning'},
    {fg:W, bg:st.info||'#2563eb', label:'White / Info'},
    {fg:cl.textPrimary||'#1e293b', bg:cl.bgSurfaceAlt||'#f1f5f9', label:'Text Primary / Surface Alt'},
    {fg:B, bg:br.accent||'#f9a825', label:'Black / Accent'},
  ];
  var darkPairs = [
    {fg:cd.textPrimary||'#f1f5f9', bg:cd.bgSurface||'#1e293b', label:'Text Primary / Surface (dark)'},
    {fg:cd.textSecondary||'#94a3b8', bg:cd.bgSurface||'#1e293b', label:'Text Secondary / Surface (dark)'},
    {fg:cd.textLink||'#60a5fa', bg:cd.bgSurface||'#1e293b', label:'Link / Surface (dark)'},
    {fg:cd.textPrimary||'#f1f5f9', bg:cd.bgPage||'#0f172a', label:'Text Primary / Page (dark)'},
  ];
  function pairRow(p){
    if(!p.fg||!p.bg) return '';
    var ratio=_computeContrast(p.fg,p.bg);
    return '<tr>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border)">'
      +'<div style="display:inline-flex;align-items:center;gap:8px">'
      +'<div style="width:40px;height:22px;border-radius:4px;background:'+esc(p.bg)+';border:1px solid rgba(0,0,0,.1);display:flex;align-items:center;justify-content:center"><span style="color:'+esc(p.fg)+';font-size:11px;font-weight:700">Aa</span></div>'
      +'<span style="font-size:12px;color:var(--text-primary)">'+esc(p.label)+'</span>'
      +'</div></td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">'+esc(p.fg)+'</td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border);font-family:var(--font-mono);font-size:11px;color:var(--text-secondary)">'+esc(p.bg)+'</td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border)">'+_wcagChip(ratio)+'</td>'
      +'</tr>';
  }
  var thStyle='text-align:left;padding:6px 10px;border-bottom:2px solid var(--border);font-size:11px;font-weight:700;color:var(--text-secondary)';
  return sect(L('WCAG Contrast Checker','WCAG Contrast Checker'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('Kiểm tra tỷ lệ contrast cho tất cả cặp màu. AA = 4.5:1 (text bình thường), AA-Large = 3:1 (text lớn ≥18px hoặc bold ≥14px), AAA = 7:1.','Check contrast ratio for all color pairs. AA = 4.5:1 (normal text), AA-Large = 3:1 (large text ≥18px or bold ≥14px), AAA = 7:1.')+'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">Light mode pairs</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px;margin-bottom:16px"><thead><tr>'
    +'<th style="'+thStyle+'">'+L('Pair','Pair')+'</th>'
    +'<th style="'+thStyle+'">Foreground</th>'
    +'<th style="'+thStyle+'">Background</th>'
    +'<th style="'+thStyle+'">WCAG Level</th>'
    +'</tr></thead><tbody>'+lightPairs.map(pairRow).join('')+'</tbody></table>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">Dark mode pairs</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
    +'<th style="'+thStyle+'">'+L('Pair','Pair')+'</th>'
    +'<th style="'+thStyle+'">Foreground</th>'
    +'<th style="'+thStyle+'">Background</th>'
    +'<th style="'+thStyle+'">WCAG Level</th>'
    +'</tr></thead><tbody>'+darkPairs.map(pairRow).join('')+'</tbody></table>',
    true, statusChip('admin','WCAG 2.1'));
}

function renderColorBlindnessPanel(){
  var filters = [
    {id:'none',   label:L('Bình thường','Normal vision'),    matrix:''},
    {id:'deuter', label:'Deuteranopia (red-green)',          matrix:'0.625 0.375 0 0 0  0.7 0.3 0 0 0  0 0.3 0.7 0 0  0 0 0 1 0'},
    {id:'protan', label:'Protanopia (red-weak)',             matrix:'0.567 0.433 0 0 0  0.558 0.442 0 0 0  0 0.242 0.758 0 0  0 0 0 1 0'},
    {id:'tritan', label:'Tritanopia (blue-yellow)',          matrix:'0.95 0.05 0 0 0  0 0.433 0.567 0 0  0 0.475 0.525 0 0  0 0 0 1 0'},
    {id:'achroma',label:'Achromatopsia (no color)',          matrix:'0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0.299 0.587 0.114 0 0  0 0 0 1 0'},
  ];
  var _cbAll = HmTheme.getAll ? HmTheme.getAll() : {};
  var _cbSc  = _cbAll.statusColors || {};
  var _cbCc  = _cbAll.colors || {};
  var _cbCl  = _cbAll.colorsLight || {};
  var _cbBrand   = _cbCc.brand2 || '#1565c0';
  var _cbSuccess = _cbSc.success || '#22c55e';
  var _cbError   = _cbSc.error   || '#ef4444';
  var _cbWarning = _cbSc.warning || '#f59e0b';
  var _cbSurf    = _cbCl.bgSurface    || '#ffffff';
  var _cbBdr     = _cbCl.border       || '#e2e8f0';
  var _cbTxt     = _cbCl.textPrimary  || '#1e293b';
  var _cbTxt2    = _cbCl.textSecondary|| '#64748b';
  var preview = '<div style="padding:16px;background:var(--bg-page,#f8fafc);border-radius:8px;display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">'
    +'<div style="padding:8px 16px;background:'+_cbBrand+';color:'+_cbSurf+';border-radius:6px;font-size:13px;font-weight:700">Primary</div>'
    +'<div style="padding:8px 16px;background:'+_cbSuccess+';color:'+_cbSurf+';border-radius:6px;font-size:13px;font-weight:700">Success</div>'
    +'<div style="padding:8px 16px;background:'+_cbError+';color:'+_cbSurf+';border-radius:6px;font-size:13px;font-weight:700">Error</div>'
    +'<div style="padding:8px 16px;background:'+_cbWarning+';color:'+_cbSurf+';border-radius:6px;font-size:13px;font-weight:700">Warning</div>'
    +'<div style="padding:8px 16px;background:#8b5cf6;color:'+_cbSurf+';border-radius:6px;font-size:13px;font-weight:700">Purple</div>'
    +'<div style="padding:10px;border:1px solid '+_cbBdr+';border-radius:6px;background:'+_cbSurf+'"><div style="font-size:13px;font-weight:600;color:'+_cbTxt+'">Card text</div><div style="font-size:11px;color:'+_cbTxt2+'">Secondary text</div></div>'
    +'<div style="display:flex;gap:6px">'
    +[_cbError,'#f97316','#eab308',_cbSuccess,'#3b82f6','#8b5cf6','#ec4899'].map(function(c){ return '<div style="width:28px;height:28px;border-radius:4px;background:'+c+'"></div>'; }).join('')
    +'</div>'
    +'</div>';
  var svgDefs = '<svg xmlns="http://www.w3.org/2000/svg" style="position:absolute;width:0;height:0">'
    +filters.filter(function(f){return f.matrix;}).map(function(f){
      return '<filter id="cbf-'+f.id+'"><feColorMatrix type="matrix" values="'+f.matrix+'"/></filter>';
    }).join('')+'</svg>';
  var cards = filters.map(function(f){
    var filterStyle = f.matrix ? 'filter:url(#cbf-'+f.id+');-webkit-filter:url(#cbf-'+f.id+')' : '';
    return '<div style="flex:1;min-width:240px">'
      +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">'+esc(f.label)+'</div>'
      +'<div style="'+filterStyle+'">'+preview+'</div>'
      +'</div>';
  }).join('');
  return sect(L('Color Blindness Simulation','Color Blindness Simulation'),
    svgDefs
    +'<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('Mô phỏng giao diện dưới 4 loại color blindness phổ biến nhất để đảm bảo UI có thể nhận biết không cần màu sắc.','Simulate the UI under 4 common color blindness types to ensure UI is distinguishable without relying on color alone.')+'</div>'
    +'<div style="display:flex;flex-wrap:wrap;gap:16px">'+cards+'</div>',
    false, statusChip('preview','Simulation'));
}

function renderColorRoleMapPanel(){
  var roles = [
    {role:L('Nền trang','Page background'), token:'--bg-page', path:'colorsLight.bgPage', usage:L('Layout wrapper, màu nền tổng thể','Layout wrapper, global background')},
    {role:L('Nền surface','Surface'), token:'--bg-surface', path:'colorsLight.bgSurface', usage:L('Card, panel, modal, dropdown','Cards, panels, modals, dropdowns')},
    {role:L('Nền alt','Surface Alt'), token:'--bg-surface-alt', path:'colorsLight.bgSurfaceAlt', usage:L('Striped row, sidebar section header, section bg','Striped rows, sidebar headers, section backgrounds')},
    {role:L('Nền hover','Hover'), token:'--bg-hover', path:'colorsLight.bgHover', usage:L('Hover state cho row, nav item, list item','Hover state for rows, nav items, list items')},
    {role:L('Text chính','Primary text'), token:'--text-primary', path:'colorsLight.textPrimary', usage:L('Nội dung chính, heading, label','Main content, headings, labels')},
    {role:L('Text phụ','Secondary text'), token:'--text-secondary', path:'colorsLight.textSecondary', usage:L('Metadata, placeholder, helper text','Metadata, placeholders, helper text')},
    {role:L('Text nhạt','Tertiary text'), token:'--text-tertiary', path:'colorsLight.textTertiary', usage:L('Disabled text, decorative label','Disabled text, decorative labels')},
    {role:L('Link','Link'), token:'--text-link', path:'colorsLight.textLink', usage:L('Hyperlink, breadcrumb active, tab active','Hyperlinks, active breadcrumbs, active tabs')},
    {role:L('Border','Border'), token:'--border', path:'colorsLight.border', usage:L('Card border, table border, input border','Card borders, table borders, input borders')},
    {role:L('Focus ring','Focus ring'), token:'--border-focus', path:'colorsLight.borderFocus', usage:L('Keyboard focus indicator','Keyboard focus indicator')},
    {role:L('Error','Error'), token:'--status-error', path:'statusColors.error', usage:L('Validation error, danger alert, delete action','Validation errors, danger alerts, delete actions')},
    {role:L('Thành công','Success'), token:'--status-success', path:'statusColors.success', usage:L('Confirmation, completion, approved state','Confirmations, completions, approved states')},
    {role:L('Cảnh báo','Warning'), token:'--status-warning', path:'statusColors.warning', usage:L('Alert, caution, pending state','Alerts, cautions, pending states')},
    {role:L('Thông tin','Info'), token:'--status-info', path:'statusColors.info', usage:L('Info alert, progress, secondary action','Info alerts, progress, secondary actions')},
    {role:L('Brand primary','Brand primary'), token:'--brand-primary', path:'brand.primary', usage:L('CTA button, selected tab, active link, primary badge','CTA buttons, selected tabs, active links, primary badges')},
    {role:L('Brand accent','Accent'), token:'--brand-accent', path:'brand.accent', usage:L('Highlight, new badge, promo strip','Highlights, new badges, promo strips')},
  ];
  var rows = roles.map(function(r){
    var hex = _cfgColor(r.path) || '';
    return '<tr>'
      +'<td style="padding:7px 10px;border-bottom:1px solid var(--border)">'
      +(hex?'<div style="display:flex;align-items:center;gap:8px"><div style="width:24px;height:24px;border-radius:4px;background:'+esc(hex)+';border:1px solid rgba(0,0,0,.1);flex-shrink:0"></div>':'<div style="display:flex;align-items:center;gap:8px"><div style="width:24px;height:24px;border-radius:4px;background:#e2e8f0;flex-shrink:0"></div>')
      +'<div><div style="font-size:12px;font-weight:600;color:var(--text-primary)">'+esc(r.role)+'</div><div style="font-size:10px;color:var(--text-tertiary);font-family:var(--font-mono)">'+esc(hex||'-')+'</div></div></div></td>'
      +'<td style="padding:7px 10px;border-bottom:1px solid var(--border);font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">'+esc(r.token)+'</td>'
      +'<td style="padding:7px 10px;border-bottom:1px solid var(--border);font-size:11px;color:var(--text-secondary)">'+esc(r.usage)+'</td>'
      +'</tr>';
  }).join('');
  return sect(L('Color Role Map','Color Role Map'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('Bản đồ vai trò màu sắc — mỗi token có một semantic role duy nhất. Không dùng màu trực tiếp, chỉ dùng qua role token.','Color role map — each token has one semantic role. Never use direct hex values, always reference by role token.')+'</div>'
    +'<table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr>'
    +'<th style="text-align:left;padding:7px 10px;border-bottom:2px solid var(--border);font-size:11px">Role</th>'
    +'<th style="text-align:left;padding:7px 10px;border-bottom:2px solid var(--border);font-size:11px">CSS Token</th>'
    +'<th style="text-align:left;padding:7px 10px;border-bottom:2px solid var(--border);font-size:11px">Usage</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>',
    false, statusChip('full','16 roles'));
}

function renderA11yChecklistPanel(){
  var checks = [
    {done:true,  cat:'Keyboard', label:L('Focus ring hiển thị cho mọi interactive element (button, link, input)','Focus ring visible on all interactive elements')},
    {done:true,  cat:'Keyboard', label:L('Tab order logic — không bẫy focus','Logical tab order — no focus traps')},
    {done:true,  cat:'Color',    label:L('Contrast text/bg ≥ 4.5:1 (AA) cho text ≤ 18px','Text contrast ≥ 4.5:1 (AA) for text ≤ 18px')},
    {done:null,  cat:'Color',    label:L('Contrast text/bg ≥ 7:1 (AAA) cho text ≤ 14px quan trọng','Text contrast ≥ 7:1 (AAA) for critical text ≤ 14px')},
    {done:true,  cat:'Color',    label:L('Không chỉ dùng màu để truyền thông tin (status badge có icon)','Information not conveyed by color alone — status badges have icons')},
    {done:null,  cat:'Motion',   label:L('Hỗ trợ prefers-reduced-motion','Supports prefers-reduced-motion')},
    {done:true,  cat:'Semantics',label:L('ARIA labels cho icon-only button','ARIA labels for icon-only buttons')},
    {done:true,  cat:'Semantics',label:L('role="tablist" + aria-selected cho tab bar','role="tablist" + aria-selected on tab bars')},
    {done:null,  cat:'Semantics',label:L('Live region (aria-live) cho async update','Live regions for async updates')},
    {done:true,  cat:'Font',     label:L('Font size base ≥ 14px, không dùng px nhỏ hơn 11px cho text chính','Base font ≥ 14px, no text below 11px for primary content')},
    {done:null,  cat:'Images',   label:L('alt text cho mọi ảnh thông tin','Alt text on all informational images')},
    {done:true,  cat:'Forms',    label:L('Label gắn với input (for/id hoặc aria-label)','Labels associated with inputs')},
    {done:null,  cat:'Forms',    label:L('Error message có id, input aria-describedby error','Error messages have id, inputs reference via aria-describedby')},
    {done:true,  cat:'Layout',   label:L('Nội dung không overflow khi font-size tăng 200%','Content does not overflow at 200% font size increase')},
  ];
  var rows = checks.map(function(c){
    var icon = c.done===true ? '✅' : c.done===false ? '❌' : '⚠️';
    var bg = c.done===true ? '' : c.done===false ? 'background:color-mix(in srgb,var(--red,#ef4444) 6%,var(--bg-surface,#fff))' : 'background:color-mix(in srgb,var(--amber,#f59e0b) 8%,var(--bg-surface,#fff))';
    return '<tr style="'+bg+'">'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:11px;font-weight:700;color:var(--text-secondary);white-space:nowrap">'+esc(c.cat)+'</td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:16px;text-align:center">'+icon+'</td>'
      +'<td style="padding:6px 10px;border-bottom:1px solid var(--border);font-size:12px;color:var(--text-primary)">'+esc(c.label)+'</td>'
      +'</tr>';
  }).join('');
  var pass = checks.filter(function(c){return c.done===true;}).length;
  return sect(L('A11y Compliance Checklist','A11y Compliance Checklist'),
    '<table style="width:100%;border-collapse:collapse"><thead><tr>'
    +'<th style="text-align:left;padding:6px 10px;border-bottom:2px solid var(--border);font-size:11px">Category</th>'
    +'<th style="padding:6px 10px;border-bottom:2px solid var(--border);font-size:11px">Status</th>'
    +'<th style="text-align:left;padding:6px 10px;border-bottom:2px solid var(--border);font-size:11px">Requirement</th>'
    +'</tr></thead><tbody>'+rows+'</tbody></table>',
    false, statusChip(pass===checks.length?'full':'partial', pass+'/'+checks.length+' passed'));
}

function renderAccessibility(){
  var h = sectionLead(L('Trợ năng & WCAG','Accessibility & WCAG'),
    L('Kiểm tra contrast ratio thực tế, mô phỏng color blindness, bản đồ vai trò màu sắc, và checklist tuân thủ WCAG 2.1 AA.','Real-time contrast ratio checks, color blindness simulation, color role map, and WCAG 2.1 AA compliance checklist.'),
    statusChip('admin','WCAG 2.1')+statusChip('full','ISO 9241'));
  h += renderWcagContrastPanel();
  h += renderColorBlindnessPanel();
  h += renderColorRoleMapPanel();
  h += renderA11yChecklistPanel();
  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── EXPORT & ANALYTICS TAB ─────────────────────────────────────────────── */
/* Token export pipeline · Health score · Spacing scale · Shadow catalog    */
/* Motion catalog · Typography specimen · Palette generator · Semantic map  */
/* Side-by-side comparison · Responsive preview · CSS coverage              */
/* ══════════════════════════════════════════════════════════════════════════ */

function _flattenTokens(obj, prefix){
  var out = {};
  prefix = prefix||'';
  if(!obj||typeof obj!=='object'||Array.isArray(obj)) return out;
  Object.keys(obj).forEach(function(k){
    if(k==='_meta') return;
    var val = obj[k];
    var key = prefix ? prefix+'.'+k : k;
    if(val&&typeof val==='object'&&!Array.isArray(val)) Object.assign(out, _flattenTokens(val, key));
    else out[key] = val;
  });
  return out;
}

function _toCssVarName(path){
  return '--hds-'+path.replace(/\./g,'-').replace(/([A-Z])/g,function(m){return '-'+m.toLowerCase();}).replace(/-+/g,'-').toLowerCase();
}

function renderTokenExportPanel(){
  var tm = typeof HmTheme!=='undefined'?HmTheme:null;
  var cfg = tm&&tm.getAdminConfig?tm.getAdminConfig()||{}:{};
  var flat = _flattenTokens(cfg);
  delete flat['moduleOverrides'];
  var keys = Object.keys(flat).filter(function(k){return flat[k]!==null&&flat[k]!==undefined&&typeof flat[k]!=='object';});

  function genCSS(){ return ':root {\n'+keys.map(function(k){ return '  '+_toCssVarName(k)+': '+flat[k]+';'; }).join('\n')+'\n}'; }
  function genSCSS(){ return keys.map(function(k){ return '$'+k.replace(/\./g,'-')+': '+flat[k]+';'; }).join('\n'); }
  function genJS(){ var out={}; keys.forEach(function(k){ var p=k.split('.'); var o=out; p.forEach(function(part,i){ if(i===p.length-1) o[part]=flat[k]; else { o[part]=o[part]||{}; o=o[part]; } }); }); return 'export const tokens = '+JSON.stringify(out,null,2)+';'; }
  function genDTCG(){
    var out={}; keys.forEach(function(k){ var p=k.split('.'); var o=out; p.slice(0,-1).forEach(function(part){ o[part]=o[part]||{}; o=o[part]; }); var last=p[p.length-1]; o[last]={$value:flat[k],$type:'unknown'}; }); return JSON.stringify(out,null,2);
  }
  function genSwift(){ return 'import SwiftUI\n\nstruct HesemTokens {\n'+keys.map(function(k){ var name=k.split('.').map(function(p,i){return i===0?p:p[0].toUpperCase()+p.slice(1);}).join(''); return '  static let '+name+' = "'+flat[k]+'";'; }).join('\n')+'\n}'; }

  var formats = [
    {key:'css',  label:'CSS Custom Properties', btn:'CSS', gen:genCSS},
    {key:'scss', label:'SCSS Variables',         btn:'SCSS',gen:genSCSS},
    {key:'js',   label:'JavaScript/TypeScript',  btn:'JS/TS',gen:genJS},
    {key:'dtcg', label:'W3C DTCG JSON',          btn:'DTCG',gen:genDTCG},
    {key:'swift',label:'iOS Swift',              btn:'Swift',gen:genSwift},
  ];
  var activeExport = '_exportFmt_css';
  var btnBar = formats.map(function(f){
    return '<button onclick="_admTokenExportFormat(\''+f.key+'\')" id="export-btn-'+f.key+'" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:600;cursor:pointer;border:1px solid var(--border);background:var(--bg-surface);color:var(--text-primary)">'+f.btn+'</button>';
  }).join('');
  var copyBtn = '<button onclick="_admTokenExportCopy()" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:var(--brand-2);color:var(--text-inverse,#fff);margin-left:auto">📋 Copy</button>';
  var downloadBtn = '<button onclick="_admTokenExportDownload()" style="padding:5px 12px;border-radius:6px;font-size:12px;font-weight:700;cursor:pointer;border:none;background:var(--green);color:var(--text-inverse,#fff)">⬇ Download</button>';
  var preview = genCSS().slice(0,1800);
  return sect(L('Token Export Pipeline','Token Export Pipeline'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('Xuất tất cả '+keys.length+' design tokens ra nhiều định dạng: CSS, SCSS, JS/TS, W3C DTCG, iOS Swift.','Export all '+keys.length+' design tokens in multiple formats: CSS, SCSS, JS/TS, W3C DTCG, iOS Swift.')+'</div>'
    +'<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:10px">'+btnBar+copyBtn+downloadBtn+'</div>'
    +'<textarea id="adm-token-export-output" rows="14" readonly style="width:100%;padding:10px;border:1px solid var(--border);border-radius:6px;font-size:11px;font-family:var(--font-mono);background:var(--bg-surface-alt,var(--bg-hover));resize:vertical;box-sizing:border-box;color:var(--text-primary)">'+esc(preview)+'</textarea>',
    true, statusChip('full',keys.length+' tokens'));
}

window._admTokenExportFormat = function(fmt){
  var tm = typeof HmTheme!=='undefined'?HmTheme:null;
  var cfg = tm&&tm.getAdminConfig?tm.getAdminConfig()||{}:{};
  var flat = _flattenTokens(cfg);
  delete flat['moduleOverrides'];
  var keys = Object.keys(flat).filter(function(k){return flat[k]!==null&&flat[k]!==undefined&&typeof flat[k]!=='object';});
  var out = '';
  if(fmt==='css') out = ':root {\n'+keys.map(function(k){return '  '+_toCssVarName(k)+': '+flat[k]+';';}).join('\n')+'\n}';
  else if(fmt==='scss') out = keys.map(function(k){return '$'+k.replace(/\./g,'-')+': '+flat[k]+';';}).join('\n');
  else if(fmt==='js'){ var obj={}; keys.forEach(function(k){ var p=k.split('.'); var o=obj; p.forEach(function(part,i){if(i===p.length-1)o[part]=flat[k];else{o[part]=o[part]||{};o=o[part];}}); }); out='export const tokens = '+JSON.stringify(obj,null,2)+';'; }
  else if(fmt==='dtcg'){ var d={}; keys.forEach(function(k){ var p=k.split('.'); var o=d; p.slice(0,-1).forEach(function(part){o[part]=o[part]||{};o=o[part];}); o[p[p.length-1]]={$value:flat[k],$type:'unknown'}; }); out=JSON.stringify(d,null,2); }
  else if(fmt==='swift') out='import SwiftUI\n\nstruct HesemTokens {\n'+keys.map(function(k){var n=k.split('.').map(function(p,i){return i===0?p:p[0].toUpperCase()+p.slice(1);}).join('');return '  static let '+n+' = "'+flat[k]+'";';}).join('\n')+'\n}';
  var el = document.getElementById('adm-token-export-output');
  if(el) el.value = out;
  window._tokenExportLastOutput = out;
  window._tokenExportLastFmt = fmt;
};
window._admTokenExportCopy = function(){
  var el = document.getElementById('adm-token-export-output');
  if(!el) return;
  if(navigator.clipboard) navigator.clipboard.writeText(el.value);
  else { el.select(); document.execCommand('copy'); }
  if(typeof showToast==='function') showToast(L('Đã copy tokens vào clipboard.','Tokens copied to clipboard.'), 'success');
};
window._admTokenExportDownload = function(){
  var fmt = window._tokenExportLastFmt || 'css';
  var content = window._tokenExportLastOutput || (document.getElementById('adm-token-export-output')||{}).value || '';
  var exts = {css:'.css',scss:'.scss',js:'.ts',dtcg:'.json',swift:'.swift'};
  var a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([content],{type:'text/plain'}));
  a.download = 'hesem-design-tokens'+(exts[fmt]||'.txt'); a.click();
};

function renderHealthScorePanel(){
  var snap = graphicsSnapshot();
  var compliance = snap.compliance || [];
  var blockers = snap.releaseBlockers || [];
  var debt = snap.debtObservatory || {};
  var total = compliance.length || 1;
  var compliantN = compliance.filter(function(r){return r.linkageStatus==='full-admin-controlled'||r.linkageStatus==='full';}).length;
  var adoptionPct = Math.round(compliantN/total*100);
  var debtScore = debt.byModule ? Math.round(debt.byModule.reduce(function(s,m){return s+(m.debtScore||0);},0)/Math.max(debt.byModule.length,1)) : 50;
  var debtPct = Math.max(0, 100-debtScore);
  var blockersScore = blockers.length === 0 ? 100 : Math.max(0, 100-blockers.length*15);
  var overall = Math.round((adoptionPct*0.4)+(debtPct*0.35)+(blockersScore*0.25));
  function scoreColor(pct){ return pct>=80?'var(--green,#22c55e)':pct>=50?'var(--amber,#f59e0b)':'var(--red,#ef4444)'; }
  function bar(pct,label,detail){
    var c=scoreColor(pct);
    return '<div style="margin-bottom:12px">'
      +'<div style="display:flex;justify-content:space-between;margin-bottom:4px"><span style="font-size:12px;font-weight:600;color:var(--text-primary)">'+esc(label)+'</span><span style="font-size:12px;font-weight:700;color:'+c+'">'+pct+'%</span></div>'
      +'<div style="height:8px;border-radius:4px;background:var(--border,#e2e8f0);overflow:hidden;margin-bottom:3px"><div style="height:100%;width:'+pct+'%;background:'+c+';border-radius:4px;transition:width .4s"></div></div>'
      +'<div style="font-size:11px;color:var(--text-secondary)">'+esc(detail)+'</div>'
      +'</div>';
  }
  var grade = overall>=90?'A+':overall>=80?'A':overall>=70?'B':overall>=60?'C':overall>=50?'D':'F';
  return sect(L('Design System Health Score','Design System Health Score'),
    '<div style="display:grid;grid-template-columns:120px 1fr;gap:20px;align-items:start">'
    +'<div style="text-align:center;padding:20px;border:2px solid '+(scoreColor(overall))+';border-radius:16px">'
    +'<div style="font-size:48px;font-weight:900;color:'+(scoreColor(overall))+'">'+grade+'</div>'
    +'<div style="font-size:22px;font-weight:800;color:var(--text-primary)">'+overall+'</div>'
    +'<div style="font-size:11px;color:var(--text-secondary)">/ 100</div>'
    +'</div>'
    +'<div>'
    +bar(adoptionPct,L('Token Adoption','Token Adoption'), compliantN+'/'+total+L(' module tuân thủ',' modules compliant'))
    +bar(debtPct,L('Debt-free Score','Debt-free Score'), L('Debt score trung bình: ','Avg debt score: ')+debtScore)
    +bar(blockersScore,L('Release Readiness','Release Readiness'), blockers.length+L(' blocker đang mở',' open blockers'))
    +'</div></div>',
    true, statusChip(overall>=80?'full':overall>=50?'preview':'partial', 'Score: '+overall));
}

function renderSpacingScalePanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig?HmTheme.getAdminConfig()||{}:{};
  var scale = cfg.fontScale || {xs:'11px',sm:13,base:14,md:16,lg:18,xl:20,'2xl':24,'3xl':'32px'};
  var spacings = [2,4,6,8,10,12,14,16,18,20,24,28,32,40,48,56,64,80,96];
  var scaleRows = Object.keys(scale).map(function(k){
    var v = scale[k]; var px = typeof v==='number'?v:parseInt(v,10);
    return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:60px;font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">'+esc(k)+'</div>'
      +'<div style="width:50px;font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">'+esc(String(v))+'</div>'
      +'<div style="font-size:'+(px||14)+'px;color:var(--text-primary);font-weight:400;line-height:1.2">Aa Quick brown fox</div>'
      +'</div>';
  }).join('');
  var spaceRows = spacings.map(function(s){
    var pct = Math.min(100, s/96*100);
    return '<div style="display:flex;align-items:center;gap:10px;padding:4px 0">'
      +'<div style="width:50px;font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">'+s+'px</div>'
      +'<div style="height:20px;width:'+(pct)+'%;background:var(--brand-2,#1565c0);border-radius:3px;min-width:2px"></div>'
      +'</div>';
  }).join('');
  return sect(L('Spacing & Type Scale','Spacing & Type Scale'),
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:24px">'
    +'<div><div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">'+L('Font Scale','Font Scale')+'</div>'+scaleRows+'</div>'
    +'<div><div style="font-size:12px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">'+L('Spacing Scale (px)','Spacing Scale (px)')+'</div>'+spaceRows+'</div>'
    +'</div>',
    false, statusChip('full','type + spacing'));
}

function renderShadowCatalogPanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig?HmTheme.getAdminConfig()||{}:{};
  var eff = cfg.effects||{};
  var shadows = [
    {name:'xs',   val:eff.shadowXs||'0 1px 3px rgba(12,45,72,.04)', label:'Elevation 1 — subtle card'},
    {name:'sm',   val:'0 2px 6px rgba(15,23,42,.08)', label:'Elevation 2 — default card'},
    {name:'md',   val:'0 4px 12px rgba(15,23,42,.10)', label:'Elevation 3 — floating panel'},
    {name:'lg',   val:eff.shadowLg||'0 18px 40px rgba(15,23,42,.14),0 8px 20px rgba(15,23,42,.09)', label:'Elevation 4 — modal'},
    {name:'xl',   val:eff.shadowXl||'0 24px 60px rgba(12,45,72,.16),0 12px 28px rgba(12,45,72,.08)', label:'Elevation 5 — overlay'},
    {name:'focus',val:'0 0 0 3px rgba(21,101,192,0.20)', label:'Focus ring shadow'},
  ];
  var cards = shadows.map(function(s){
    return '<div style="padding:20px 16px;background:var(--bg-surface);border-radius:10px;box-shadow:'+esc(s.val)+';text-align:center">'
      +'<div style="font-size:12px;font-weight:700;color:var(--text-primary);margin-bottom:4px">shadow-'+esc(s.name)+'</div>'
      +'<div style="font-size:10px;color:var(--text-secondary)">'+esc(s.label)+'</div>'
      +'</div>';
  }).join('');
  return sect(L('Shadow & Elevation Catalog','Shadow & Elevation Catalog'),
    '<div style="background:var(--bg-page);padding:24px;border-radius:10px"><div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:24px">'+cards+'</div></div>',
    false, statusChip('full','6 levels'));
}

function renderMotionCatalogPanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig?HmTheme.getAdminConfig()||{}:{};
  var eff = cfg.effects||{};
  var curves = [
    {name:'easeOut',  val:eff.easingOut||'cubic-bezier(0,0,0.2,1)',        label:L('Ease Out — phần tử xuất hiện/trượt vào','Ease Out — elements enter/slide in')},
    {name:'easeInOut',val:eff.easingInOut||'cubic-bezier(0.4,0,0.2,1)',    label:L('Ease In-Out — chuyển đổi state','Ease In-Out — state transitions')},
    {name:'spring',   val:eff.easingSpring||'cubic-bezier(0.34,1.56,0.64,1)',label:L('Spring — nảy nhẹ, CTA emphasis','Spring — slight bounce, CTA emphasis')},
    {name:'sharp',    val:eff.easingSharp||'cubic-bezier(0.2,0,0,1)',      label:L('Sharp — đóng/thu nhỏ panel','Sharp — close/collapse panels')},
  ];
  var durations = [
    {name:'fast',  val:eff.motionFast||100,  label:L('Fast — micro interaction','Fast — micro interactions')},
    {name:'normal',val:eff.motionNormal||150,label:L('Normal — standard','Normal — standard transitions')},
    {name:'slow',  val:eff.motionSlow||250,  label:L('Slow — complex','Slow — complex transitions')},
    {name:'spring',val:eff.motionSpring||300,label:L('Spring — animated','Spring — animated emphasis')},
  ];
  var keyframeId = 'adm-motion-kf-'+Date.now();
  var kfStyle = '<style id="'+keyframeId+'">@keyframes admSlide{0%{transform:translateX(0)}50%{transform:translateX(60px)}100%{transform:translateX(0)}}</style>';
  var curveCards = curves.map(function(c){
    return '<div style="border:1px solid var(--border);border-radius:8px;padding:12px;background:var(--bg-surface)">'
      +'<div style="font-size:11px;font-weight:700;color:var(--text-primary);margin-bottom:2px">'+esc(c.name)+'</div>'
      +'<div style="font-size:10px;color:var(--text-secondary);margin-bottom:8px;font-family:var(--font-mono)">'+esc(c.val)+'</div>'
      +'<div style="font-size:10px;color:var(--text-tertiary);margin-bottom:10px">'+esc(c.label)+'</div>'
      +'<div style="height:32px;background:var(--bg-surface-alt,var(--bg-hover));border-radius:6px;overflow:hidden;position:relative">'
      +'<div style="position:absolute;top:8px;left:0;width:16px;height:16px;border-radius:50%;background:var(--brand-2,#1565c0);animation:admSlide 1.6s '+esc(c.val)+' infinite"></div>'
      +'</div>'
      +'</div>';
  }).join('');
  var durRows = durations.map(function(d){
    return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid var(--border)">'
      +'<div style="width:70px;font-size:12px;font-weight:600;color:var(--text-primary)">'+esc(d.name)+'</div>'
      +'<div style="width:55px;font-size:11px;font-family:var(--font-mono);color:var(--text-secondary)">'+d.val+'ms</div>'
      +'<div style="flex:1;height:6px;border-radius:3px;background:var(--border,#e2e8f0);overflow:hidden"><div style="height:100%;width:'+(Math.min(100,d.val/3))+'%;background:var(--brand-2,#1565c0);border-radius:3px"></div></div>'
      +'<div style="font-size:10px;color:var(--text-tertiary)">'+esc(d.label)+'</div>'
      +'</div>';
  }).join('');
  return sect(L('Motion & Easing Catalog','Motion & Easing Catalog'),
    kfStyle
    +'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px">'+curveCards+'</div>'
    +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">'+L('Duration scale','Duration scale')+'</div>'
    +durRows,
    false, statusChip('full','4 curves · 4 durations'));
}

function renderTypographySpecimenPanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig?HmTheme.getAdminConfig()||{}:{};
  var typo = cfg.typography||{}; var scale = cfg.fontScale||{};
  var sampleText = L('Thiết kế hệ thống sản xuất thế hệ kế tiếp. Nhanh, chính xác, có thể mở rộng.','Next-generation manufacturing system design. Fast, precise, scalable.');
  var roles = [
    {name:'Display',  family:typo.display&&typo.display.family||'', weight:typo.display&&typo.display.weight||700, size:scale['3xl']||'32px'},
    {name:'Heading',  family:typo.heading&&typo.heading.family||'', weight:typo.heading&&typo.heading.weight||600, size:scale['2xl']||'24px'},
    {name:'Body',     family:typo.body&&typo.body.family||'',     weight:typo.body&&typo.body.weight||400,   size:scale.base||14},
    {name:'Label',    family:typo.label&&typo.label.family||'',   weight:typo.label&&typo.label.weight||600,  size:scale.sm||13},
    {name:'Mono',     family:typo.mono&&typo.mono.family||'',     weight:400,                               size:scale.sm||13},
  ];
  var blocks = roles.map(function(r){
    var sz = typeof r.size==='number'?r.size+'px':String(r.size);
    return '<div style="padding:14px 0;border-bottom:1px solid var(--border)">'
      +'<div style="font-size:10px;font-weight:700;color:var(--text-tertiary);text-transform:uppercase;letter-spacing:.06em;margin-bottom:6px">'+esc(r.name)+' · '+esc(sz)+' · '+esc(String(r.weight))+'</div>'
      +'<div style="font-size:'+esc(sz)+';font-weight:'+r.weight+';font-family:'+esc(r.family||'inherit')+';color:var(--text-primary);line-height:1.3">'+esc(sampleText)+'</div>'
      +'<div style="font-size:10px;color:var(--text-tertiary);margin-top:4px;font-family:var(--font-mono)">'+esc(r.family||'system-ui')+'</div>'
      +'</div>';
  }).join('');
  var alphabet = '<div style="margin-top:14px;padding:12px;background:var(--bg-surface-alt,var(--bg-hover));border-radius:8px">'
    +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">Alphabet specimen</div>'
    +'<div style="font-size:14px;color:var(--text-primary);line-height:1.8">AaBbCcDdEeFfGgHhIiJjKkLlMmNnOoPpQqRrSsTtUuVvWwXxYyZz</div>'
    +'<div style="font-size:13px;color:var(--text-secondary);line-height:1.8">0123456789 !@#$%^&*()_+-=[]{}|;:,./? ÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬắặ</div>'
    +'</div>';
  return sect(L('Typography Specimen','Typography Specimen'), blocks+alphabet, false, statusChip('full','5 roles'));
}

function _hexToHsl(hex){
  var rgb = _hexToRgb(hex); if(!rgb) return null;
  var r=rgb.r/255,g=rgb.g/255,b=rgb.b/255;
  var max=Math.max(r,g,b),min=Math.min(r,g,b),h=0,s=0,l=(max+min)/2;
  if(max!==min){var d=max-min;s=l>.5?d/(2-max-min):d/(max+min);switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;case b:h=(r-g)/d+4;break;}h/=6;}
  return {h:Math.round(h*360),s:Math.round(s*100),l:Math.round(l*100)};
}
function _hslToHex(h,s,l){
  s/=100;l/=100;var a=s*Math.min(l,1-l);
  function f(n){var k=(n+h/30)%12;var c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');}
  return '#'+f(0)+f(8)+f(4);
}

function renderColorPalettePanel(){
  var cfg = typeof HmTheme!=='undefined'&&HmTheme.getAdminConfig?HmTheme.getAdminConfig()||{}:{};
  var br = cfg.brand||{}; var st = cfg.statusColors||{};
  var paletteSources = [
    {name:'Brand Primary', hex:br.primary||'#1565c0'},
    {name:'Brand Accent', hex:br.accent||'#f9a825'},
    {name:'Success', hex:st.success||'#16a34a'},
    {name:'Error', hex:st.error||'#dc2626'},
    {name:'Warning', hex:st.warning||'#d97706'},
    {name:'Info', hex:st.info||'#2563eb'},
  ];
  var steps = [95,90,80,70,60,50,40,30,20,10];
  var palettes = paletteSources.map(function(src){
    var hsl = _hexToHsl(src.hex); if(!hsl) return '';
    var swatches = steps.map(function(l,i){
      var hex = _hslToHex(hsl.h, hsl.s, l);
      var textColor = l>55?'#1e293b':'#ffffff';
      return '<div style="flex:1;min-width:0" title="'+esc(hex)+'">'
        +'<div style="height:44px;background:'+esc(hex)+';'+(i===0?'border-radius:6px 0 0 6px':'')+(i===steps.length-1?'border-radius:0 6px 6px 0':'')+'"></div>'
        +'<div style="font-size:9px;color:var(--text-tertiary);text-align:center;margin-top:3px;font-family:var(--font-mono)">'+(i*100+100)+'</div>'
        +'</div>';
    }).join('');
    return '<div style="margin-bottom:16px">'
      +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">'+esc(src.name)+' <span style="font-family:var(--font-mono);font-weight:400">'+esc(src.hex)+'</span></div>'
      +'<div style="display:flex;gap:2px">'+swatches+'</div>'
      +'</div>';
  }).join('');
  return sect(L('Color Tonal Palette Generator','Color Tonal Palette Generator'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('Tông màu tự động từ brand và status tokens. Mỗi step thay đổi lightness 10%.','Auto-generated tonal palettes from brand and status tokens. Each step shifts lightness by 10%.')+'</div>'
    +palettes,
    false, statusChip('preview','auto-generated'));
}

function renderTokenSemanticMapPanel(){
  var layers = [
    {name:L('Primitive Tokens','Primitive Tokens'), color:'#dbeafe', examples:['#1565c0','#22c55e','#f1f5f9','14px','600'], desc:L('Giá trị thô: hex, px, font-weight. Không dùng trực tiếp trong component.','Raw values: hex, px, font-weight. Never referenced directly in components.')},
    {name:L('Semantic Tokens','Semantic Tokens'),   color:'#dcfce7', examples:['--text-primary','--bg-surface','--border','--status-success','--brand-primary'], desc:L('Gán vai trò ngữ nghĩa. Component chỉ được phép tham chiếu semantic tokens.','Role-assigned tokens. Components must only reference semantic tokens.')},
    {name:L('Component Tokens','Component Tokens'), color:'#fef9c3', examples:['--hds-btn-py','--hds-table-cell-py','--hds-badge-fw','--hds-modal-radius','--hds-nav-height'], desc:L('Override per-component nếu cần tách biệt khỏi semantic. Dùng ít nhất có thể.','Per-component overrides when separation from semantic is needed. Use sparingly.')},
  ];
  var blocks = layers.map(function(l,i){
    return '<div style="flex:1;border-radius:10px;padding:16px;background:'+esc(l.color)+';border:2px solid color-mix(in srgb,var(--text-primary,#1e293b) 7%,transparent)">'
      +'<div style="font-size:12px;font-weight:800;color:var(--text-primary,#1e293b);margin-bottom:6px">'+(i+1)+'. '+esc(l.name)+'</div>'
      +'<div style="font-size:11px;color:var(--text-secondary,#374151);margin-bottom:10px;line-height:1.6">'+esc(l.desc)+'</div>'
      +'<div style="display:flex;flex-direction:column;gap:4px">'+l.examples.map(function(e){return '<code style="font-size:10px;background:color-mix(in srgb,var(--bg-surface,#fff) 70%,transparent);border-radius:4px;padding:2px 6px;color:var(--text-primary,#1e293b);display:inline-block">'+esc(e)+'</code>';}).join('')+'</div>'
      +'</div>';
  }).join('<div style="display:flex;align-items:center;padding:0 6px;font-size:20px;color:var(--text-tertiary,#94a3b8)">→</div>');
  return sect(L('Token Semantic Architecture','Token Semantic Architecture'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:14px">'+L('Ba lớp token: Primitive (giá trị thô) → Semantic (vai trò ngữ nghĩa) → Component (override cục bộ). Chỉ semantic và component được phép dùng trong stylesheet module.','Three-layer token architecture: Primitive (raw values) → Semantic (role-assigned) → Component (local overrides). Only semantic and component layers should appear in module stylesheets.')+'</div>'
    +'<div style="display:flex;gap:8px;align-items:stretch;flex-wrap:wrap">'+blocks+'</div>',
    false, statusChip('full','3-layer'));
}

function renderSideBySidePanel(){
  /* Read configured token values so the demo reflects the org's actual palette */
  var all  = HmTheme.getAll ? HmTheme.getAll() : {};
  var cl   = all.colorsLight      || {};
  var cd   = all.colorsDark       || {};
  var sc   = all.statusColors     || {};
  var scd  = all.statusColorsDark || {};
  var cc   = all.colors           || {};
  var btnBg = cc.brand2 || '#1565c0';

  var sampleHtml = function(mode){
    var isDark = mode==='dark';
    var bg   = isDark ? (cd.bgSurface    || '#1e293b') : (cl.bgSurface    || '#ffffff');
    var pg   = isDark ? (cd.bgPage       || '#0f172a') : (cl.bgPage       || '#f8fafc');
    var txt  = isDark ? (cd.textPrimary  || '#f1f5f9') : (cl.textPrimary  || '#1e293b');
    var txt2 = isDark ? (cd.textSecondary|| '#94a3b8') : (cl.textSecondary|| '#64748b');
    var bdr  = isDark ? (cd.border       || '#334155') : (cl.border       || '#e2e8f0');
    var okColor = isDark ? (scd.success || '#22c55e')  : (sc.success      || '#16a34a');
    var doneBg  = 'color-mix(in srgb,'+(isDark?(scd.success||'#22c55e'):(sc.success||'#16a34a'))+' 13%,'+(isDark?(cd.bgSurface||'#1e293b'):(cl.bgSurface||'#ffffff'))+')';
    var pendBg  = 'color-mix(in srgb,'+(isDark?(scd.warning||'#fbbf24'):(sc.warning||'#d97706'))+' 11%,'+(isDark?(cd.bgSurface||'#1e293b'):(cl.bgSurface||'#ffffff'))+')';
    var pendTxt = isDark ? (scd.warning||'#fbbf24') : (sc.warning||'#854d0e');
    var ovdBg   = 'color-mix(in srgb,'+(isDark?(scd.error||'#f87171'):(sc.error||'#dc2626'))+' 11%,'+(isDark?(cd.bgSurface||'#1e293b'):(cl.bgSurface||'#ffffff'))+')';
    var ovdTxt  = isDark ? (scd.error||'#f87171')   : (sc.error  ||'#991b1b');
    return '<div style="background:'+pg+';padding:12px;border-radius:8px;font-family:-apple-system,sans-serif">'
      +'<div style="background:'+bg+';border:1px solid '+bdr+';border-radius:8px;padding:14px;margin-bottom:10px">'
      +'<div style="font-size:13px;font-weight:700;color:'+txt+';margin-bottom:4px">'+L('Bảng điều khiển','Dashboard')+'</div>'
      +'<div style="font-size:11px;color:'+txt2+';margin-bottom:10px">'+L('Chào mừng, Giám đốc điều hành.','Welcome, General Director.')+'</div>'
      +'<div style="display:flex;gap:6px;flex-wrap:wrap">'
      +'<div style="flex:1;min-width:80px;border:1px solid '+bdr+';border-radius:6px;padding:8px;background:'+bg+'">'
      +'<div style="font-size:10px;color:'+txt2+'">NCR</div><div style="font-size:18px;font-weight:800;color:'+txt+'">24</div></div>'
      +'<div style="flex:1;min-width:80px;border:1px solid '+bdr+';border-radius:6px;padding:8px;background:'+bg+'">'
      +'<div style="font-size:10px;color:'+txt2+'">CAPA</div><div style="font-size:18px;font-weight:800;color:'+txt+'">8</div></div>'
      +'<div style="flex:1;min-width:80px;border:1px solid '+bdr+';border-radius:6px;padding:8px;background:'+bg+'">'
      +'<div style="font-size:10px;color:'+txt2+'">Audit</div><div style="font-size:18px;font-weight:800;color:'+okColor+'">OK</div></div>'
      +'</div>'
      +'<div style="margin-top:10px;display:flex;gap:6px">'
      +'<button style="padding:5px 12px;border-radius:5px;font-size:11px;font-weight:700;background:'+btnBg+';color:'+bg+';border:none">'+L('Tạo NCR','Create NCR')+'</button>'
      +'<button style="padding:5px 12px;border-radius:5px;font-size:11px;font-weight:600;background:transparent;color:'+txt+';border:1px solid '+bdr+'">'+L('Xuất','Export')+'</button>'
      +'</div>'
      +'</div>'
      +'<div style="display:flex;gap:6px">'
      +'<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+doneBg+';color:'+okColor+'">Done</span>'
      +'<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+pendBg+';color:'+pendTxt+'">Pending</span>'
      +'<span style="padding:2px 8px;border-radius:4px;font-size:10px;font-weight:700;background:'+ovdBg+';color:'+ovdTxt+'">Overdue</span></div>'
      +'</div>';
  };
  return sect(L('Light / Dark Comparison','Light / Dark Comparison'),
    '<div style="font-size:12px;color:var(--text-secondary);margin-bottom:12px">'+L('So sánh giao diện Light và Dark mode đồng thời với cùng một layout mẫu.','Compare Light and Dark mode simultaneously with the same sample layout.')+'</div>'
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px">'
    +'<div><div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">☀ Light mode</div>'+sampleHtml('light')+'</div>'
    +'<div><div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:6px">🌙 Dark mode</div>'+sampleHtml('dark')+'</div>'
    +'</div>',
    false, statusChip('preview','side-by-side'));
}

function renderBreakpointPreviewPanel(){
  var bp = [
    {name:'Mobile', w:375, scale:0.38, label:'375px'},
    {name:'Tablet', w:768, scale:0.38, label:'768px'},
    {name:'Desktop',w:1280,scale:0.38, label:'1280px'},
  ];
  var cards = bp.map(function(b){
    var scaledW = Math.round(b.w*b.scale);
    var scaledH = Math.round(b.w*b.scale*0.65);
    var inner = '<div style="width:'+b.w+'px;height:'+Math.round(b.w*0.65)+'px;transform:scale('+b.scale+');transform-origin:top left;background:#f8fafc;border-radius:8px;overflow:hidden">'
      +'<div style="height:40px;background:#0c2d48;display:flex;align-items:center;padding:0 16px"><div style="color:#fff;font-size:14px;font-weight:700">HESEM MOM</div></div>'
      +'<div style="display:flex;height:calc(100% - 40px)">'
      +(b.w>=768?'<div style="width:200px;background:#0a1e32;height:100%"></div>':'')
      +'<div style="flex:1;padding:16px;background:#f8fafc"><div style="height:16px;background:#e2e8f0;border-radius:4px;margin-bottom:8px"></div><div style="height:12px;background:#e2e8f0;border-radius:4px;width:80%;margin-bottom:8px"></div>'
      +'<div style="display:flex;gap:8px;margin-bottom:10px">'
      +'<div style="height:60px;flex:1;background:#fff;border-radius:6px;border:1px solid #e2e8f0"></div>'
      +'<div style="height:60px;flex:1;background:#fff;border-radius:6px;border:1px solid #e2e8f0"></div>'
      +(b.w>=768?'<div style="height:60px;flex:1;background:#fff;border-radius:6px;border:1px solid #e2e8f0"></div>':'')
      +'</div><div style="height:80px;background:#fff;border-radius:6px;border:1px solid #e2e8f0"></div>'
      +'</div></div></div>';
    return '<div style="text-align:center">'
      +'<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">'+esc(b.name)+' ('+esc(b.label)+')</div>'
      +'<div style="width:'+scaledW+'px;height:'+scaledH+'px;overflow:hidden;border:1px solid var(--border);border-radius:6px;display:inline-block">'+inner+'</div>'
      +'</div>';
  }).join('');
  return sect(L('Responsive Layout Preview','Responsive Layout Preview'),
    '<div style="display:flex;gap:20px;flex-wrap:wrap;justify-content:center;padding:16px;background:var(--bg-page);border-radius:10px">'+cards+'</div>',
    false, statusChip('preview','3 breakpoints'));
}

function renderCssCoveragePanel(){
  var snap = graphicsSnapshot();
  var diag = snap.runtimeDiagnostics || {};
  var sharedTokens = diag.sharedTokensActive || 0;
  var hmConsumers = diag.hmConsumers || 0;
  var privateShells = diag.privateShells || 0;
  var inlineStyles = diag.inlineStyles || 0;
  var compliance = snap.compliance || [];
  var adoptionPct = compliance.length ? Math.round(compliance.filter(function(r){return r.consumesSharedTokens;}).length/compliance.length*100) : 0;
  var hmPct = compliance.length ? Math.round(compliance.filter(function(r){return r.consumesHmComponents;}).length/compliance.length*100) : 0;
  function statCard(label, value, sub, mode){
    return infoCard(label, String(value)+(sub?' '+sub:''), mode||'neutral');
  }
  return sect(L('CSS Token Coverage','CSS Token Coverage'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;margin-bottom:14px">'
    +statCard(L('Shared tokens active','Shared tokens active'), sharedTokens, L('CSS vars','CSS vars'), sharedTokens>4?'full':'partial')
    +statCard(L('hm-* consumers','hm-* consumers'), hmConsumers, L('elements','elements'), hmConsumers>10?'full':'preview')
    +statCard(L('Private CSS shells','Private CSS shells'), privateShells, L('elements','elements'), privateShells>0?'partial':'full')
    +statCard(L('Inline styles','Inline styles'), inlineStyles, L('elements','elements'), inlineStyles>50?'partial':'full')
    +statCard(L('Token adoption','Token adoption'), adoptionPct+'%', L('modules','modules'), adoptionPct>70?'full':'partial')
    +statCard(L('hm-* adoption','hm-* adoption'), hmPct+'%', L('modules','modules'), hmPct>70?'full':'partial')
    +'</div>'
    +'<div style="font-size:11px;color:var(--text-secondary);line-height:1.7">'+L('Dữ liệu runtime — được thu thập khi trang được render. Refresh trang để cập nhật số liệu mới nhất.','Runtime data — collected when page was rendered. Refresh to get latest metrics.')+'</div>',
    false, statusChip(adoptionPct>70?'full':'partial', adoptionPct+'% adoption'));
}

function renderAnalytics(){
  var h = sectionLead(L('Xuất & Phân tích hệ thống','Export & System Analytics'),
    L('Xuất token ra đa định dạng, phân tích sức khỏe design system, xem scale trực quan và so sánh light/dark mode.','Export tokens in multiple formats, analyze design system health, visualize scales, and compare light/dark modes.'),
    statusChip('admin','Token Export')+statusChip('full','Health Score'));
  h += renderHealthScorePanel();
  h += renderTokenExportPanel();
  h += renderTypographySpecimenPanel();
  h += renderColorPalettePanel();
  h += renderSpacingScalePanel();
  h += renderShadowCatalogPanel();
  h += renderMotionCatalogPanel();
  h += renderTokenSemanticMapPanel();
  h += renderSideBySidePanel();
  h += renderBreakpointPreviewPanel();
  h += renderCssCoveragePanel();
  return h;
}

/* ── RENDER MAIN ────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */

function render(el, subTab, currentLang){
  ensureGraphicsRefresh();
  _subTab = normalizeSubTab(subTab || _subTab);

  var tabs = [
    {key:'templates',    icon:'📐', label:T('templates')},
    {key:'tokens',       icon:'🎨', label:T('tokens')},
    {key:'components',   icon:'🧱', label:T('components')},
    {key:'effects',      icon:'✨', label:T('effects')},
    {key:'accessibility',icon:'♿', label:L('Trợ năng','Accessibility')},
    {key:'analytics',    icon:'📊', label:L('Xuất & Phân tích','Export & Analytics')},
    {key:'governance',   icon:'🛡️', label:T('governance')},
    {key:'advanced',     icon:'🧩', label:T('advanced')},
    {key:'standard',     icon:'📖', label:L('Chuẩn thiết kế','Design Standard')}
  ];

  var h = '<div style="max-width:min(100%,1120px);margin:0 auto">';

  /* Title */
	  h += '<div class="hm-page-header" style="align-items:flex-start;margin-bottom:16px">';
	  h += '<div style="width:100%"><h3 class="hm-page-title" style="margin:0;font-size:18px">'+esc(L('Mặt phẳng điều khiển đồ họa', 'Graphics Control Plane'))+'</h3>';
	  h += '<div style="margin-top:6px;padding:5px 10px;background:var(--bg-surface-alt,var(--bg-hover));border:1px solid var(--border);border-radius:6px;font-size:11px;color:var(--text-secondary)">'+esc(L('Authority: Standard 36 + lớp token dùng chung/Admin. Cache template tại máy chỉ để xem trước hoặc lưu nháp.', 'Authority: Standard 36 + admin/shared token layer. Local template cache is preview/draft only.'))+'</div></div>';
	  h += '</div>';
	  h += '<div id="adm-graphics-live" role="status" aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;padding:0;margin:-1px;overflow:hidden;clip:rect(0,0,0,0);white-space:nowrap;border:0">'+esc(_graphicsLiveMessage)+'</div>';

	  /* Sub-tab bar */
  h += '<div class="hm-tabs" role="tablist" aria-label="'+esc(L('Admin Appearance sections', 'Admin Appearance sections'))+'" onkeydown="_admAppearanceTabKeydown(event)" style="margin-bottom:16px">';
  tabs.forEach(function(t){
    var active = _subTab===t.key;
    h += '<button type="button" id="adm-appearance-tab-'+t.key+'" role="tab" aria-controls="adm-appearance-panel-'+t.key+'" aria-selected="'+(active?'true':'false')+'" tabindex="'+(active?'0':'-1')+'" class="hm-tab'+(active?' active':'')+'" onclick="_admAppearanceSetTab(\''+t.key+'\')"><span class="hm-tab-icon">'+t.icon+'</span><span class="hm-tab-label">'+esc(t.label)+'</span></button>';
  });
  h += '</div>';

  /* Sub-tab content: keep stable panels so aria-controls always resolves. */
  var bodies = {
    templates:    renderTemplates(),
    tokens:       renderTokens(),
    components:   renderComponents(),
    effects:      renderEffects(),
    accessibility:renderAccessibility(),
    analytics:    renderAnalytics(),
    governance:   renderGovernance(),
    advanced:     renderAdvanced(),
    standard:     renderStandard()
  };
  tabs.forEach(function(t){
    var active = _subTab === t.key;
    h += '<div id="adm-appearance-panel-'+t.key+'" role="tabpanel" aria-labelledby="adm-appearance-tab-'+t.key+'" tabindex="'+(active?'0':'-1')+'"'+(active?'':' hidden aria-hidden="true"')+'>'+bodies[t.key]+'</div>';
  });

  /* Global actions */
  var _hasDirty = typeof HmTheme !== 'undefined' && HmTheme.hasPreviewOverrides && HmTheme.hasPreviewOverrides();
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">';
  h += '<button class="hm-btn hm-btn-primary" onclick="_saveAllAppearance()">'+T('saveOrg')+'</button>';
  h += '<button class="hm-btn hm-btn-secondary" onclick="_admAppearanceClearDirty();HmTheme.reset();renderAdminAppearance()">'+T('reset')+'</button>';
  h += '<div id="adm-appearance-dirty-notice" style="display:'+(_hasDirty?'':'none')+';font-size:12px;font-weight:600;color:var(--brand-2);padding:5px 10px;border-radius:6px;background:color-mix(in srgb,var(--brand-2) 8%,var(--bg-surface));border:1px solid color-mix(in srgb,var(--brand-2) 20%,transparent)">⚠ '+L('Có thay đổi xem trước chưa lưu','Unsaved preview changes')+'</div>';
  h += '</div>';

  h += '</div>';
  el.innerHTML = h;
}

/* ── Dirty-state helpers ─────────────────────────────────────────────────── */
window._admAppearanceClearDirty = function(){
  var el = document.getElementById('adm-appearance-dirty-notice');
  if(el) el.style.display = 'none';
};

/* ── Save all ────────────────────────────────────────────────────────────── */
window._saveAllAppearance = function(){
  var cfg = HmTheme.getAdminConfigDraft ? HmTheme.getAdminConfigDraft() : HmTheme.getFullConfig();
  announceGraphics(L('Đang lưu admin draft qua backend authority; unsaved preview chỉ được promote khi backend chấp nhận.', 'Saving admin draft through backend authority; unsaved preview is promoted only if backend accepts it.'));
  HmTheme.saveAdminConfig(cfg, function(ok){
    announceGraphics(ok ? L('Admin draft đã lưu qua backend authority.', 'Admin draft saved through backend authority.') : L('Lưu admin draft thất bại; authority không đổi.', 'Admin draft save failed; authority unchanged.'));
    if(typeof showToast==='function') showToast(T(ok?'saved':'error'), ok?'success':'error');
    if(ok) window._admAppearanceClearDirty();
  });
};

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 1: OVERVIEW ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderOverview(){
  var cur = HmTheme.getAll();
  var h = '';

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px">'
    + infoCard(
      L('Áp dụng hệ thống', 'System-wide coverage'),
      L('Màu sắc, typography, density, motion và các token core như button, input, badge, tab, table, modal, tooltip, dropdown, nav, pagination, progress, empty, field, breadcrumb đang có mapping runtime và consumer rõ trong portal.', 'Colors, typography, density, motion, and core tokens such as button, input, badge, tab, table, modal, tooltip, dropdown, nav, pagination, progress, empty, field, and breadcrumb currently have runtime mapping plus visible consumers in the portal.'),
      'full'
    )
    + infoCard(
      L('Áp dụng một phần', 'Partial coverage'),
      L('Layout dimensions hiện tác động tốt tới sidebar, header, modal; riêng content max-width mới được kiểm soát trong preview/admin shell vì portal vẫn còn nhiều module max-width riêng.', 'Layout dimensions already affect sidebar, header, and modal sizing well; content max-width is still limited to preview/admin shell coverage because many portal modules keep their own max-width rules.'),
      'partial'
    )
    + infoCard(
      L('Preview / cần adoption', 'Preview / needs adoption'),
      L('Card header, flow, ISO box, ISO note và KPI icon đã có token, preview và runtime var, nhưng cần module dùng hm-* / selector chung để hệ thống tuân đồng đều hơn.', 'Card header, flow, ISO box, ISO note, and KPI icon already have tokens, previews, and runtime vars, but modules still need shared hm-* / selector adoption before the system becomes uniformly compliant.'),
      'preview'
    )
    + '</div>';

  /* Quick sizing for tabs instead of density presets */
  h += sect(T('presets')+' — '+T('overview'),
    '<div style="margin-bottom:12px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('tabSettings')+' sizing</strong><div style="margin-top:6px;font-size:11px;line-height:1.5;color:var(--text-tertiary)">Áp dụng cho hàng tab admin và các tab dùng token chung. Nút Small / Default / Large bên dưới là preview của button, không phải tab.</div></div>'
    + slider(T('paddingY'), '--hds-tab-py', 'components.tab.paddingY', 0, 20, 8, 'px')
    + slider(T('paddingX'), '--hds-tab-px', 'components.tab.paddingX', 0, 32, 16, 'px')
    + slider(T('fontSize'), '--hds-tab-font', 'components.tab.fontSize', 8, 18, 11, 'px')
    + slider('Border radius', '--tab-radius', 'components.tab.radius', 0, 28, 14, 'px')
    + '<div class="hm-appearance-preview" data-preview-title="Preview tab admin" style="margin-top:14px;padding:12px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface-alt,var(--bg-hover))">'
    +   '<div style="font-size:11px;font-weight:700;color:var(--text-secondary);margin-bottom:10px">Preview tab admin</div>'
    +   '<div class="admin-tabs-v2" style="margin-bottom:0">'
    +     '<button type="button" class="admin-tab-v2"><span class="admin-tab-icon">👥</span><span class="admin-tab-label">Người dùng</span><span class="tab-badge">20</span></button>'
    +     '<button type="button" class="admin-tab-v2 active"><span class="admin-tab-icon">🎨</span><span class="admin-tab-label">Giao diện</span></button>'
    +     '<button type="button" class="admin-tab-v2"><span class="admin-tab-icon">🧭</span><span class="admin-tab-label">Hiển thị portal</span></button>'
    +   '</div>'
    +   '<style>@keyframes hmOverviewPulse{0%{transform:translateX(0)}100%{transform:translateX(16px)}}</style>'
    +   '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-top:12px">'
    +     '<div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)">'
    +       '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Radius mirror</div>'
    +       '<div style="display:flex;gap:8px;align-items:flex-end;flex-wrap:wrap">'
    +         '<div style="width:52px;height:28px;border:1px solid var(--border);border-radius:var(--radius-sm);background:var(--bg-surface-alt)"></div>'
    +         '<div style="width:52px;height:36px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt)"></div>'
    +         '<div style="width:52px;height:44px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface-alt)"></div>'
    +       '</div>'
    +     '</div>'
    +     '<div style="padding:12px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)">'
    +       '<div style="font-size:10px;font-weight:700;color:var(--text-secondary);margin-bottom:8px">Motion mirror</div>'
    +       '<div style="display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px">'
    +         '<div style="padding:8px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt)"><div style="width:18px;height:18px;border-radius:999px;background:var(--brand-2);animation:hmOverviewPulse var(--transition-fast) ease-in-out infinite alternate"></div></div>'
    +         '<div style="padding:8px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt)"><div style="width:18px;height:18px;border-radius:999px;background:var(--green);animation:hmOverviewPulse var(--transition-normal) ease-in-out infinite alternate"></div></div>'
    +         '<div style="padding:8px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt)"><div style="width:18px;height:18px;border-radius:999px;background:var(--amber);animation:hmOverviewPulse var(--transition-slow) ease-in-out infinite alternate"></div></div>'
    +       '</div>'
    +     '</div>'
    +   '</div>'
    + '</div>'
    + '<div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('colors')+'</strong></div>'
    + radioRow('adm_colorMode', [
      {value:'light',icon:'☀️',label:T('light')},
      {value:'dark',icon:'🌙',label:T('dark')},
      {value:'auto',icon:'💻',label:T('auto')},
      {value:'schedule',icon:'🕐',label:T('schedule')}
    ], cur.colorMode, "HmTheme.set('colorMode',this.value);renderAdminAppearance()")
    + (cur.colorMode==='schedule' ? '<div style="display:flex;gap:8px;align-items:center;margin-top:8px"><span style="font-size:12px">'+T('darkFrom')+'</span>'
      +'<input type="time" value="'+(cfg('colorSchedule.darkFrom')||'18:00')+'" onchange="_hmSet(null,\'colorSchedule.darkFrom\',this.value)" style="height:28px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
      +'<span style="font-size:12px">'+T('darkTo')+'</span>'
      +'<input type="time" value="'+(cfg('colorSchedule.darkTo')||'06:00')+'" onchange="_hmSet(null,\'colorSchedule.darkTo\',this.value)" style="height:28px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
      +'</div>' : '')
    + '<div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('radiusScale')+'</strong></div>'
    + radioRow('adm_radius', [
      {value:'sharp',icon:'◻️',label:T('sharp')},
      {value:'rounded',icon:'◼️',label:T('rounded')},
      {value:'pill',icon:'💊',label:T('pill')},
      {value:'custom',icon:'✏️',label:T('custom')}
    ], cur.radius, "HmTheme.set('radius',this.value);renderAdminAppearance()")
    + '<div style="margin-top:12px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('motion')+'</strong></div>'
    + radioRow('adm_motion', [
      {value:'normal',icon:'✨',label:T('normal')},
      {value:'reduced',icon:'🐢',label:T('reduced')},
      {value:'off',icon:'⏹️',label:T('off')},
      {value:'custom',icon:'✏️',label:T('custom')}
    ], cur.motion, "HmTheme.set('motion',this.value);renderAdminAppearance()")
  , true, statusChip('admin', L('UI admin đã dùng token tab chung', 'Admin UI now consumes shared tab tokens')) + statusChip('full', L('Áp dụng tức thời', 'Live runtime apply')));

  /* Live preview */
  h += sect('👁 '+T('livePreview'),
    '<div style="display:flex;flex-wrap:wrap;gap:10px;align-items:flex-start">'
    +'<button class="hm-btn hm-btn-sm hm-btn-primary">Small</button>'
    +'<button class="hm-btn hm-btn-primary">Default</button>'
    +'<button class="hm-btn hm-btn-lg hm-btn-primary">Large</button>'
    +'<button class="hm-btn hm-btn-secondary">Secondary</button>'
    +'<button class="hm-btn hm-btn-ghost">Ghost</button>'
    +'<button class="hm-btn hm-btn-danger">Danger</button>'
    +'</div>'
    +'<div style="display:flex;gap:10px;margin-top:12px;flex-wrap:wrap">'
    +'<input class="hm-input" placeholder="Input field..." style="max-width:200px">'
    +'<select class="hm-input hm-select" style="max-width:160px"><option>Select option</option></select>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="checkbox" checked> Checkbox</label>'
    +'<label style="display:flex;align-items:center;gap:6px;font-size:12px"><input type="radio" name="preview_r" checked> Radio</label>'
    +'</div>'
    +'<div style="display:flex;gap:6px;margin-top:12px;flex-wrap:wrap">'
    +'<span class="hm-badge" style="background:var(--green-bg);color:var(--green)">Success</span>'
    +'<span class="hm-badge" style="background:var(--red-bg);color:var(--red)">Error</span>'
    +'<span class="hm-badge" style="background:var(--amber-bg);color:var(--amber)">Warning</span>'
    +'<span class="hm-badge" style="background:var(--blue-bg);color:var(--blue)">Info</span>'
    +'<span class="hm-badge" style="background:var(--purple-bg);color:var(--purple)">Review</span>'
    +'<span class="hm-badge" style="background:var(--cyan-bg);color:var(--cyan)">Planned</span>'
    +'</div>'
    +'<div style="margin-top:12px;display:flex;gap:10px">'
    +'<div class="hm-kpi-card" style="flex:1;min-width:120px;border:1px solid var(--border);text-align:center">'
    +'<div class="hm-kpi-value" style="color:var(--brand-2)">42</div><div class="hm-kpi-label">KPI LABEL</div></div>'
    +'<div class="hm-kpi-card" style="flex:1;min-width:120px;border:1px solid var(--border);text-align:center">'
    +'<div class="hm-kpi-value" style="color:var(--green)">98%</div><div class="hm-kpi-label">PASS RATE</div></div>'
    +'</div>'
    +'<div style="margin-top:12px"><div class="hm-progress" style="width:100%"><div class="hm-progress-fill hm-progress-blue" style="width:68%"></div></div></div>'
  , true, statusChip('full', L('Khối preview tổng hợp', 'Combined preview block')));

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 2: TYPOGRAPHY ──────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderTypography(){
  var h = '';

  h += sect('📝 '+T('fontFamily'),
    fontSelect(T('display'), '--font-display', 'typography.display.family', "-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif")
    + slider(T('display')+' '+T('fontWeight'), '--font-display-weight', 'typography.display.weight', 100, 900, 700, '', 100)
    + fontSelect(T('heading'), '--font-heading', 'typography.heading.family', "-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif")
    + slider(T('heading')+' '+T('fontWeight'), '--font-heading-weight', 'typography.heading.weight', 100, 900, 600, '', 100)
    + fontSelect(T('body'), '--font-body', 'typography.body.family', "-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif")
    + slider(T('body')+' '+T('fontWeight'), '--font-body-weight', 'typography.body.weight', 100, 900, 400, '', 100)
    + fontSelect(T('label'), '--font-label', 'typography.label.family', "-apple-system, 'Segoe UI', 'Noto Sans', Arial, Helvetica, sans-serif")
    + slider(T('label')+' '+T('fontWeight'), '--font-label-weight', 'typography.label.weight', 100, 900, 600, '', 100)
    + fontSelect(T('mono'), '--font-mono', 'typography.mono.family', "'JetBrains Mono', 'Fira Code', monospace", true)
    + previewTypographyFamily()
  , true);

  h += sect('📏 '+T('fontSize'),
    slider('Caption / Badge (--text-xs)', '--text-xs', 'fontScale.xs', 8, 14, 11, 'px')
    + slider('Body nhỏ (--text-sm)', '--text-sm', 'fontScale.sm', 10, 16, 13, 'px')
    + slider('Văn bản chính (--text-base)', '--text-base', 'fontScale.base', 12, 18, 14, 'px')
    + slider('Section title (--text-md)', '--text-md', 'fontScale.md', 14, 20, 16, 'px')
    + slider('Card title (--text-lg)', '--text-lg', 'fontScale.lg', 16, 24, 18, 'px')
    + slider('Page heading (--text-xl)', '--text-xl', 'fontScale.xl', 18, 28, 20, 'px')
    + slider('KPI value (--text-2xl)', '--text-2xl', 'fontScale.2xl', 20, 36, 24, 'px')
    + slider('Hero number (--text-3xl)', '--text-3xl', 'fontScale.3xl', 24, 48, 32, 'px')
    + previewFontScale()
  , true);

  h += sect('↕️ '+T('lineHeight'),
    slider('Tight', '--leading-tight', 'lineHeight.tight', 1.0, 1.5, 1.25, '', 0.05)
    + slider('Normal', '--leading-normal', 'lineHeight.normal', 1.2, 1.8, 1.5, '', 0.05)
    + slider('Relaxed', '--leading-relaxed', 'lineHeight.relaxed', 1.4, 2.2, 1.75, '', 0.05)
    + previewLineHeight()
  , false);

  h += sect('🏷️ '+T('letterSpacing')+' & '+T('textTransform'),
    slider(T('letterSpacing'), '--label-letter-spacing', 'typography.label.spacing', 0, 0.2, 0.05, 'em', 0.01)
    + '<div style="margin-top:8px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('textTransform')+'</strong></div>'
    + radioRow('adm_label_transform', [
      {value:'none',label:T('none')},
      {value:'uppercase',label:T('uppercase')},
      {value:'capitalize',label:T('capitalize')}
    ], cfg('typography.label.transform')||'uppercase', "_hmSet('--label-transform','typography.label.transform',this.value)")
    + previewLabelTransform()
  , false);

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 3: COLORS ──────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderColors(){
  var h = '';
  var ac = HmTheme.getAdminConfig();

  h += sect('🏢 '+T('brand'),
    colorPick('Primary', '--brand-2', 'brand.primary', '#1565c0')
    + colorPick('Light', '--brand-light', 'brand.light', '#1e88e5')
    + colorPick('Dark', '--brand', 'brand.dark', '#0c2d48')
    + colorPick('Darkest', '--brand-dark', 'brand.darkest', '#0a1e32')
    + colorPick('Accent', '--accent', 'brand.accent', '#f9a825')
    + colorPick('Accent Light', '--accent-light', 'brand.accentLight', '#fdd835')
    + colorPick('Sidebar', '--bg-sidebar-light', 'brand.sidebarBg', '#0c2d48')
    + previewBrandColors()
  , true);

  h += sect('🚦 '+T('status')+' (Light + Dark)',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +'<div><strong style="font-size:11px;color:var(--text-secondary)">LIGHT</strong>'
    + colorPick('Success', '--green-light', 'statusColors.success', '#16a34a')
    + colorPick('Error', '--red-light', 'statusColors.error', '#dc2626')
    + colorPick('Warning', '--amber-light', 'statusColors.warning', '#d97706')
    + colorPick('Info', '--blue-light', 'statusColors.info', '#2563eb')
    + colorPick('Purple', '--purple-light', 'statusColors.purple', '#7c3aed')
    + colorPick('Cyan', '--cyan-light', 'statusColors.cyan', '#0891b2')
    +'</div><div><strong style="font-size:11px;color:var(--text-secondary)">DARK</strong>'
    + colorPick('Success', '--green-dark', 'statusColorsDark.success', '#22c55e')
    + colorPick('Error', '--red-dark', 'statusColorsDark.error', '#f87171')
    + colorPick('Warning', '--amber-dark', 'statusColorsDark.warning', '#fbbf24')
    + colorPick('Info', '--blue-dark', 'statusColorsDark.info', '#60a5fa')
    + colorPick('Purple', '--purple-dark', 'statusColorsDark.purple', '#a78bfa')
    + colorPick('Cyan', '--cyan-dark', 'statusColorsDark.cyan', '#22d3ee')
    +'</div></div>'
    + previewStatusColors()
  , false);

  h += sect('☀️ '+T('surfacesLight'),
    colorPick('Page BG', '--bg-page-light', 'colorsLight.bgPage', '#f8fafc')
    + colorPick('Surface', '--bg-surface-light', 'colorsLight.bgSurface', '#ffffff')
    + colorPick('Surface Alt', '--bg-surface-alt-light', 'colorsLight.bgSurfaceAlt', '#f1f5f9')
    + colorPick('Header', '--bg-header-light', 'colorsLight.bgHeader', '#ffffff')
    + colorPick('Modal', '--bg-modal-light', 'colorsLight.bgModal', '#ffffff')
    + colorPick('Hover', '--bg-hover-light', 'colorsLight.bgHover', '#f8fafc')
    + previewSurfaceStack('light')
  , false);

  h += sect('🌙 '+T('surfacesDark'),
    colorPick('Page BG Dark', '--bg-page-dark', 'colorsDark.bgPage', '#0f172a')
    + colorPick('Surface Dark', '--bg-surface-dark', 'colorsDark.bgSurface', '#1e293b')
    + colorPick('Surface Alt Dark', '--bg-surface-alt-dark', 'colorsDark.bgSurfaceAlt', '#162032')
    + colorPick('Header Dark', '--bg-header-dark', 'colorsDark.bgHeader', '#1e293b')
    + colorPick('Modal Dark', '--bg-modal-dark', 'colorsDark.bgModal', '#1e293b')
    + colorPick('Hover Dark', '--bg-hover-dark', 'colorsDark.bgHover', '#263348')
    + colorPick('Sidebar Dark', '--bg-sidebar-dark', 'colorsDark.sidebarBg', '#0a1628')
    + previewSurfaceStack('dark')
  , false);

  h += sect('📝 '+T('textLight'),
    colorPick('Primary', '--text-primary-light', 'colorsLight.textPrimary', '#1e293b')
    + colorPick('Secondary', '--text-secondary-light', 'colorsLight.textSecondary', '#64748b')
    + colorPick('Muted', '--text-tertiary-light', 'colorsLight.textTertiary', '#94a3b8')
    + colorPick('Link', '--text-link-light', 'colorsLight.textLink', '#1565c0')
    + colorPick('Inverse', '--text-inverse-light', 'colorsLight.textInverse', '#ffffff')
    + previewTextColors('light')
  , false);

  h += sect('📝 '+T('textDark'),
    colorPick('Primary Dark', '--text-primary-dark', 'colorsDark.textPrimary', '#f1f5f9')
    + colorPick('Secondary Dark', '--text-secondary-dark', 'colorsDark.textSecondary', '#94a3b8')
    + colorPick('Muted Dark', '--text-tertiary-dark', 'colorsDark.textTertiary', '#64748b')
    + colorPick('Inverse Dark', '--text-inverse-dark', 'colorsDark.textInverse', '#0f172a')
    + colorPick('Link Dark', '--text-link-dark', 'colorsDark.textLink', '#60a5fa')
    + previewTextColors('dark')
  , false);

  h += sect('🔲 '+T('borders'),
    '<strong style="font-size:11px">Light</strong>'
    + colorPick('Border', '--border-light', 'colorsLight.border', '#e2e8f0')
    + colorPick('Focus', '--border-focus-light', 'colorsLight.borderFocus', '#1565c0')
    + colorPick('Error', '--border-error-light', 'colorsLight.borderError', '#dc2626')
    + colorPick('Success', '--border-success-light', 'colorsLight.borderSuccess', '#16a34a')
    + '<strong style="font-size:11px;margin-top:8px;display:block">Dark</strong>'
    + colorPick('Border Dark', '--border-dark', 'colorsDark.border', '#334155')
    + colorPick('Focus Dark', '--border-focus-dark', 'colorsDark.borderFocus', '#60a5fa')
    + colorPick('Error Dark', '--border-error-dark', 'colorsDark.borderError', '#f87171')
    + colorPick('Success Dark', '--border-success-dark', 'colorsDark.borderSuccess', '#22c55e')
    + previewBorderColors()
  , false);

  /* Semantic surfaces (system-wide) — elevated / input / disabled / overlay */
  h += sect('🖼️ '+L('Bề mặt ngữ nghĩa', 'Semantic surfaces & elevation'),
    colorPick(L('Elevated surface', 'Elevated surface'), '--bg-elevated', 'colorsLight.bgElevated', '#fafbfc')
    + colorPick(L('Input background', 'Input background'), '--bg-input', 'colorsLight.bgInput', '#ffffff')
    + colorPick(L('Disabled field BG', 'Disabled field BG'), '--bg-disabled', 'colorsLight.bgDisabled', 'rgba(148,163,184,0.1)')
    + colorPick(L('Overlay background', 'Overlay background'), '--bg-overlay', 'colorsLight.bgOverlay', 'rgba(15,23,42,0.5)')
  , false, statusChip('preview', 'semantic.surfaces'));

  /* Business-process lifecycle state colors (system-wide: WO, NCR, CAPA, Doc, Training...) */
  h += sect('🔄 '+L('Màu trạng thái vòng đời nghiệp vụ', 'Business lifecycle state colors'),
    colorPick('Draft', '--eqms-draft', 'eqms.lifecycle.draft', '#94a3b8')
    + colorPick('Open', '--eqms-open', 'eqms.lifecycle.open', '#3b82f6')
    + colorPick('In Progress', '--eqms-in-progress', 'eqms.lifecycle.inProgress', '#8b5cf6')
    + colorPick('Pending', '--eqms-pending', 'eqms.lifecycle.pending', '#f59e0b')
    + colorPick('Approved', '--eqms-approved', 'eqms.lifecycle.approved', '#10b981')
    + colorPick('Closed', '--eqms-closed', 'eqms.lifecycle.closed', '#64748b')
    + colorPick('Voided', '--eqms-voided', 'eqms.lifecycle.voided', '#dc2626')
    + previewBox(L('Preview vòng đời','Preview lifecycle'),
        '<div style="display:flex;gap:6px;flex-wrap:wrap">'
        + [['Draft','--eqms-draft'],['Open','--eqms-open'],['In Progress','--eqms-in-progress'],
           ['Pending','--eqms-pending'],['Approved','--eqms-approved'],['Closed','--eqms-closed'],['Voided','--eqms-voided']
          ].map(function(r){ return '<span style="display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:999px;background:color-mix(in srgb,var('+r[1]+') 12%,transparent);border:1px solid color-mix(in srgb,var('+r[1]+') 30%,transparent);color:var('+r[1]+');font-size:11px;font-weight:700"><span style="width:7px;height:7px;border-radius:50%;background:var('+r[1]+');display:inline-block"></span>'+r[0]+'</span>'; }).join('')
        + '</div>')
  , false, statusChip('full', L('7 trạng thái', '7 states')));

  /* Severity / risk heatmap (system-wide: risk, FMEA, SPC, OEE drill-down) */
  h += sect('🟥 '+L('Heatmap mức độ / rủi ro', 'Severity & risk heatmap palette'),
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Low BG', '--eqms-heatmap-low-bg', 'eqms.heatmap.lowBg', '#dcfce7')
    + colorPick('Low text', '--eqms-heatmap-low-text', 'eqms.heatmap.lowText', '#166534')
    + colorPick('Medium BG', '--eqms-heatmap-medium-bg', 'eqms.heatmap.mediumBg', '#fef9c3')
    + colorPick('Medium text', '--eqms-heatmap-medium-text', 'eqms.heatmap.mediumText', '#854d0e')
    + colorPick('High BG', '--eqms-heatmap-high-bg', 'eqms.heatmap.highBg', '#fed7aa')
    + colorPick('High text', '--eqms-heatmap-high-text', 'eqms.heatmap.highText', '#9a3412')
    + colorPick('Critical BG', '--eqms-heatmap-critical-bg', 'eqms.heatmap.criticalBg', '#fecaca')
    + colorPick('Critical text', '--eqms-heatmap-critical-text', 'eqms.heatmap.criticalText', '#991b1b')
    + '</div>'
    + previewBox(L('Preview heatmap','Preview heatmap'),
        '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px">'
        + [['Low','low'],['Medium','medium'],['High','high'],['Critical','critical']].map(function(r){
            return '<div style="padding:10px 8px;border-radius:var(--radius-md);background:var(--eqms-heatmap-'+r[1]+'-bg);color:var(--eqms-heatmap-'+r[1]+'-text);text-align:center;font-size:11px;font-weight:700">'+r[0]+'<br><span style="font-size:16px;font-weight:800">3</span></div>';
          }).join('')
        + '</div>')
  , false, statusChip('full', L('4×2 cặp màu', '4×2 pairs')));

  /* State badge colors — dark mode (system-wide) */
  h += sect('🌙 '+L('Màu badge trạng thái (Dark mode)', 'State badge colors (dark mode)'),
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Draft BG dark', '--eqms-state-draft-bg-dark', 'eqms.stateDark.draftBg', '#334155')
    + colorPick('Draft text dark', '--eqms-state-draft-text-dark', 'eqms.stateDark.draftText', '#94a3b8')
    + colorPick('Open BG dark', '--eqms-state-open-bg-dark', 'eqms.stateDark.openBg', '#1e3a5f')
    + colorPick('Open text dark', '--eqms-state-open-text-dark', 'eqms.stateDark.openText', '#60a5fa')
    + colorPick('Active BG dark', '--eqms-state-active-bg-dark', 'eqms.stateDark.activeBg', '#2e1065')
    + colorPick('Active text dark', '--eqms-state-active-text-dark', 'eqms.stateDark.activeText', '#a78bfa')
    + colorPick('Pending BG dark', '--eqms-state-pending-bg-dark', 'eqms.stateDark.pendingBg', '#451a03')
    + colorPick('Pending text dark', '--eqms-state-pending-text-dark', 'eqms.stateDark.pendingText', '#fbbf24')
    + colorPick('Approved BG dark', '--eqms-state-approved-bg-dark', 'eqms.stateDark.approvedBg', '#064e3b')
    + colorPick('Approved text dark', '--eqms-state-approved-text-dark', 'eqms.stateDark.approvedText', '#34d399')
    + colorPick('Voided BG dark', '--eqms-state-voided-bg-dark', 'eqms.stateDark.voidedBg', '#450a0a')
    + colorPick('Voided text dark', '--eqms-state-voided-text-dark', 'eqms.stateDark.voidedText', '#f87171')
    + '</div>'
  , false, statusChip('full', L('6×2 cặp màu', '6×2 pairs')));

  /* Entity classification colors (system-wide: NCR, CAPA, WO, Part, Doc, Training, Audit...) */
  h += sect('🔗 '+L('Màu phân loại thực thể', 'Entity classification colors'),
    '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary);margin:0 0 6px">'+L('Quality Events','Quality Events')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Complaint', '--eqms-entity-complaint', 'eqms.entity.complaint', '#ef4444')
    + colorPick('NCR', '--eqms-entity-ncr', 'eqms.entity.ncr', '#dc2626')
    + colorPick('MRB', '--eqms-entity-mrb', 'eqms.entity.mrb', '#b91c1c')
    + colorPick('Deviation', '--eqms-entity-deviation', 'eqms.entity.deviation', '#f97316')
    + colorPick('CAPA', '--eqms-entity-capa', 'eqms.entity.capa', '#8b5cf6')
    + colorPick('Concession', '--eqms-entity-concession', 'eqms.entity.concession', '#fb923c')
    + colorPick('Field Action', '--eqms-entity-field-action', 'eqms.entity.fieldAction', '#be123c')
    + colorPick('Warranty', '--eqms-entity-warranty', 'eqms.entity.warranty', '#dc2626')
    + '</div>'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary);margin:10px 0 6px">'+L('Change & Document','Change & Document')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Change Control', '--eqms-entity-change-control', 'eqms.entity.changeControl', '#3b82f6')
    + colorPick('Eng Change', '--eqms-entity-eng-change', 'eqms.entity.engChange', '#2563eb')
    + colorPick('Document', '--eqms-entity-document', 'eqms.entity.document', '#0ea5e9')
    + colorPick('Validation', '--eqms-entity-validation', 'eqms.entity.validation', '#4338ca')
    + colorPick('Evidence', '--eqms-entity-evidence', 'eqms.entity.evidence', '#64748b')
    + colorPick('Approval', '--eqms-entity-approval', 'eqms.entity.approval', '#22c55e')
    + colorPick('Signature', '--eqms-entity-signature', 'eqms.entity.signature', '#1d4ed8')
    + colorPick('Lesson Learned', '--eqms-entity-lesson-learned', 'eqms.entity.lessonLearned', '#facc15')
    + '</div>'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary);margin:10px 0 6px">'+L('Training & QC','Training & QC')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Training', '--eqms-entity-training', 'eqms.entity.training', '#06b6d4')
    + colorPick('Competency', '--eqms-entity-competency', 'eqms.entity.competency', '#0891b2')
    + colorPick('IQC', '--eqms-entity-iqc', 'eqms.entity.iqc', '#16a34a')
    + colorPick('Inspection Result', '--eqms-entity-inspection-result', 'eqms.entity.inspectionResult', '#15803d')
    + colorPick('OOS', '--eqms-entity-oos', 'eqms.entity.oos', '#ca8a04')
    + colorPick('SPC', '--eqms-entity-spc', 'eqms.entity.spc', '#0d9488')
    + colorPick('Test Result', '--eqms-entity-test-result', 'eqms.entity.testResult', '#0f766e')
    + colorPick('Lot Release', '--eqms-entity-lot-release', 'eqms.entity.lotRelease', '#0369a1')
    + colorPick('Calibration', '--eqms-entity-calibration', 'eqms.entity.calibration', '#65a30d')
    + colorPick('MSA', '--eqms-entity-msa', 'eqms.entity.msa', '#4d7c0f')
    + colorPick('FMEA', '--eqms-entity-fmea', 'eqms.entity.fmea', '#d97706')
    + colorPick('CSAT', '--eqms-entity-csat', 'eqms.entity.csat', '#f59e0b')
    + '</div>'
    + '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:var(--text-tertiary);margin:10px 0 6px">'+L('Risk & Supplier','Risk & Supplier')+'</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Risk', '--eqms-entity-risk', 'eqms.entity.risk', '#ea580c')
    + colorPick('Audit', '--eqms-entity-audit', 'eqms.entity.audit', '#059669')
    + colorPick('Audit Finding', '--eqms-entity-finding', 'eqms.entity.finding', '#047857')
    + colorPick('Audit Event', '--eqms-entity-audit-event', 'eqms.entity.auditEvent', '#475569')
    + colorPick('Supplier', '--eqms-entity-supplier', 'eqms.entity.supplier', '#7c3aed')
    + colorPick('SCAR', '--eqms-entity-scar', 'eqms.entity.scar', '#9333ea')
    + colorPick('Supplier Audit', '--eqms-entity-supplier-audit', 'eqms.entity.supplierAudit', '#a855f7')
    + colorPick('AML', '--eqms-entity-aml', 'eqms.entity.aml', '#16a34a')
    + colorPick('FAI', '--eqms-entity-fai', 'eqms.entity.fai', '#2563eb')
    + colorPick('APQP', '--eqms-entity-apqp', 'eqms.entity.apqp', '#059669')
    + colorPick('Linked', '--eqms-entity-linked', 'eqms.entity.linked', '#6366f1')
    + colorPick('Task', '--eqms-entity-task', 'eqms.entity.task', '#f59e0b')
    + colorPick('Comment', '--eqms-entity-comment', 'eqms.entity.comment', '#a3a3a3')
    + '</div>'
  , false, statusChip('admin', L('40+ thực thể', '40+ entities')));

  /* Traceability link colors (system-wide genealogy / cause / release / ...) */
  h += sect('↔️ '+L('Màu liên kết truy xuất', 'Traceability link colors'),
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:0 16px">'
    + colorPick('Caused By', '--eqms-link-caused-by', 'eqms.link.causedBy', '#ef4444')
    + colorPick('Related To', '--eqms-link-related-to', 'eqms.link.relatedTo', '#3b82f6')
    + colorPick('Requires', '--eqms-link-requires', 'eqms.link.requires', '#f97316')
    + colorPick('Verifies', '--eqms-link-verifies', 'eqms.link.verifies', '#22c55e')
    + colorPick('Trains', '--eqms-link-trains', 'eqms.link.trains', '#06b6d4')
    + colorPick('Releases', '--eqms-link-releases', 'eqms.link.releases', '#8b5cf6')
    + colorPick('Sourced From', '--eqms-link-sourced-from', 'eqms.link.sourcedFrom', '#7c3aed')
    + colorPick('Supersedes', '--eqms-link-supersedes', 'eqms.link.supersedes', '#64748b')
    + colorPick('Contains', '--eqms-link-contains', 'eqms.link.contains', '#0ea5e9')
    + colorPick('Implements', '--eqms-link-implements', 'eqms.link.implements', '#059669')
    + colorPick('Mitigates', '--eqms-link-mitigates', 'eqms.link.mitigates', '#16a34a')
    + '</div>'
  , false, statusChip('full', L('11 loại liên kết', '11 link types')));

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 4: LAYOUT ──────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderLayout(){
  var h = '';
  var adminLayoutTemplate = cfg('layout.admin.template') || 'default';

  h += sectionLead(
    L('Layout controls đã được tách theo phạm vi ảnh hưởng', 'Layout controls are now grouped by impact scope'),
    L('Density, radius và spacing đang chi phối shared token khá tốt. Riêng layout dimensions cần đọc kỹ badge phạm vi áp dụng vì hệ thống vẫn còn một số module max-width riêng và dialog legacy.', 'Density, radius, and spacing already drive shared tokens well. Layout dimensions need closer attention to their scope badges because the system still includes some module-specific max-width rules and legacy dialogs.'),
    statusChip('full', L('Density / radius / spacing', 'Density / radius / spacing'))
    + statusChip('partial', L('Layout dimensions còn mixed', 'Layout dimensions still mixed'))
  );

  h += sect('📏 '+T('densityDetail'),
    slider('Control height', '--hds-control-h', 'density.controlH', 24, 48, 32, 'px')
    + slider('Control height sm', '--hds-control-h-sm', 'density.controlHSm', 20, 40, 28, 'px')
    + slider('Control height lg', '--hds-control-h-lg', 'density.controlHLg', 32, 56, 40, 'px')
    + slider('Padding X', '--hds-control-px', 'density.controlPx', 4, 24, 10, 'px')
    + slider('Font size', '--hds-control-font', 'density.controlFont', 10, 16, 13, 'px')
    + slider('Gap', '--hds-control-gap', 'density.controlGap', 2, 12, 6, 'px')
    + slider('Icon sm', '--hds-icon-sm', 'density.iconSm', 10, 20, 14, 'px')
    + slider('Icon md', '--hds-icon-md', 'density.iconMd', 12, 24, 16, 'px')
    + previewDensityControls()
  , false, statusChip('full', L('Áp dụng rộng', 'System-wide')));

  h += sect('📋 '+T('tableDetail'),
    slider('Row height', '--hds-table-row-h', 'density.tableRowH', 28, 56, 40, 'px')
    + slider('Cell padding X', '--hds-table-cell-px', 'density.tableCellPx', 4, 20, 12, 'px')
    + slider('Cell padding Y', '--hds-table-cell-py', 'density.tableCellPy', 2, 16, 8, 'px')
    + slider('Header font', '--hds-table-head-font', 'density.tableHeadFont', 9, 14, 11, 'px')
    + slider('Body font', '--hds-table-body-font', 'density.tableBodyFont', 10, 16, 13, 'px')
    + previewTableDensity()
  , false, statusChip('full', L('Bảng shared token', 'Shared tables')));

  h += sect('🔲 '+T('radiusScale'),
    slider('Radius sm', '--radius-sm', 'radius.sm', 0, 12, 4, 'px')
    + slider('Radius md (controls)', '--radius-md', 'radius.md', 0, 16, 6, 'px')
    + slider('Radius lg (cards)', '--radius-lg', 'radius.lg', 0, 20, 8, 'px')
    + slider('Radius xl (sections)', '--radius-xl', 'radius.xl', 0, 24, 12, 'px')
    + slider('Radius 2xl (modals)', '--radius-2xl', 'radius.2xl', 0, 32, 16, 'px')
    + previewRadiusScale()
  , false, statusChip('full', L('Shared radius', 'Shared radius')));

  h += sect('↔️ '+T('spacingScale'),
    slider('space-1', '--space-1', 'spacing.1', 1, 8, 4, 'px')
    + slider('space-2', '--space-2', 'spacing.2', 4, 16, 8, 'px')
    + slider('space-3', '--space-3', 'spacing.3', 6, 20, 12, 'px')
    + slider('space-4', '--space-4', 'spacing.4', 8, 28, 16, 'px')
    + slider('space-5', '--space-5', 'spacing.5', 12, 32, 20, 'px')
    + slider('space-6', '--space-6', 'spacing.6', 16, 40, 24, 'px')
    + slider('space-8', '--space-8', 'spacing.8', 20, 52, 32, 'px')
    + slider('space-10', '--space-10', 'spacing.10', 28, 64, 40, 'px')
    + previewSpacingScale()
  , false, statusChip('full', L('Shared spacing', 'Shared spacing')));

  h += sect('📐 '+T('layoutDim'),
    slider('Sidebar width', '--sidebar-w', 'layout.sidebarW', 180, 360, 260, 'px')
    + slider('Sidebar collapsed', '--sidebar-w-collapsed', 'layout.sidebarCollapsed', 40, 80, 56, 'px')
    + slider('Header height', '--header-h', 'layout.headerH', 36, 72, 52, 'px')
    + slider('Content max-width', '--content-max-w', 'layout.contentMaxW', 960, 2400, 1400, 'px')
    + slider('Modal max-width', '--modal-max-w', 'layout.modalMaxW', 480, 1400, 800, 'px')
    + slider('Modal small max-width', '--modal-sm-max-w', 'layout.modalSmMaxW', 280, 720, 480, 'px')
    + previewLayoutDimensions()
  , false, statusChip('partial', L('Sidebar / header / modal tốt', 'Sidebar / header / modal strong')) + statusChip('preview', L('Content max width còn giới hạn', 'Content max width still limited')));

  h += sect('🏗️ '+L('Layout template admin', 'Admin layout template'),
    sectionLead(
      L('Shell admin giờ có bộ token layout riêng', 'Admin shell now has its own layout token kit'),
      L('Preset bên dưới điều khiển khoảng cách giữa rail và canvas, khe hở giữa section, padding 4 biên của panel, cùng bán kính card/section trong toàn bộ module admin.', 'The presets below govern rail-to-canvas spacing, section gaps, panel outer padding, and card/section radius across the admin modules.'),
      statusChip('admin', L('Liên kết trực tiếp tab đồ họa', 'Directly linked to admin graphics tab'))
      + statusChip('full', L('Áp dụng runtime', 'Runtime tokens'))
    )
    + radioRow('adm_adminLayoutTemplate', [
      {value:'compact', icon:'🗜️', label:T('compact')},
      {value:'default', icon:'🧭', label:T('default')},
      {value:'comfortable', icon:'🪟', label:T('comfortable')},
      {value:'custom', icon:'✏️', label:T('custom')}
    ], adminLayoutTemplate, "_hmApplyAdminLayoutTemplate(this.value)")
    + '<div style="margin:12px 0 10px;font-size:11px;line-height:1.6;color:var(--text-secondary)">'+esc(L('Preset là bundle tham chiếu. Các slider phía dưới cho phép tinh chỉnh thủ công tiếp và vẫn lưu cùng runtime config.', 'Presets are reference bundles. The sliders below let you refine manually and persist alongside the runtime config.'))+'</div>'
    + slider('Shell gap', '--admin-gap-lg', 'layout.admin.gapLg', 8, 32, 18, 'px')
    + slider('Section / grid gap', '--admin-gap-md', 'layout.admin.gapMd', 8, 24, 14, 'px')
    + slider('Inline / toolbar gap', '--admin-gap-sm', 'layout.admin.gapSm', 4, 16, 8, 'px')
    + slider('Panel outer padding', '--admin-panel-padding', 'layout.admin.panelPadding', 8, 32, 18, 'px')
    + slider('Card / hero padding', '--admin-card-padding', 'layout.admin.cardPadding', 10, 32, 18, 'px')
    + slider('Nested row padding', '--admin-row-padding', 'layout.admin.rowPadding', 8, 24, 12, 'px')
    + slider('Panel radius', '--admin-panel-radius', 'layout.admin.panelRadius', 6, 28, 20, 'px')
    + slider('Surface radius', '--admin-surface-radius', 'layout.admin.surfaceRadius', 6, 24, 18, 'px')
    + slider('Nested radius', '--admin-nested-radius', 'layout.admin.nestedRadius', 4, 20, 14, 'px')
    + previewAdminLayoutTemplate()
  , false, statusChip('full', L('Admin console shell', 'Admin console shell')) + statusChip('admin', L('Preset + manual', 'Preset + manual')));

  /* V4 — responsive page padding */
  h += sect('📱 '+L('Padding trang responsive', 'Responsive page padding'),
    slider('Mobile', '--page-pad-mobile', 'layout.pagePadMobile', 8, 24, 16, 'px')
    + slider('Tablet', '--page-pad-tablet', 'layout.pagePadTablet', 16, 40, 24, 'px')
    + slider('Desktop', '--page-pad-desktop', 'layout.pagePadDesktop', 20, 56, 32, 'px')
  , false, statusChip('preview', L('Padding responsive', 'Responsive padding')));

  /* Module shell dimensions (system-wide: nav width, header height, detail sidebar, filter bar) */
  h += sect('📐 '+L('Kích thước shell module', 'Module shell dimensions'),
    slider(L('Nav width', 'Nav width'), '--eqms-nav-width', 'eqms.layout.navWidth', 200, 360, 260, 'px')
    + slider(L('Nav collapsed', 'Nav collapsed'), '--eqms-nav-collapsed', 'eqms.layout.navCollapsed', 40, 80, 56, 'px')
    + slider(L('Header height', 'Header height'), '--eqms-header-height', 'eqms.layout.headerHeight', 44, 72, 56, 'px')
    + slider(L('Detail sidebar', 'Detail sidebar'), '--eqms-detail-sidebar', 'eqms.layout.detailSidebar', 240, 480, 320, 'px')
    + slider(L('Filter bar height', 'Filter bar height'), '--eqms-filter-height', 'eqms.layout.filterHeight', 40, 72, 52, 'px')
  , false, statusChip('full', L('5 kích thước', '5 dimensions')));

  h += sect('📊 '+T('zIndex')+' (read-only)',
    '<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">Layer</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border)">Value</th></tr></thead><tbody>'
    +[['Base',1],['Dropdown',100],['Sticky',200],['Sidebar',300],['Header',400],['Overlay',1200],['Modal',1300],['Toast',1400],['Tooltip',1500]]
    .map(function(r){return '<tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">'+r[0]+'</td><td style="text-align:right;padding:3px 8px;border-bottom:1px solid var(--border);font-family:var(--font-mono)">'+r[1]+'</td></tr>';}).join('')
    +'</tbody></table>'
  , false, statusChip('admin', L('Thông tin tham chiếu', 'Reference only')));

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 5: EFFECTS ─────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderEffects(){
  var h = sectionLead(
    L('Hiệu ứng có kiểm soát', 'Governed effects'),
    L('Motion, focus, overlay và skeleton phải vẫn đi qua shared token layer, đồng thời impact analysis ghi nhận module dùng hiệu ứng hoặc focus contract.', 'Motion, focus, overlay, and skeleton remain on the shared token layer, while impact analysis tracks modules consuming effects or focus contracts.'),
    statusChip('admin', L('Impact-aware', 'Impact-aware'))
  );
  h += '<div id="adm-graphics-impact-panel" style="margin-bottom:16px">'+renderImpactAnalysisPanel(false)+'</div>';

  h += sect('⚡ '+T('motion'),
    slider('Fast', '--transition-fast', 'effects.motionFast', 0, 300, 100, 'ms')
    + slider('Normal', '--transition-normal', 'effects.motionNormal', 50, 500, 150, 'ms')
    + slider('Slow', '--transition-slow', 'effects.motionSlow', 100, 800, 250, 'ms')
    + slider('Spring', '--transition-spring', 'effects.motionSpring', 100, 1000, 300, 'ms')
    + previewMotion()
  , true);

  h += sect('🔵 '+T('focusRing'),
    slider('Width', '--focus-ring-width', 'effects.focusRingWidth', 1, 5, 3, 'px')
    + colorPick('Color', '--focus-ring-color', 'effects.focusRingColor', 'rgba(21,101,192,0.12)')
    + slider('Offset', '--focus-ring-offset', 'effects.focusRingOffset', 0, 4, 0, 'px')
    + previewFocus()
  , false);

  h += sect('🖊️ '+T('selectionColor'),
    colorPick('Selection BG', '--selection-bg', 'effects.selectionBg', '#3b82f6')
    + colorPick('Selection Text', '--selection-color', 'effects.selectionColor', '#ffffff')
    + previewSelection()
  , false);

  h += sect('✏️ '+T('caretColor'),
    colorPick('Caret', '--caret-color', 'effects.caretColor', '#1565c0')
    + previewCaret()
  , false);

  h += sect('💬 '+T('placeholder'),
    colorPick('Placeholder color', '--placeholder-color', 'effects.placeholderColor', '#94a3b8')
    + previewPlaceholder()
  , false);

  h += sect('🚫 '+T('disabledState'),
    slider('Opacity', '--disabled-opacity', 'effects.disabledOpacity', 0.2, 0.8, 0.5, '', 0.05)
    + previewDisabled()
  , false);

  h += sect('📜 '+T('scrollbar'),
    slider('Width', '--scrollbar-width', 'effects.scrollbarWidth', 4, 12, 8, 'px')
    + colorPick('Track', '--scrollbar-track', 'effects.scrollbarTrack', '#f1f5f9')
    + colorPick('Thumb', '--scrollbar-thumb', 'effects.scrollbarThumb', '#cbd5e1')
    + slider('Thumb radius', '--scrollbar-radius', 'effects.scrollbarRadius', 0, 8, 4, 'px')
    + previewScrollbar()
  , false);

  h += sect('🌫️ '+T('backdrop'),
    slider('Backdrop blur', '--backdrop-blur', 'effects.backdropBlur', 0, 20, 0, 'px')
    + slider('Overlay opacity', '--overlay-opacity', 'effects.overlayOpacity', 0, 1, 0.4, '', 0.05)
    + previewBackdrop()
  , false);

  /* V4 — opacity state layers */
  h += sect('🎭 '+L('Opacity trạng thái', 'State opacity layers'),
    slider(L('Hover layer', 'Hover layer'), '--opacity-hover', 'effects.opacityHover', 0, 0.2, 0.06, '', 0.005)
    + slider(L('Pressed layer', 'Pressed layer'), '--opacity-pressed', 'effects.opacityPressed', 0, 0.3, 0.10, '', 0.005)
    + slider(L('Selected layer', 'Selected layer'), '--opacity-selected', 'effects.opacitySelected', 0, 0.2, 0.08, '', 0.005)
    + slider(L('Disabled', 'Disabled'), '--opacity-disabled', 'effects.opacityDisabled', 0.1, 0.8, 0.4, '', 0.05)
    + slider(L('Muted', 'Muted'), '--opacity-muted', 'effects.opacityMuted', 0.3, 0.9, 0.6, '', 0.05)
    + previewBox(L('Preview state layers','Preview state layers'),
        '<div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center">'
        + '<button class="hm-btn hm-btn-primary" style="position:relative;overflow:hidden">Primary<span style="position:absolute;inset:0;background:rgba(0,0,0,var(--opacity-hover,0.06))"></span></button>'
        + '<button class="hm-btn hm-btn-secondary" style="position:relative;overflow:hidden">Hover<span style="position:absolute;inset:0;background:rgba(0,0,0,var(--opacity-pressed,0.10))"></span></button>'
        + '<span class="hm-badge" style="opacity:var(--opacity-muted,0.6)">Muted badge</span>'
        + '<span class="hm-badge hm-badge-approved" style="opacity:var(--opacity-disabled,0.4)">Disabled</span>'
        + '</div>')
  , false, statusChip('preview', L('State layers', 'State layers')));

  /* V4 — extended shadow scale */
  h += sect('🌑 '+L('Shadow mở rộng', 'Extended shadow scale'),
    textInput('Shadow XS', '--shadow-xs', 'effects.shadowXs', '0 1px 3px rgba(12,45,72,.04)')
    + textInput('Shadow LG', '--shadow-lg', 'effects.shadowLg', '0 18px 40px rgba(15,23,42,.14),0 8px 20px rgba(15,23,42,.09)')
    + textInput('Shadow XL', '--shadow-xl', 'effects.shadowXl', '0 24px 60px rgba(12,45,72,.16),0 12px 28px rgba(12,45,72,.08)')
    + previewBox(L('Preview shadows','Preview shadows'),
        '<div style="display:flex;gap:12px;flex-wrap:wrap">'
        + '<div style="padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-xs)"><div style="font-size:10px;color:var(--text-tertiary)">XS</div></div>'
        + '<div style="padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-sm)"><div style="font-size:10px;color:var(--text-tertiary)">SM</div></div>'
        + '<div style="padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-md)"><div style="font-size:10px;color:var(--text-tertiary)">MD</div></div>'
        + '<div style="padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-lg)"><div style="font-size:10px;color:var(--text-tertiary)">LG</div></div>'
        + '<div style="padding:10px 14px;border-radius:var(--radius-lg);background:var(--bg-surface);box-shadow:var(--shadow-xl)"><div style="font-size:10px;color:var(--text-tertiary)">XL</div></div>'
        + '</div>')
  , false, statusChip('preview', L('xs / lg / xl', 'xs / lg / xl')));

  /* V4 — easing curves */
  h += sect('↗️ '+L('Easing curves', 'Easing curves'),
    textInput('Ease out', '--ease-out', 'effects.easingOut', 'cubic-bezier(0,0,0.2,1)')
    + textInput('Ease in-out', '--ease-in-out', 'effects.easingInOut', 'cubic-bezier(0.4,0,0.2,1)')
    + textInput('Ease spring', '--ease-spring', 'effects.easingSpring', 'cubic-bezier(0.34,1.56,0.64,1)')
    + textInput('Ease sharp', '--ease-sharp', 'effects.easingSharp', 'cubic-bezier(0.2,0,0,1)')
  , false, statusChip('preview', L('Easing curves', 'Easing curves')));

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 6: COMPONENTS ──────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderComponents(){
  var h = '';

  h += sectionLead(
    L('Điều khiển cốt lõi', 'Core controls'),
    L('Nhóm này chỉnh component contract dùng chung. Mọi thay đổi button, input, table, tab, modal hoặc field đều được đưa vào impact analysis trước rollout.', 'This group edits shared component contracts. Button, input, table, tab, modal, or field changes feed impact analysis before rollout.'),
    statusChip('full', L('Ưu tiên cao', 'High priority')) + statusChip('full', L('Áp dụng rộng', 'System-wide')) + statusChip('admin', L('Có phân tích ảnh hưởng', 'Impact-aware'))
  );
  h += '<div id="adm-graphics-impact-panel" style="margin-bottom:16px">'+renderImpactAnalysisPanel(false)+'</div>';

  /* BUTTON */
  h += sect('🔘 '+T('btnSettings'),
    slider(T('paddingY'), '--btn-padding-y', 'components.btn.paddingY', 0, 12, 0, 'px')
    + slider(T('paddingX'), '--btn-padding-x', 'components.btn.paddingX', 4, 24, 10, 'px')
    + slider(T('gap')+' (icon↔text)', '--btn-gap', 'components.btn.gap', 2, 12, 6, 'px')
    + slider(L('Tỷ lệ icon kèm chữ', 'Leading icon scale'), '--ui-icon-leading-scale', 'components.icon.leadingScale', 0.9, 1.5, 1.12, '', 0.05)
    + slider(L('Trim biên icon kèm chữ', 'Leading icon edge trim'), '--ui-icon-leading-edge-trim', 'components.icon.leadingEdgeTrim', 0, 8, 2, 'px')
    + slider(L('Tỷ lệ icon-only', 'Icon-only scale'), '--ui-icon-only-scale', 'components.icon.onlyScale', 1, 2.2, 1.4, '', 0.05)
    + slider(L('Inset icon-only', 'Icon-only inset'), '--ui-icon-only-inset', 'components.icon.onlyInset', 0, 8, 2, 'px')
    + slider(T('fontWeight'), '--btn-font-weight', 'components.btn.fontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing'), '--btn-letter-spacing', 'components.btn.letterSpacing', 0, 0.15, 0, 'em', 0.01)
    + slider(T('borderWidth'), '--btn-border-width', 'components.btn.borderWidth', 0, 3, 1, 'px')
    + slider(T('minWidth'), '--btn-min-width', 'components.btn.minWidth', 0, 120, 0, 'px')
    + previewButtons()
  , true, statusChip('full', L('Nút dùng chung', 'Shared button')));

  /* INPUT */
  h += sect('📝 '+T('inputSettings'),
    slider(T('borderWidth'), '--input-border-width', 'components.input.borderWidth', 1, 3, 1, 'px')
    + slider(T('paddingY'), '--input-padding-y', 'components.input.paddingY', 0, 8, 0, 'px')
    + colorPick('Input BG', '--input-bg', 'components.input.bg', '#ffffff')
    + previewInputs()
  , false, statusChip('full', L('Shared input', 'Shared input')));

  /* BADGE */
  h += sect('🏷️ '+T('badgeSettings'),
    slider(T('fontWeight'), '--badge-font-weight', 'components.badge.fontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing'), '--badge-letter-spacing', 'components.badge.letterSpacing', 0, 0.15, 0, 'em', 0.01)
    + slider(T('borderWidth'), '--badge-border-width', 'components.badge.borderWidth', 0, 2, 0, 'px')
    + slider(T('minWidth'), '--badge-min-width', 'components.badge.minWidth', 0, 60, 0, 'px')
    + previewBadges()
  , false, statusChip('full', L('Shared badge', 'Shared badge')));

  /* TAB */
  h += sect('📑 '+T('tabSettings'),
    slider(T('paddingY'), '--hds-tab-py', 'components.tab.paddingY', 0, 20, 8, 'px')
    + slider(T('paddingX'), '--hds-tab-px', 'components.tab.paddingX', 0, 32, 16, 'px')
    + slider(T('fontSize'), '--hds-tab-font', 'components.tab.fontSize', 8, 18, 11, 'px')
    + slider(T('borderWidth')+' indicator', '--tab-border-width', 'components.tab.borderWidth', 1, 4, 2, 'px')
    + slider(T('fontWeight'), '--tab-font-weight', 'components.tab.fontWeight', 400, 800, 600, '', 100)
    + slider(T('gap'), '--tab-gap', 'components.tab.gap', 0, 12, 4, 'px')
    + slider('Border radius', '--tab-radius', 'components.tab.radius', 0, 28, 14, 'px')
    + colorPick('Active indicator', '--tab-active-indicator', 'components.tab.activeIndicator', '#1565c0')
    + previewTabs()
  , false, statusChip('full', L('Shared tab', 'Shared tab')) + statusChip('admin', L('Panel này tự dùng lại', 'This panel self-consumes it')));

  /* TOOLTIP */
  h += sect('💬 '+T('tooltipSettings'),
    colorPick('BG', '--tooltip-bg', 'components.tooltip.bg', '#0f172a')
    + colorPick('Color', '--tooltip-color', 'components.tooltip.color', '#ffffff')
    + slider(T('paddingY'), '--tooltip-padding-y', 'components.tooltip.paddingY', 4, 12, 6, 'px')
    + slider(T('paddingX'), '--tooltip-padding-x', 'components.tooltip.paddingX', 6, 16, 10, 'px')
    + slider('Border radius', '--tooltip-radius', 'components.tooltip.radius', 0, 12, 6, 'px')
    + slider('Font size', '--tooltip-font-size', 'components.tooltip.fontSize', 10, 14, 11, 'px')
    + slider('Max width', '--tooltip-max-width', 'components.tooltip.maxWidth', 160, 400, 280, 'px')
    + previewTooltip()
  , false, statusChip('full', L('Shared tooltip', 'Shared tooltip')));

  /* DROPDOWN */
  h += sect('📋 '+T('dropdownSettings'),
    slider(L('Chiều cao box', 'Box height'), '--hds-control-h', 'density.controlH', 24, 48, 32, 'px', 1, 'dropdown')
    + slider(L('Bo góc menu', 'Menu radius'), '--dropdown-radius', 'components.dropdown.radius', 0, 16, 8, 'px')
    + slider(L('Đệm dòng chọn', 'Item padding'), '--dropdown-item-padding', 'components.dropdown.itemPadding', 4, 16, 8, 'px')
    + slider(L('Cỡ chữ dòng chọn', 'Item font'), '--dropdown-item-font-size', 'components.dropdown.itemFontSize', 11, 16, 13, 'px')
    + colorPick(L('Nền khi rê chuột', 'Hover BG'), '--dropdown-item-hover-bg', 'components.dropdown.hoverBg', '#f8fafc')
    + previewDropdown()
  , false, statusChip('full', L('Shared dropdown', 'Shared dropdown')));

  h += sect('🧩 '+L('Đối tượng trong Admin', 'Admin objects'),
    sectionLead(
      L('Các đối tượng riêng của module Admin phải đi qua cùng lớp đồ họa này', 'Admin-specific objects must go through this same graphics layer'),
      L('Nhóm này chi phối toolbar, nút phân đoạn, thẻ người dùng, thẻ thống kê, panel cây tổ chức, canvas sơ đồ và cụm điều khiển phóng to. Không sửa kích thước từng màn hình bằng hardcode.', 'This group governs toolbars, segmented controls, user cards, stat cards, org tree panels, graph canvas, and zoom controls. Do not tune individual screens with hardcoded values.'),
      statusChip('admin', L('SSOT cho Admin', 'Admin SSOT'))
      + statusChip('full', L('Có consumer thật', 'Real consumers'))
    )
    + slider(L('Đệm toolbar', 'Toolbar padding'), '--admin-toolbar-padding', 'components.admin.toolbarPadding', 0, 20, 8, 'px')
    + slider(L('Chiều cao control Admin', 'Admin control height'), '--admin-object-min-h', 'components.admin.objectMinH', 28, 56, 34, 'px')
    + slider(L('Chiều cao tối thiểu thẻ', 'Card minimum height'), '--admin-card-min-h', 'components.admin.cardMinH', 88, 180, 118, 'px')
    + slider(L('Cỡ ảnh đại diện', 'Avatar size'), '--admin-avatar-size', 'components.admin.avatarSize', 28, 64, 36, 'px')
    + slider(L('Cỡ chấm trạng thái', 'Status dot size'), '--admin-status-dot-size', 'components.admin.statusDotSize', 10, 28, 18, 'px')
    + slider(L('Chiều cao canvas tối thiểu', 'Canvas min height'), '--admin-canvas-min-h', 'components.admin.canvasMinH', 360, 760, 520, 'px')
    + slider(L('Ô lưới canvas', 'Canvas grid size'), '--admin-canvas-grid-size', 'components.admin.canvasGridSize', 12, 40, 24, 'px')
    + slider(L('Đệm cụm zoom', 'Zoom tool padding'), '--admin-canvas-tool-padding', 'components.admin.canvasToolPadding', 2, 12, 4, 'px')
    + previewBox(
      L('Xem trước đối tượng Admin', 'Preview Admin objects'),
      '<div style="display:grid;gap:var(--admin-gap-md,14px)">'
      + '<div style="display:flex;gap:var(--admin-gap-sm,8px);align-items:center;padding:var(--admin-toolbar-padding,8px);border:1px solid var(--border);border-radius:var(--admin-surface-radius,18px);background:var(--bg-surface)">'
      + '<button class="btn-admin primary" style="height:var(--admin-object-min-h,34px)">Đang chọn</button>'
      + '<button class="btn-admin secondary" style="height:var(--admin-object-min-h,34px)">Tác vụ</button>'
      + '<span style="height:var(--admin-object-min-h,34px);min-width:54px;display:inline-flex;align-items:center;justify-content:center;border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);font-weight:800">100%</span>'
      + '</div>'
      + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--admin-gap-md,14px)">'
      + '<div style="min-height:var(--admin-card-min-h,118px);padding:var(--admin-row-padding,12px);border:1px solid var(--border);border-radius:var(--admin-nested-radius,14px);background:var(--bg-surface);display:flex;gap:var(--admin-gap-sm,8px);align-items:flex-start">'
      + '<span style="width:var(--admin-avatar-size,36px);height:var(--admin-avatar-size,36px);border-radius:999px;background:var(--brand-2);color:#fff;display:inline-flex;align-items:center;justify-content:center;font-weight:800">NV</span>'
      + '<div style="flex:1"><div style="height:12px;width:70%;border-radius:999px;background:var(--bg-surface-alt)"></div><div style="margin-top:8px;height:10px;width:52%;border-radius:999px;background:var(--bg-surface-alt)"></div></div>'
      + '<span style="width:var(--admin-status-dot-size,18px);height:var(--admin-status-dot-size,18px);border-radius:999px;background:var(--green)"></span>'
      + '</div>'
      + '<div style="min-height:var(--admin-canvas-min-h,520px);max-height:140px;padding:var(--admin-canvas-tool-padding,4px);border:1px solid var(--border);border-radius:var(--admin-surface-radius,18px);background:repeating-linear-gradient(0deg,var(--bg-surface-alt) 0 1px,transparent 1px var(--admin-canvas-grid-size,24px)),repeating-linear-gradient(90deg,var(--bg-surface-alt) 0 1px,transparent 1px var(--admin-canvas-grid-size,24px)),var(--bg-surface)"></div>'
      + '</div>'
      + '</div>',
      L('Cùng token đang áp dụng cho Người dùng, Phòng ban & Chức danh và Sơ đồ tổ chức.', 'The same tokens feed Users, Departments & Titles, and Org Chart.')
    )
  , false, statusChip('full', L('Toolbar / card / canvas', 'Toolbar / card / canvas')));

  /* NAV ITEM */
  h += sect('🧭 '+T('navSettings'),
    slider('Height', '--nav-item-height', 'components.nav.height', 28, 48, 36, 'px')
    + slider('Font size', '--nav-item-font-size', 'components.nav.fontSize', 11, 16, 13, 'px')
    + slider('Icon size', '--nav-item-icon-size', 'components.nav.iconSize', 12, 24, 16, 'px')
    + slider(T('gap'), '--nav-item-gap', 'components.nav.gap', 4, 16, 10, 'px')
    + slider('Border radius', '--nav-item-radius', 'components.nav.radius', 0, 16, 8, 'px')
    + previewNav()
  , false, statusChip('full', L('Shared nav item', 'Shared nav item')));

  /* PAGINATION */
  h += sect('📄 '+T('paginationSettings'),
    slider('Button size', '--pagination-btn-size', 'components.pagination.btnSize', 24, 44, 32, 'px')
    + slider('Border radius', '--pagination-btn-radius', 'components.pagination.radius', 0, 12, 6, 'px')
    + slider('Font size', '--pagination-font-size', 'components.pagination.fontSize', 11, 16, 13, 'px')
    + slider(T('gap'), '--pagination-gap', 'components.pagination.gap', 2, 8, 4, 'px')
    + previewPagination()
  , false, statusChip('full', L('Shared pagination', 'Shared pagination')));

  h += sectionLead(
    L('Surfaces & data density', 'Surfaces & data density'),
    L('Nhóm này chi phối bảng, card, modal, field, progress và empty state. Card body đang tuân thủ tốt, còn phần card header mới dừng ở token + preview chứ chưa phủ rộng ra nhiều module legacy.', 'This group governs tables, cards, modals, fields, progress, and empty states. Card body already follows tokens well, while card header is still tokenized mainly in preview and not yet widely adopted in legacy modules.'),
    statusChip('full', L('Đa số đã áp dụng', 'Mostly applied')) + statusChip('partial', L('Card header cần mở rộng', 'Card header needs wider adoption'))
  );

  /* TABLE */
  h += sect('📊 '+T('tableSettings'),
    colorPick(T('headerBg'), '--table-header-bg', 'components.table.headerBg', '#f1f5f9')
    + slider(T('fontWeight')+' header', '--table-header-font-weight', 'components.table.headerFontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing')+' header', '--table-header-letter-spacing', 'components.table.headerLetterSpacing', 0, 0.15, 0.05, 'em', 0.01)
    + colorPick(T('stripeBg'), '--table-row-stripe', 'components.table.stripeBg', 'transparent')
    + colorPick(T('stripeAltBg'), '--table-row-stripe-alt', 'components.table.stripeAltBg', 'rgba(0,0,0,0.02)')
    + slider(T('borderWidth'), '--table-border-width', 'components.table.borderWidth', 0, 3, 1, 'px')
    + previewTable()
  , false, statusChip('full', L('Shared table', 'Shared table')));

  /* CARD */
  h += sect('🃏 '+T('cardSettings'),
    slider(T('borderWidth'), '--card-border-width', 'components.card.borderWidth', 0, 3, 1, 'px')
    + colorPick(T('headerBg'), '--card-header-bg', 'components.card.headerBg', 'transparent')
    + slider(T('headerPadding'), '--card-header-padding-v', 'components.card.headerPadding', 8, 24, 12, 'px')
    + slider(T('bodyPadding'), '--card-body-padding', 'components.card.bodyPadding', 8, 32, 16, 'px')
    + previewCard()
  , false, statusChip('partial', L('Card body đã áp dụng', 'Card body applied')) + statusChip('preview', L('Card header còn hạn chế', 'Card header still limited')));

  /* MODAL */
  h += sect('🪟 '+T('modalSettings'),
    slider('Border radius', '--modal-border-radius', 'components.modal.radius', 0, 32, 16, 'px')
    + slider(T('bodyPadding'), '--modal-padding', 'components.modal.padding', 12, 40, 24, 'px')
    + slider(T('headerPadding'), '--modal-header-padding-v', 'components.modal.headerPadding', 8, 24, 16, 'px')
    + previewModal()
  , false, statusChip('full', L('Shared modal', 'Shared modal')));

  /* PROGRESS BAR */
  h += sect('📏 '+T('progressSettings'),
    slider('Height', '--progress-height', 'components.progress.height', 4, 16, 8, 'px')
    + slider('Border radius', '--progress-radius', 'components.progress.radius', 0, 16, 9999, 'px')
    + colorPick('Track BG', '--progress-bg', 'components.progress.bg', '#e2e8f0')
    + previewProgress()
  , false, statusChip('full', L('Shared progress', 'Shared progress')));

  /* EMPTY STATE */
  h += sect('📭 '+T('emptySettings'),
    slider('Icon size', '--empty-icon-size', 'components.empty.iconSize', 24, 80, 48, 'px')
    + slider('Icon opacity', '--empty-icon-opacity', 'components.empty.iconOpacity', 0.1, 0.8, 0.4, '', 0.05)
    + slider('Title font', '--empty-title-font-size', 'components.empty.titleFontSize', 14, 20, 16, 'px')
    + slider('Desc font', '--empty-desc-font-size', 'components.empty.descFontSize', 12, 16, 13, 'px')
    + previewEmpty()
  , false, statusChip('full', L('Shared empty state', 'Shared empty state')));

  /* FORM FIELD */
  h += sect('📝 '+T('fieldSettings'),
    slider('Field gap', '--field-gap', 'components.field.gap', 8, 28, 16, 'px')
    + slider('Label gap', '--field-label-gap', 'components.field.labelGap', 2, 8, 4, 'px')
    + slider('Group gap', '--field-group-gap', 'components.field.groupGap', 12, 40, 24, 'px')
    + slider('Helper font', '--field-helper-font-size', 'components.field.helperFontSize', 10, 14, 11, 'px')
    + previewField()
  , false, statusChip('full', L('Shared form field', 'Shared form field')));

  /* BREADCRUMB */
  h += sect('🔗 '+T('breadcrumbSettings'),
    slider('Font size', '--breadcrumb-font-size', 'components.breadcrumb.fontSize', 11, 16, 13, 'px')
    + slider(T('gap'), '--breadcrumb-gap', 'components.breadcrumb.gap', 2, 12, 6, 'px')
    + colorPick('Color', '--breadcrumb-color', 'components.breadcrumb.color', '#94a3b8')
    + colorPick('Active', '--breadcrumb-active-color', 'components.breadcrumb.activeColor', '#1e293b')
    + previewBreadcrumb()
  , false, statusChip('full', L('Shared breadcrumb', 'Shared breadcrumb')));

  h += sectionLead(
    L('Specialized governed patterns', 'Specialized governed patterns'),
    L('Flow, ISO box, ISO note và KPI icon đã được token hóa và preview để kiểm tra nhanh ngay trong admin. Tuy nhiên ngoài portal chúng mới chỉ sẵn sàng cho adoption, chưa phải nhóm đã phủ rộng như button hay table.', 'Flow, ISO box, ISO note, and KPI icon are already tokenized and previewable for quick admin testing. Outside the portal they are still adoption-ready patterns rather than broadly deployed shared controls like buttons or tables.'),
    statusChip('preview', L('Preview-led', 'Preview-led')) + statusChip('partial', L('Cần module dùng hm-*', 'Needs modules to adopt hm-*'))
  );

  /* FLOWCHART */
  h += sect('🔀 '+T('flowSettings'),
    colorPick(T('nodeBg'), '--flow-node-bg', 'components.flow.nodeBg', '#ffffff')
    + slider(T('nodeBorder'), '--flow-node-border-w', 'components.flow.nodeBorderW', 1, 4, 2, 'px')
    + colorPick(T('nodeBorder')+' color', '--flow-node-border-color', 'components.flow.nodeBorderColor', '#e2e8f0')
    + slider(T('nodeRadius'), '--flow-node-radius', 'components.flow.nodeRadius', 0, 20, 8, 'px')
    + slider(T('nodePadding'), '--flow-node-padding', 'components.flow.nodePadding', 6, 24, 12, 'px')
    + colorPick(T('connectorColor'), '--flow-connector-color', 'components.flow.connectorColor', '#94a3b8')
    + slider(T('connectorWidth'), '--flow-connector-width', 'components.flow.connectorWidth', 1, 4, 2, 'px')
    + slider(T('arrowSize'), '--flow-arrow-size', 'components.flow.arrowSize', 4, 16, 8, 'px')
    + previewFlow()
  , false, statusChip('preview', L('Preview + runtime var', 'Preview + runtime var')));

  /* ISO BOX */
  h += sect('📋 '+T('isoBox'),
    colorPick(T('boxBg'), '--iso-box-bg', 'components.isoBox.bg', '#ffffff')
    + slider(T('borderWidth'), '--iso-box-border-w', 'components.isoBox.borderW', 1, 3, 1, 'px')
    + slider('Border radius', '--iso-box-radius', 'components.isoBox.radius', 0, 16, 8, 'px')
    + colorPick(T('boxHeaderBg'), '--iso-box-header-bg', 'components.isoBox.headerBg', '#f1f5f9')
    + slider(T('headerPadding'), '--iso-box-header-padding', 'components.isoBox.headerPadding', 6, 20, 10, 'px')
    + slider(T('bodyPadding'), '--iso-box-body-padding', 'components.isoBox.bodyPadding', 8, 24, 14, 'px')
    + slider('Font size', '--iso-box-font-size', 'components.isoBox.fontSize', 11, 16, 13, 'px')
    + previewIsoBox()
  , false, statusChip('preview', L('Preview + shared token ready', 'Preview + shared token ready')));

  /* ISO NOTE */
  h += sect('📝 '+T('isoNote'),
    colorPick(T('noteBg'), '--iso-note-bg', 'components.isoNote.bg', '#fffbeb')
    + colorPick(T('noteBorder'), '--iso-note-border-color', 'components.isoNote.borderColor', '#fcd34d')
    + colorPick(T('noteBorderLeft'), '--iso-note-border-left-color', 'components.isoNote.borderLeftColor', '#f59e0b')
    + slider(T('noteBorderLeft')+' width', '--iso-note-border-left-w', 'components.isoNote.borderLeftW', 2, 8, 4, 'px')
    + slider('Border radius', '--iso-note-radius', 'components.isoNote.radius', 0, 12, 6, 'px')
    + slider(T('bodyPadding'), '--iso-note-padding', 'components.isoNote.padding', 6, 20, 10, 'px')
    + slider('Font size', '--iso-note-font-size', 'components.isoNote.fontSize', 11, 16, 13, 'px')
    + slider('Icon size', '--iso-note-icon-size', 'components.isoNote.iconSize', 12, 24, 16, 'px')
    + previewIsoNote()
  , false, statusChip('preview', L('Preview + shared token ready', 'Preview + shared token ready')));

  /* KPI CARD */
  h += sect('📊 '+T('kpiSettings'),
    slider(T('borderWidth'), '--kpi-border-width', 'components.kpi.borderWidth', 0, 3, 1, 'px')
    + slider('Icon size', '--kpi-icon-size', 'components.kpi.iconSize', 16, 40, 24, 'px')
    + slider('Trend font', '--kpi-trend-font-size', 'components.kpi.trendFontSize', 9, 14, 11, 'px')
    + previewKpi()
  , false, statusChip('preview', L('Icon size còn cần adoption', 'Icon size still needs adoption')));

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 7: GOVERNANCE ────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderGovernance(){
  var h = '';
  var allTemplates = getAllTemplates();
  var customTemplates = allTemplates.filter(function(tpl){ return /^C/.test(tpl.id); });
  var themeCards = VISUAL_THEMES.map(function(theme){
    return renderThemeControlButton(theme);
  }).join('');
  var modules = [
    {
      area: L('Document browser, search, dictionary, matrix', 'Document browser, search, dictionary, matrix'),
      status: statusChip('full', L('Bridged', 'Bridged')),
      note: L('Portal shell da doc token chung cho input, table, button, badge, card va breadcrumb.', 'Portal shell now consumes shared tokens for input, table, button, badge, card, and breadcrumb.')
    },
    {
      area: L('Evidence Control / Online Forms', 'Evidence Control / Online Forms'),
      status: statusChip('full', L('Bridge alias active', 'Bridge alias active')),
      note: L('He ec-* da duoc bridge ve token chung de light, dark, density va component sizing di cung mot duong.', 'The ec-* layer is now bridged back to shared tokens so light, dark, density, and component sizing run through one path.')
    },
    {
      area: L('eQMS runtime', 'eQMS runtime'),
      status: statusChip('full', L('Bridge alias active', 'Bridge alias active')),
      note: L('Eqms input, button, table, section, progress va fallback signature da tro lai contract chung.', 'eQMS inputs, buttons, tables, sections, progress, and signature fallback now map back to the shared contract.')
    },
    {
      area: L('Evidence Vault', 'Evidence Vault'),
      status: statusChip('full', L('External stylesheet + bridge', 'External stylesheet + bridge')),
      note: L('Khong con duoc phep dua vao JS inject chrome; shell nay phai doc stylesheet va token chung.', 'The module may no longer rely on JS-injected chrome; it must read its shell from stylesheet + shared tokens.')
    },
    {
      area: L('Compliance Reports', 'Compliance Reports'),
      status: statusChip('full', L('External stylesheet + bridge', 'External stylesheet + bridge')),
      note: L('Report tabs, KPI, forms, tables, progress va evidence checklist da di qua stylesheet token hoa.', 'Report tabs, KPI, forms, tables, progress, and evidence checklist now flow through a tokenized stylesheet.')
    },
    {
      area: L('Schema Studio data views', 'Schema Studio data views'),
      status: statusChip('full', L('Table tokenized', 'Table tokenized')),
      note: L('Bang du lieu va control chinh da nghe table/input density thay vi giu padding rieng.', 'Data tables and primary controls now respect shared table/input density instead of keeping private padding.')
    },
    {
      area: L('Admin docs, retention, version history', 'Admin docs, retention, version history'),
      status: statusChip('partial', L('Legacy cleanup tiep tuc', 'Legacy cleanup continues')),
      note: L('Da duoc chinh mot phan, nhung van con mot so render inline can refactor tiep. Tu gio khong module moi nao duoc copy pattern nay.', 'This area has been improved, but some inline legacy rendering remains. No new module is allowed to copy that pattern.')
    }
  ];

  h += sectionLead(
    L('Graphics governance control plane', 'Graphics governance control plane'),
    L('Khu vực này tổng hợp authority status, impact analysis, compliance matrix, drift detector, audit history và waiver workflow theo Standard 36.', 'This area centralizes authority status, impact analysis, compliance matrix, drift detector, audit history, and waiver workflow under Standard 36.'),
    statusChip('admin', 'Standard 36') + statusChip('full', L('Governed behaviors', 'Governed behaviors'))
  );
  h += renderAuthorityStatusPanelWrapped();
	  h += '<div id="adm-graphics-impact-panel" style="margin-bottom:16px">'+renderImpactAnalysisPanel(false)+'</div>';
	  h += renderChangeSetPanel();
	  h += renderLineageGraphPanel();
	  h += renderComplianceMatrixPanel();
	  h += renderDriftDetectorPanel();
	  h += renderDebtObservatoryPanel();
	  h += renderReleaseBlockersPanel(10);
	  h += renderRuntimeGraphicsDiagnosticsPanel();
	  h += renderRuntimeBeaconPanel();
	  h += renderReleaseDashboardPanel();
	  h += renderReleaseLinkagePanel();
	  h += renderPolicyPacksPanel();
	  h += renderAuditHistoryPanel(10);
	  h += renderWaiverGovernancePanel();
  h += renderModuleComplianceEditorPanel();

  h += sectionLead(
    L('Graphics governance theo backend authority đã được kích hoạt', 'Backend-authority graphics governance is now active'),
    L('Tab này tổng hợp mức sử dụng template, compliance matrix cho contract mới, WCAG snapshot và bộ theme presets để preview/apply ngay trong studio.', 'This tab now centralizes template usage, compliance checks for the new contract, WCAG snapshots, and the visual themes library for direct preview/apply flows.'),
    statusChip('full', allTemplates.length + ' ' + T('templateCount')) + statusChip('preview', customTemplates.length + ' custom')
  );

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px">'
    + infoCard(L('Preset gốc', 'Base presets'), String(BASE_TEMPLATE_PRESETS.length), 'full')
    + infoCard(L('Template tùy chỉnh', 'Custom templates'), String(customTemplates.length), customTemplates.length ? 'preview' : 'partial')
    + infoCard(L('Theme presets', 'Theme presets'), String(VISUAL_THEMES.length), 'full')
    + infoCard(L('Default builder entry', 'Default builder entry'), 'templates → detail → editor', 'admin')
    + '</div>';

  h += sect(
    L('Template usage report', 'Template usage report'),
    '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Template</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Category</th>'
      + '<th style="text-align:right;padding:8px;border-bottom:1px solid var(--border)">Zones</th>'
      + '<th style="text-align:right;padding:8px;border-bottom:1px solid var(--border)">Modules</th>'
      + '</tr></thead><tbody>'
      + allTemplates.slice(0, 18).map(function(tpl){
          var cat = TEMPLATE_CATEGORIES.find(function(item){ return item.key === tpl.category; });
          return '<tr>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border)"><strong>'+esc(tpl.id)+'</strong> '+esc(tpl.name.vi)+'</td>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border)">'+esc(cat ? cat.label[lang === 'en' ? 'en' : 'vi'] : tpl.category)+'</td>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono)">'+esc(String(tpl.zoneCount))+'</td>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border);text-align:right;font-family:var(--font-mono)">'+esc(String(getGovernedModulesForTemplate(tpl).length))+'</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>',
    true,
    statusChip('full', L('Template contract visible', 'Template contract visible'))
  );

  h += sect(
    L('Visual theme manager', 'Visual theme manager'),
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px">'+themeCards+'</div>',
    false,
    statusChip('preview', L('Apply + preview', 'Apply + preview'))
  );

  h += sectionLead(
    L('Governance contract for the world-class document platform', 'Governance contract for the world-class document platform'),
    L('Tab Giao dien la control surface cho token, component contract va quy tac tuan thu; backend graphics authority moi la machine source of truth. Module moi cua ERP, MES, eQMS phai an theo lop nay ngay tu dau, khong duoc tu xay mot design system rieng.', 'The Appearance tab is the control surface for tokens, component contracts, and compliance rules; backend graphics authority is the machine source of truth. New ERP, MES, and eQMS modules must plug into this layer from day one and may not create a separate design system.'),
    statusChip('admin', L('New-build baseline', 'New-build baseline')) + statusChip('full', L('No guessing allowed', 'No guessing allowed'))
  );

  h += '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin-bottom:16px">'
    + infoCard(
      L('Authority model', 'Authority model'),
      L('Admin Appearance -> Theme runtime -> Shared tokens -> Approved bridge aliases -> Module UI. Moi lop sau phai doc lop truoc, khong duoc di nguoc.', 'Admin Appearance -> Theme runtime -> Shared tokens -> Approved bridge aliases -> Module UI. Each lower layer must read from the previous one, never bypass it.'),
      'full'
    )
    + infoCard(
      L('World-class baseline', 'World-class baseline'),
      L('Chuan moi dua tren dossier world-class trong docs/design-system-standard-2026.md, tong hop Carbon, Atlassian, SLDS, Material 3, Polaris va he enterprise data-heavy.', 'The new baseline follows the world-class dossier in docs/design-system-standard-2026.md, synthesizing Carbon, Atlassian, SLDS, Material 3, Polaris, and other data-heavy enterprise systems.'),
      'full'
    )
    + infoCard(
      L('Extension policy', 'Extension policy'),
      L('Chi them option moi vao Admin Appearance khi no la token dung duoc cho nhieu module, co preview ro, co consumer that, va co tai lieu governance di kem.', 'Add a new Admin Appearance option only when it is a reusable token across multiple modules, has a clear preview, a real consumer, and matching governance documentation.'),
      'preview'
    )
    + '</div>';

  h += sect(
    'Operating model',
    '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Layer</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Owner</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Rule</th>'
      + '</tr></thead><tbody>'
      + '<tr><td style="padding:8px;border-bottom:1px solid var(--border)">Admin Appearance</td><td style="padding:8px;border-bottom:1px solid var(--border)">Design authority</td><td style="padding:8px;border-bottom:1px solid var(--border)">Defines tokens, previews, compliance notes, and adoption intent.</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid var(--border)">Theme runtime</td><td style="padding:8px;border-bottom:1px solid var(--border)">Platform core</td><td style="padding:8px;border-bottom:1px solid var(--border)">Maps config to CSS variables. No module may write competing root values.</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid var(--border)">Shared components</td><td style="padding:8px;border-bottom:1px solid var(--border)">Platform core</td><td style="padding:8px;border-bottom:1px solid var(--border)">hm-* classes and token consumers are the preferred default for every new screen.</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid var(--border)">Bridge aliases</td><td style="padding:8px;border-bottom:1px solid var(--border)">Module owner</td><td style="padding:8px;border-bottom:1px solid var(--border)">Allowed only to translate legacy module vars back to shared tokens, never the other way around.</td></tr>'
      + '<tr><td style="padding:8px;border-bottom:1px solid var(--border)">Module UI</td><td style="padding:8px;border-bottom:1px solid var(--border)">Feature team</td><td style="padding:8px;border-bottom:1px solid var(--border)">May choose layout and information architecture, but not private color, spacing, or control rules.</td></tr>'
      + '</tbody></table>',
    true,
    statusChip('full', L('Mandatory for all new modules', 'Mandatory for all new modules'))
  );

  h += sect(
    'Non-negotiable rules',
    '<ol style="margin:0;padding-left:18px;font-size:12px;line-height:1.8;color:var(--text-secondary)">'
      + '<li>Never hardcode presentation values when a shared token exists. That includes color, spacing, radius, border width, shadow, typography, and motion.</li>'
      + '<li>No JS-generated stylesheet may define the visual shell of a module when a real stylesheet can do it. Runtime injection is allowed only for emergency fallback or data-driven geometry.</li>'
      + '<li>No module-local design system is allowed unless it is only an alias layer back to shared tokens.</li>'
      + '<li>Inline style is allowed only for computed geometry or truly per-record data, not for reusable visual design decisions.</li>'
      + '<li>Every control must pass light, dark, auto, and scheduled theme without private overrides.</li>'
      + '<li>Every control must respond to density and sizing tokens where applicable: button, input, table, card, tab, modal, tooltip, dropdown, pagination, progress, field, and breadcrumb.</li>'
      + '<li>Every module must expose focus-visible, hover, active, disabled, selected, and empty states through the shared token system.</li>'
      + '<li>Any new specialized pattern must ship with four things on day one: token names, admin preview, at least one real consumer, and written governance notes.</li>'
      + '<li>Code review must reject any new UI that forces teammates to guess which value controls it from Admin Appearance.</li>'
      + '</ol>',
    true,
    statusChip('full', L('Review gate', 'Review gate')) + statusChip('admin', L('Reject on violation', 'Reject on violation'))
  );

  h += sect(
    'Document system compliance matrix',
    '<table style="width:100%;border-collapse:collapse;font-size:12px">'
      + '<thead><tr>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Area</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Status</th>'
      + '<th style="text-align:left;padding:8px;border-bottom:1px solid var(--border)">Notes</th>'
      + '</tr></thead><tbody>'
      + modules.map(function(row){
          return '<tr>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top;font-weight:700;color:var(--text-primary)">'+esc(row.area)+'</td>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top">'+row.status+'</td>'
            + '<td style="padding:8px;border-bottom:1px solid var(--border);vertical-align:top;color:var(--text-secondary);line-height:1.6">'+esc(row.note)+'</td>'
            + '</tr>';
        }).join('')
      + '</tbody></table>',
    true,
    statusChip('full', L('Live governance snapshot', 'Live governance snapshot'))
  );

  h += sect(
    'Release gate for every new module',
    '<ul style="margin:0;padding-left:18px;font-size:12px;line-height:1.8;color:var(--text-secondary)">'
      + '<li>Use shared hm-* components first. If bridging legacy selectors, document the alias and keep it thin.</li>'
      + '<li>Show a preview in Admin Appearance if the module introduces a new governed pattern.</li>'
      + '<li>Demonstrate that changing Admin Appearance visibly changes the real module, not only the preview.</li>'
      + '<li>Ship with zero orphan tokens: every new token must have both a preview and a real consumer.</li>'
      + '<li>Ship with zero hidden floors: density or padding set to 0 must not be blocked by native min-height, line-height, or legacy hardcoded padding.</li>'
      + '<li>Pass WCAG AA for core text pairs and keep touch targets safe on mobile.</li>'
      + '</ul>',
    false,
    statusChip('full', L('Definition of done', 'Definition of done'))
  );

  h += sect(
    'Reference dossier',
    '<div style="display:grid;gap:10px">'
      + infoCard(
          'docs/design-system-standard-2026.md',
          L('Dossier baseline tong hop chuan enterprise hien dai, la nen de chot typography, spacing, sizing va component contract.', 'Baseline dossier synthesizing modern enterprise standards for typography, spacing, sizing, and component contracts.'),
          'full'
        )
      + infoCard(
          'docs/document-graphics-governance-2026-04-05.md',
          L('Tai lieu governance moi cho he tai lieu: quy tac bat buoc, compliance matrix, release gate va quy trinh mo rong Admin Appearance.', 'New governance document for the document platform: mandatory rules, compliance matrix, release gates, and the process for extending Admin Appearance.'),
          'full'
        )
      + '</div>',
    false,
    statusChip('full', L('Use in onboarding and review', 'Use in onboarding and review'))
  );

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 8: ADVANCED ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderAdvanced(){
  var selected = _selectedTemplate ? getTemplateById(_selectedTemplate) : null;
  var h = renderRolloutControls(selected);
  h += renderChangeSetPanel();
  h += renderReleaseDashboardPanel();
  h += renderReleaseLinkagePanel();
  h += renderPolicyPacksPanel();
  h += renderReleaseBlockersPanel(8);
  h += renderWaiverGovernancePanel();
  h += renderAuditHistoryPanel(8);
  h += renderApiContractPanel();

	  h += sect('📤 '+T('importExport'),
	    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
	    +'<button class="hm-btn hm-btn-secondary" onclick="_admExportTheme()">📥 Export JSON</button>'
	    +'<button class="hm-btn hm-btn-secondary" onclick="_admImportTheme()">📤 Import JSON</button>'
	    +'<button class="hm-btn hm-btn-secondary" onclick="_admExportDraftCache()">🧾 '+esc(L('Export draft cache', 'Export draft cache'))+'</button>'
	    +'<button class="hm-btn hm-btn-secondary" onclick="_admImportDraftCache()">📂 '+esc(L('Import draft cache', 'Import draft cache'))+'</button>'
    +'</div>'
    +'<div style="font-size:11px;line-height:1.7;color:var(--text-secondary);margin-top:8px">'+esc(L('Template export/import ở đây chỉ thao tác draft cache. Controlled registry phải đến từ backend graphics_template_registry_get.', 'Template export/import here only touches draft cache. The controlled registry must come from backend graphics_template_registry_get.'))+'</div>'
  , true);

	  h += sect('🖊️ '+T('customCSS'),
	    '<textarea id="adm_custom_css" style="width:100%;min-height:120px;font-family:var(--font-mono);font-size:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt,#f8fafc);color:var(--text-primary);resize:vertical"'
	    +' oninput="_hmSet(\'\',\'advanced.customCSS\',this.value)">'+(cfg('advanced.customCSS')||'')+'</textarea>'
	    +'<div style="font-size:11px;color:var(--text-secondary);margin-top:6px;line-height:1.6">'+esc(L('Emergency/exception use only. Custom CSS must have a waiver, owner, expiry, and migration path back to shared token/component contracts before rollout.', 'Emergency/exception use only. Custom CSS must have a waiver, owner, expiry, and migration path back to shared token/component contracts before rollout.'))+'</div>'
	  , false, statusChip('partial', L('Exception only', 'Exception only')));

  h += sect('♿ WCAG '+T('wcag'),
    (function(){
      var pairs = [
        ['Text Primary vs Surface', cfg('colorsLight.textPrimary')||'#1e293b', cfg('colorsLight.bgSurface')||'#ffffff'],
        ['Text Secondary vs Surface', cfg('colorsLight.textSecondary')||'#64748b', cfg('colorsLight.bgSurface')||'#ffffff'],
        ['Text Tertiary vs Surface', cfg('colorsLight.textTertiary')||'#94a3b8', cfg('colorsLight.bgSurface')||'#ffffff'],
        ['Link vs Surface', cfg('colorsLight.textLink')||'#1565c0', cfg('colorsLight.bgSurface')||'#ffffff']
      ];
      var out = '<table style="width:100%;font-size:11px;border-collapse:collapse">';
      out += '<tr><th style="text-align:left;padding:4px">Pair</th><th style="text-align:right;padding:4px">Ratio</th><th style="text-align:center;padding:4px">AA</th></tr>';
      pairs.forEach(function(p){
        var ratio = HmTheme.contrastRatio(p[1], p[2]);
        var pass = ratio >= 4.5;
        out += '<tr><td style="padding:4px;border-bottom:1px solid var(--border)">'+p[0]+'</td>';
        out += '<td style="text-align:right;padding:4px;border-bottom:1px solid var(--border);font-family:var(--font-mono)">'+ratio.toFixed(1)+':1</td>';
        out += '<td style="text-align:center;padding:4px;border-bottom:1px solid var(--border)">'+(pass?'✅':'❌')+'</td></tr>';
      });
      return out + '</table>';
    })()
  , false);

  h += sect('⚠️ '+T('coreStandard'),
    '<div style="padding:12px;background:var(--amber-bg,rgba(217,119,6,0.08));border:1px solid var(--amber,#d97706);border-radius:8px;font-size:12px;line-height:1.6">'
    +'<strong>⚠️ CORE STANDARD — CẤM HARDCODE</strong><br>'
    +'Tất cả thuộc tính đồ họa PHẢI dùng CSS variables.<br>'
    +'Admin điều khiển qua tab này. Vi phạm = code review REJECT.<br>'
    +'<code style="font-size:11px;background:var(--bg-surface-alt);padding:2px 6px;border-radius:3px">var(--brand-2)</code> '
    +'<code style="font-size:11px;background:var(--bg-surface-alt);padding:2px 6px;border-radius:3px">var(--text-primary)</code> '
    +'<code style="font-size:11px;background:var(--bg-surface-alt);padding:2px 6px;border-radius:3px">var(--hds-control-h)</code> '
    +'<code style="font-size:11px;background:var(--bg-surface-alt);padding:2px 6px;border-radius:3px">var(--border)</code>'
    +'</div>'
  , true);

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 9: V4 DESIGN STANDARD ─────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */

/* Global helper — navigate the embedded V4 iframe to an anchor without reloading */
window._admV4Jump = function(anchor){
  var V4_PATH = 'design/module-layout-template-design-system-v4.html';
  var f = document.getElementById('adm-v4-standard-frame');
  if(!f) return;
  try {
    if(f.contentDocument && f.contentDocument.readyState === 'complete'){
      f.contentWindow.location.hash = anchor;
    } else {
      f.src = V4_PATH + '#' + anchor;
    }
  } catch(e){
    f.src = V4_PATH + '#' + anchor;
  }
};

function renderStandard(){
  var V4_PATH = 'design/module-layout-template-design-system-v4.html';
  var IID    = 'adm-v4-standard-frame';

  /* Section groups — mirrors the TOC in V4 HTML */
  var SECTIONS = [
    { group: L('Nền tảng', 'Foundation'), items: [
      {id:'summary',          label:L('Tóm tắt','Summary')},
      {id:'architecture',     label:L('Kiến trúc','Architecture')},
      {id:'standards',        label:L('Quy chuẩn','Standards')},
      {id:'token-reference',  label:L('Tokens','Tokens')},
      {id:'token-cascade',    label:L('Token Cascade','Token Cascade')},
      {id:'visual-themes',    label:L('Themes','Themes')}
    ]},
    { group: L('Components', 'Components'), items: [
      {id:'component-states', label:L('Trạng thái','States')},
      {id:'density-modes',    label:L('Mật độ','Density')},
      {id:'dark-mode-mapping',label:L('Dark Mode','Dark Mode')},
      {id:'form-rules',       label:L('Forms','Forms')},
      {id:'table-rules',      label:L('Tables','Tables')},
      {id:'modal-rules',      label:L('Modals','Modals')},
      {id:'nav-rules',        label:L('Navigation','Navigation')},
      {id:'component-presets',label:L('Presets','Presets')}
    ]},
    { group: L('Template catalog', 'Template catalog'), items: [
      {id:'zone-system',      label:L('Zones','Zones')},
      {id:'block-engine',     label:L('Blocks','Blocks')},
      {id:'block-schema',     label:L('Block Schema','Block Schema')},
      {id:'cat-overview',     label:L('Tổng quan','Overview')},
      {id:'cat-quality',      label:L('Quality','Quality')},
      {id:'cat-production',   label:L('Production','Production')},
      {id:'cat-engineering',  label:L('Engineering','Engineering')},
      {id:'cat-purchasing',   label:L('Purchasing','Purchasing')},
      {id:'cat-warehouse',    label:L('Warehouse','Warehouse')},
      {id:'cat-finance',      label:L('Finance','Finance')},
      {id:'cat-admin',        label:L('Admin','Admin')},
      {id:'cat-cross',        label:L('Cross-module','Cross-module')}
    ]},
    { group: L('UX patterns', 'UX patterns'), items: [
      {id:'accessibility',        label:L('ARIA','ARIA')},
      {id:'error-patterns',       label:L('Lỗi','Errors')},
      {id:'loading-patterns',     label:L('Loading','Loading')},
      {id:'empty-states',         label:L('Trống','Empty')},
      {id:'notification-patterns',label:L('Thông báo','Notifications')},
      {id:'interaction-patterns', label:L('Tương tác','Interactions')},
      {id:'keyboard-rules',       label:L('Phím tắt','Keyboard')},
      {id:'responsive-rules',     label:L('Responsive','Responsive')},
      {id:'icon-rules',           label:L('Icons','Icons')},
      {id:'scroll-ux',            label:L('Scroll','Scroll')}
    ]},
    { group: L('Regulated / MES', 'Regulated / MES'), items: [
      {id:'shop-floor-mode',          label:L('Xưởng SX','Shopfloor')},
      {id:'compliance-forms',         label:L('21 CFR','21 CFR')},
      {id:'manufacturing-precision',  label:L('MES chính xác','MES precision')},
      {id:'regulatory-precision',     label:L('Tuân thủ','Regulatory')},
      {id:'print-layouts',            label:L('In ấn','Print')},
      {id:'realtime-dashboard',       label:L('Realtime','Realtime')},
      {id:'operator-interface',       label:L('Operator','Operator')},
      {id:'offline-pwa-shop-floor',   label:L('Offline/PWA','Offline/PWA')},
      {id:'shift-handover-production',label:L('Handover','Handover')}
    ]},
    { group: L('Governance (Standard 36)', 'Governance (Standard 36)'), items: [
      {id:'governance',                       label:L('Governance','Governance')},
      {id:'standard-36-alignment-overview',   label:L('Authority','Authority')},
      {id:'admin-graphics-control-plane',     label:L('Graphics Control','Graphics Control')},
      {id:'module-archetypes-standard-36',    label:L('Archetypes','Archetypes')},
      {id:'template-naming-standard-archetype',label:L('Template ID','Template ID')},
      {id:'module-build-packet-standard-36',  label:L('Build Packet','Build Packet')},
      {id:'block-contract-standard-36',       label:L('Block Contract','Block Contract')},
      {id:'qa-gate-matrix-standard-36',       label:L('QA Gates','QA Gates')},
      {id:'definition-of-done-standard-36',   label:L('DoD','DoD')},
      {id:'runtime-api-spec',                 label:L('Runtime & API','Runtime & API')},
      {id:'backend-graphics-authority-api-contract',label:L('Graphics API','Graphics API')},
      {id:'inline-edit-interaction-pattern',  label:L('Inline Edit','Inline Edit')},
      {id:'command-palette-pattern',          label:L('Command Palette','Command Palette')}
    ]}
  ];

  var h = '';

  h += sectionLead(
    L('Module Layout Template Design System V4 — nhúng trực tiếp', 'Module Layout Template Design System V4 — embedded'),
    L('Toàn bộ 90 section, 12,999 dòng của bản chuẩn thiết kế V4 được nhúng ngay vào đây. Click vào section muốn đọc, hoặc mở tab mới để xem toàn màn hình.', 'All 90 sections and 12,999 lines of the V4 design standard are embedded here. Click any section to navigate, or open a new tab for full-screen reading.'),
    statusChip('admin', 'Single-source authority')
    + statusChip('full', '90 sections')
    + statusChip('full', '384+ tokens')
    + statusChip('preview', '123 templates')
  );

  /* ── Quick-jump navigation ──────────────────────────────────────────────── */
  h += '<div style="margin-bottom:14px;padding:12px 14px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface)">';
  h += '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:10px;flex-wrap:wrap">';
  h += '<div style="font-size:11px;font-weight:800;color:var(--text-primary)">'+L('Nhảy nhanh đến section','Quick jump to section')+'</div>';
  h += '<div style="display:flex;gap:6px;align-items:center">';
  h += '<button type="button" onclick="(function(){var f=document.getElementById(\''+IID+'\');if(f)f.src=\''+V4_PATH+'\';})()" '
    + 'style="padding:4px 10px;font-size:11px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--text-secondary);cursor:pointer">'+L('↺ Đầu trang','↺ Reset')+'</button>';
  h += '<a href="'+V4_PATH+'" target="_blank" rel="noopener noreferrer" '
    + 'style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;font-size:11px;font-weight:600;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface);color:var(--brand-2);text-decoration:none">'+L('↗ Tab mới','↗ New tab')+'</a>';
  h += '</div></div>';

  SECTIONS.forEach(function(grp){
    h += '<div style="margin-bottom:8px">';
    h += '<div style="font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:var(--text-tertiary);margin-bottom:4px">'+esc(grp.group)+'</div>';
    h += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
    grp.items.forEach(function(s){
      h += '<button type="button" onclick="_admV4Jump(\''+esc(s.id)+'\')" '
        + 'style="padding:3px 9px;font-size:10px;border:1px solid var(--border);border-radius:999px;background:var(--bg-surface-alt,var(--bg-hover));color:var(--text-secondary);cursor:pointer;white-space:nowrap;transition:background var(--transition-fast)" '
        + 'onmouseover="this.style.background=\'var(--bg-hover)\';this.style.color=\'var(--brand-2)\'" '
        + 'onmouseout="this.style.background=\'var(--bg-surface-alt,var(--bg-hover))\';this.style.color=\'var(--text-secondary)\'">'+esc(s.label)+'</button>';
    });
    h += '</div></div>';
  });
  h += '</div>';

  /* ── Embedded iframe ────────────────────────────────────────────────────── */
  h += '<div style="border:1px solid var(--border);border-radius:var(--radius-xl);overflow:hidden;box-shadow:var(--shadow-md)">';

  /* Browser chrome bar */
  h += '<div style="display:flex;align-items:center;gap:8px;padding:8px 12px;background:var(--bg-surface-alt,var(--bg-hover));border-bottom:1px solid var(--border)">';
  h += '<div style="display:flex;gap:5px">'
    + '<span style="width:11px;height:11px;border-radius:50%;background:var(--red,#dc2626);opacity:.7"></span>'
    + '<span style="width:11px;height:11px;border-radius:50%;background:var(--amber,#d97706);opacity:.7"></span>'
    + '<span style="width:11px;height:11px;border-radius:50%;background:var(--green,#16a34a);opacity:.7"></span>'
    + '</div>';
  h += '<div style="flex:1;margin:0 8px;padding:3px 10px;background:var(--bg-surface);border:1px solid var(--border);border-radius:var(--radius-md);font-size:10px;font-family:var(--font-mono,monospace);color:var(--text-tertiary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis">'+esc(V4_PATH)+'</div>';
  h += '<a href="'+V4_PATH+'" target="_blank" rel="noopener noreferrer" title="'+L('Mở tab mới','Open new tab')+'" style="font-size:13px;color:var(--text-tertiary);text-decoration:none;line-height:1" onmouseover="this.style.color=\'var(--brand-2)\'" onmouseout="this.style.color=\'var(--text-tertiary)\'">↗</a>';
  h += '</div>';

  /* The iframe */
  h += '<iframe id="'+IID+'" '
    + 'src="'+V4_PATH+'" '
    + 'title="'+L('HESEM Module Layout Template Design System V4','HESEM Module Layout Template Design System V4')+'" '
    + 'style="width:100%;height:calc(100vh - 280px);min-height:640px;max-height:1200px;border:none;display:block" '
    + 'loading="lazy">'
    + '<p style="padding:20px;font-size:13px">'+L('Iframe không được hỗ trợ — ','Iframe not supported — ')
    + '<a href="'+V4_PATH+'" target="_blank" rel="noopener noreferrer">'+L('mở file V4 trong tab mới','open V4 file in new tab')+'</a></p>'
    + '</iframe>';

  h += '</div>';

  return h;
}

/* ── Expose ──────────────────────────────────────────────────────────────── */
window._renderAdminAppearanceFullVersion = '20260413c';
window._renderAdminAppearanceFull = render;

})();
