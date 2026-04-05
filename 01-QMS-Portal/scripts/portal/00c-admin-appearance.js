/* ============================================================================
   HESEM QMS — Admin Appearance Editor v2.0
   Enterprise-grade theme editor with 6 sub-tabs, 150+ controls.
   Loaded on-demand when admin navigates to Appearance tab.
   ============================================================================ */
(function(){
'use strict';

var _subTab = 'overview';

function T(k){
  var en={
    overview:'Overview',typography:'Typography',colors:'Colors',layout:'Layout & Sizing',effects:'Effects',advanced:'Advanced',
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
    overview:'Tổng quan',typography:'Kiểu chữ',colors:'Màu sắc',layout:'Bố cục',effects:'Hiệu ứng',advanced:'Nâng cao',
    presets:'Thiết lập nhanh',livePreview:'Xem trước thành phần',
    compact:'Gọn',default:'Mặc định',comfortable:'Thoải mái',custom:'Tùy chỉnh',
    light:'Sáng',dark:'Tối',auto:'Tự động (OS)',schedule:'Hẹn giờ',
    sharp:'Sắc nét',rounded:'Bo tròn',pill:'Viên thuốc',
    normal:'Bình thường',reduced:'Giảm',off:'Tắt',
    saveOrg:'Lưu cho tổ chức',reset:'Đặt lại tất cả',saved:'Đã lưu cài đặt',resetDone:'Đã đặt lại mặc định',
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

function esc(v){ var d=document.createElement('div'); d.appendChild(document.createTextNode(v==null?'':String(v))); return d.innerHTML; }
function cfg(path){ return window.HmTheme ? (HmTheme.getDeep(path) || '') : ''; }
function cfgNum(path, def){ var v=cfg(path); return v!==''&&v!==undefined ? parseFloat(v) : def; }

/**
 * _hmSet: Apply CSS variable instantly AND persist to localStorage.
 * This is the CORE function — every control must call this, not setVar alone.
 */
window._hmSet = function(cssVar, path, value){
  HmTheme.setVar(cssVar, value);          /* instant CSS update */
  HmTheme.setDeep(path, value);           /* persist to localStorage */
};
window._hmSetWithUnit = function(cssVar, path, value, unit){
  var raw = value == null ? '' : String(value);
  var applied = raw;
  if(unit && /^-?\d*\.?\d+$/.test(raw)) applied = raw + unit;
  window._hmSet(cssVar, path, applied);
};

/* ── Helper: slider + number input ──────────────────────────────────────── */
function slider(label, cssVar, path, min, max, def, unit, step){
  var val = cfgNum(path, def);
  step = step || 1;
  var u = unit || 'px';
  var sid = 'adm_s_'+path.replace(/\./g,'_');
  var nid = 'adm_n_'+path.replace(/\./g,'_');
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
  h += '<select id="'+sid+'" data-role="select" onchange="var v=this.value;if(v===\'__custom__\'){document.getElementById(\''+tid+'\').style.display=\'block\';}else{document.getElementById(\''+tid+'\').style.display=\'none\';_hmSet(\''+cssVar+'\',\''+path+'\',v);}" style="flex:1;height:32px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px;background:var(--bg-surface)">';
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
function sect(title, content, open){
  return '<details style="margin-bottom:16px;border:1px solid var(--border);border-radius:var(--radius-lg);background:var(--bg-surface);overflow:hidden"'+(open?' open':'')+'>'
    +'<summary style="padding:12px 16px;font-weight:600;font-size:13px;cursor:pointer;background:var(--bg-surface-alt,var(--bg-hover));user-select:none">'+title+'</summary>'
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
    + '<span class="hm-badge hm-badge-review"><i style="display:inline-flex;align-items:center;justify-content:center;border-radius:999px;background:currentColor;color:#fff">i</i>Badge</span>'
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
  return previewBox('Preview button', '<div style="display:flex;gap:8px;flex-wrap:wrap"><button class="hm-btn hm-btn-primary">Primary</button><button class="hm-btn hm-btn-secondary">Secondary</button><button class="hm-btn hm-btn-ghost">Ghost</button><button class="hm-btn hm-btn-danger">Danger</button></div>');
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
    + '<div class="hm-tabs" style="margin-bottom:0"><button class="hm-tab active">Overview</button><button class="hm-tab">Runtime</button><button class="hm-tab">History</button></div>'
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
/* ── RENDER MAIN ────────────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */

function render(el, subTab, currentLang){
  _subTab = subTab || _subTab;

  var tabs = [
    {key:'overview', icon:'🎛️', label:T('overview')},
    {key:'typography', icon:'🔤', label:T('typography')},
    {key:'colors', icon:'🎨', label:T('colors')},
    {key:'layout', icon:'📐', label:T('layout')},
    {key:'effects', icon:'✨', label:T('effects')},
    {key:'components', icon:'🧱', label:T('components')},
    {key:'advanced', icon:'🧩', label:T('advanced')}
  ];

  var h = '<div style="max-width:900px;margin:0 auto">';

  /* Title */
  h += '<div style="margin-bottom:16px"><h3 style="margin:0;font-size:18px;font-weight:700">🎨 '+(typeof lang!=='undefined'&&lang==='en'?'System Appearance':'Giao diện hệ thống')+'</h3>';
  h += '<div style="margin-top:6px;padding:5px 10px;background:var(--blue-bg,rgba(37,99,235,0.08));border:1px solid var(--blue,#2563eb);border-radius:6px;font-size:11px;color:var(--blue,#2563eb)">💡 '+T('liveHint')+'</div></div>';

  /* Sub-tab bar */
  h += '<div style="display:flex;flex-wrap:wrap;gap:4px;border-bottom:2px solid var(--border);margin-bottom:16px">';
  tabs.forEach(function(t){
    var active = _subTab===t.key;
    h += '<button style="padding:8px 14px;font-size:12px;font-weight:600;border:none;background:none;cursor:pointer;white-space:nowrap;border-bottom:2px solid '
      +(active?'var(--brand-2)':'transparent')+';margin-bottom:-2px;color:'+(active?'var(--brand-2)':'var(--text-secondary)')
      +'" onclick="_appSubTab=\''+t.key+'\';renderAdminAppearance()">'+t.icon+' '+esc(t.label)+'</button>';
  });
  h += '</div>';

  /* Sub-tab content */
  switch(_subTab){
    case 'overview': h += renderOverview(); break;
    case 'typography': h += renderTypography(); break;
    case 'colors': h += renderColors(); break;
    case 'layout': h += renderLayout(); break;
    case 'effects': h += renderEffects(); break;
    case 'components': h += renderComponents(); break;
    case 'advanced': h += renderAdvanced(); break;
    default: h += renderOverview();
  }

  /* Global actions */
  h += '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:20px;padding-top:16px;border-top:1px solid var(--border)">';
  h += '<button class="hm-btn hm-btn-primary" onclick="_saveAllAppearance()">'+T('saveOrg')+'</button>';
  h += '<button class="hm-btn hm-btn-secondary" onclick="HmTheme.reset();renderAdminAppearance()">'+T('reset')+'</button>';
  h += '</div>';

  h += '</div>';
  el.innerHTML = h;
}

/* ── Save all ────────────────────────────────────────────────────────────── */
window._saveAllAppearance = function(){
  var cfg = HmTheme.getFullConfig();
  HmTheme.saveAdminConfig(cfg, function(ok){
    if(typeof showToast==='function') showToast(T(ok?'saved':'error'), ok?'success':'error');
  });
};

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 1: OVERVIEW ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderOverview(){
  var cur = HmTheme.getAll();
  var h = '';

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
      +'<input type="time" value="'+(cfg('colorSchedule.darkFrom')||'18:00')+'" onchange="HmTheme.setDeep(\'colorSchedule.darkFrom\',this.value)" style="height:28px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
      +'<span style="font-size:12px">'+T('darkTo')+'</span>'
      +'<input type="time" value="'+(cfg('colorSchedule.darkTo')||'06:00')+'" onchange="HmTheme.setDeep(\'colorSchedule.darkTo\',this.value)" style="height:28px;border:1px solid var(--border);border-radius:4px;font-size:12px">'
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
  , true);

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
  , true);

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

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 4: LAYOUT ──────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderLayout(){
  var h = '';

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
  , false);

  h += sect('📋 '+T('tableDetail'),
    slider('Row height', '--hds-table-row-h', 'density.tableRowH', 28, 56, 40, 'px')
    + slider('Cell padding X', '--hds-table-cell-px', 'density.tableCellPx', 4, 20, 12, 'px')
    + slider('Cell padding Y', '--hds-table-cell-py', 'density.tableCellPy', 2, 16, 8, 'px')
    + slider('Header font', '--hds-table-head-font', 'density.tableHeadFont', 9, 14, 11, 'px')
    + slider('Body font', '--hds-table-body-font', 'density.tableBodyFont', 10, 16, 13, 'px')
    + previewTableDensity()
  , false);

  h += sect('🔲 '+T('radiusScale'),
    slider('Radius sm', '--radius-sm', 'radius.sm', 0, 12, 4, 'px')
    + slider('Radius md (controls)', '--radius-md', 'radius.md', 0, 16, 6, 'px')
    + slider('Radius lg (cards)', '--radius-lg', 'radius.lg', 0, 20, 8, 'px')
    + slider('Radius xl (sections)', '--radius-xl', 'radius.xl', 0, 24, 12, 'px')
    + slider('Radius 2xl (modals)', '--radius-2xl', 'radius.2xl', 0, 32, 16, 'px')
    + previewRadiusScale()
  , false);

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
  , false);

  h += sect('📐 '+T('layoutDim'),
    slider('Sidebar width', '--sidebar-w', 'layout.sidebarW', 180, 360, 260, 'px')
    + slider('Sidebar collapsed', '--sidebar-w-collapsed', 'layout.sidebarCollapsed', 40, 80, 56, 'px')
    + slider('Header height', '--header-h', 'layout.headerH', 36, 72, 52, 'px')
    + slider('Content max-width', '--content-max-w', 'layout.contentMaxW', 960, 2400, 1400, 'px')
    + slider('Modal max-width', '--modal-max-w', 'layout.modalMaxW', 480, 1400, 800, 'px')
    + slider('Modal small max-width', '--modal-sm-max-w', 'layout.modalSmMaxW', 280, 720, 480, 'px')
    + previewLayoutDimensions()
  , false);

  h += sect('📊 '+T('zIndex')+' (read-only)',
    '<table style="width:100%;font-size:11px;border-collapse:collapse"><thead><tr><th style="text-align:left;padding:4px 8px;border-bottom:1px solid var(--border)">Layer</th><th style="text-align:right;padding:4px 8px;border-bottom:1px solid var(--border)">Value</th></tr></thead><tbody>'
    +[['Base',1],['Dropdown',100],['Sticky',200],['Sidebar',300],['Header',400],['Overlay',1200],['Modal',1300],['Toast',1400],['Tooltip',1500]]
    .map(function(r){return '<tr><td style="padding:3px 8px;border-bottom:1px solid var(--border)">'+r[0]+'</td><td style="text-align:right;padding:3px 8px;border-bottom:1px solid var(--border);font-family:var(--font-mono)">'+r[1]+'</td></tr>';}).join('')
    +'</tbody></table>'
  , false);

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 5: EFFECTS ─────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderEffects(){
  var h = '';

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

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 6: COMPONENTS ──────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderComponents(){
  var h = '';

  /* BUTTON */
  h += sect('🔘 '+T('btnSettings'),
    slider(T('paddingY'), '--btn-padding-y', 'components.btn.paddingY', 0, 12, 0, 'px')
    + slider(T('paddingX'), '--btn-padding-x', 'components.btn.paddingX', 4, 24, 10, 'px')
    + slider(T('gap')+' (icon↔text)', '--btn-gap', 'components.btn.gap', 2, 12, 6, 'px')
    + slider(T('fontWeight'), '--btn-font-weight', 'components.btn.fontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing'), '--btn-letter-spacing', 'components.btn.letterSpacing', 0, 0.15, 0, 'em', 0.01)
    + slider(T('borderWidth'), '--btn-border-width', 'components.btn.borderWidth', 0, 3, 1, 'px')
    + slider(T('minWidth'), '--btn-min-width', 'components.btn.minWidth', 0, 120, 0, 'px')
    + previewButtons()
  , true);

  /* TABLE */
  h += sect('📊 '+T('tableSettings'),
    colorPick(T('headerBg'), '--table-header-bg', 'components.table.headerBg', '#f1f5f9')
    + slider(T('fontWeight')+' header', '--table-header-font-weight', 'components.table.headerFontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing')+' header', '--table-header-letter-spacing', 'components.table.headerLetterSpacing', 0, 0.15, 0.05, 'em', 0.01)
    + colorPick(T('stripeBg'), '--table-row-stripe', 'components.table.stripeBg', 'transparent')
    + colorPick(T('stripeAltBg'), '--table-row-stripe-alt', 'components.table.stripeAltBg', 'rgba(0,0,0,0.02)')
    + slider(T('borderWidth'), '--table-border-width', 'components.table.borderWidth', 0, 3, 1, 'px')
    + previewTable()
  , false);

  /* CARD */
  h += sect('🃏 '+T('cardSettings'),
    slider(T('borderWidth'), '--card-border-width', 'components.card.borderWidth', 0, 3, 1, 'px')
    + colorPick(T('headerBg'), '--card-header-bg', 'components.card.headerBg', 'transparent')
    + slider(T('headerPadding'), '--card-header-padding-v', 'components.card.headerPadding', 8, 24, 12, 'px')
    + slider(T('bodyPadding'), '--card-body-padding', 'components.card.bodyPadding', 8, 32, 16, 'px')
    + previewCard()
  , false);

  /* BADGE */
  h += sect('🏷️ '+T('badgeSettings'),
    slider(T('fontWeight'), '--badge-font-weight', 'components.badge.fontWeight', 400, 800, 600, '', 100)
    + slider(T('letterSpacing'), '--badge-letter-spacing', 'components.badge.letterSpacing', 0, 0.15, 0, 'em', 0.01)
    + slider(T('borderWidth'), '--badge-border-width', 'components.badge.borderWidth', 0, 2, 0, 'px')
    + slider(T('minWidth'), '--badge-min-width', 'components.badge.minWidth', 0, 60, 0, 'px')
    + previewBadges()
  , false);

  /* INPUT */
  h += sect('📝 '+T('inputSettings'),
    slider(T('borderWidth'), '--input-border-width', 'components.input.borderWidth', 1, 3, 1, 'px')
    + slider(T('paddingY'), '--input-padding-y', 'components.input.paddingY', 0, 8, 0, 'px')
    + colorPick('Input BG', '--input-bg', 'components.input.bg', '#ffffff')
    + previewInputs()
  , false);

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
  , false);

  /* MODAL */
  h += sect('🪟 '+T('modalSettings'),
    slider('Border radius', '--modal-border-radius', 'components.modal.radius', 0, 32, 16, 'px')
    + slider(T('bodyPadding'), '--modal-padding', 'components.modal.padding', 12, 40, 24, 'px')
    + slider(T('headerPadding'), '--modal-header-padding-v', 'components.modal.headerPadding', 8, 24, 16, 'px')
    + previewModal()
  , false);

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
  , false);

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
  , false);

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
  , false);

  /* KPI CARD */
  h += sect('📊 '+T('kpiSettings'),
    slider(T('borderWidth'), '--kpi-border-width', 'components.kpi.borderWidth', 0, 3, 1, 'px')
    + slider('Icon size', '--kpi-icon-size', 'components.kpi.iconSize', 16, 40, 24, 'px')
    + slider('Trend font', '--kpi-trend-font-size', 'components.kpi.trendFontSize', 9, 14, 11, 'px')
    + previewKpi()
  , false);

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
  , false);

  /* DROPDOWN */
  h += sect('📋 '+T('dropdownSettings'),
    slider('Border radius', '--dropdown-radius', 'components.dropdown.radius', 0, 16, 8, 'px')
    + slider('Item padding', '--dropdown-item-padding', 'components.dropdown.itemPadding', 4, 16, 8, 'px')
    + slider('Item font', '--dropdown-item-font-size', 'components.dropdown.itemFontSize', 11, 16, 13, 'px')
    + colorPick('Hover BG', '--dropdown-item-hover-bg', 'components.dropdown.hoverBg', '#f8fafc')
    + previewDropdown()
  , false);

  /* NAV ITEM */
  h += sect('🧭 '+T('navSettings'),
    slider('Height', '--nav-item-height', 'components.nav.height', 28, 48, 36, 'px')
    + slider('Font size', '--nav-item-font-size', 'components.nav.fontSize', 11, 16, 13, 'px')
    + slider('Icon size', '--nav-item-icon-size', 'components.nav.iconSize', 12, 24, 16, 'px')
    + slider(T('gap'), '--nav-item-gap', 'components.nav.gap', 4, 16, 10, 'px')
    + slider('Border radius', '--nav-item-radius', 'components.nav.radius', 0, 16, 8, 'px')
    + previewNav()
  , false);

  /* PAGINATION */
  h += sect('📄 '+T('paginationSettings'),
    slider('Button size', '--pagination-btn-size', 'components.pagination.btnSize', 24, 44, 32, 'px')
    + slider('Border radius', '--pagination-btn-radius', 'components.pagination.radius', 0, 12, 6, 'px')
    + slider('Font size', '--pagination-font-size', 'components.pagination.fontSize', 11, 16, 13, 'px')
    + slider(T('gap'), '--pagination-gap', 'components.pagination.gap', 2, 8, 4, 'px')
    + previewPagination()
  , false);

  /* PROGRESS BAR */
  h += sect('📏 '+T('progressSettings'),
    slider('Height', '--progress-height', 'components.progress.height', 4, 16, 8, 'px')
    + slider('Border radius', '--progress-radius', 'components.progress.radius', 0, 16, 9999, 'px')
    + colorPick('Track BG', '--progress-bg', 'components.progress.bg', '#e2e8f0')
    + previewProgress()
  , false);

  /* EMPTY STATE */
  h += sect('📭 '+T('emptySettings'),
    slider('Icon size', '--empty-icon-size', 'components.empty.iconSize', 24, 80, 48, 'px')
    + slider('Icon opacity', '--empty-icon-opacity', 'components.empty.iconOpacity', 0.1, 0.8, 0.4, '', 0.05)
    + slider('Title font', '--empty-title-font-size', 'components.empty.titleFontSize', 14, 20, 16, 'px')
    + slider('Desc font', '--empty-desc-font-size', 'components.empty.descFontSize', 12, 16, 13, 'px')
    + previewEmpty()
  , false);

  /* FORM FIELD */
  h += sect('📝 '+T('fieldSettings'),
    slider('Field gap', '--field-gap', 'components.field.gap', 8, 28, 16, 'px')
    + slider('Label gap', '--field-label-gap', 'components.field.labelGap', 2, 8, 4, 'px')
    + slider('Group gap', '--field-group-gap', 'components.field.groupGap', 12, 40, 24, 'px')
    + slider('Helper font', '--field-helper-font-size', 'components.field.helperFontSize', 10, 14, 11, 'px')
    + previewField()
  , false);

  /* BREADCRUMB */
  h += sect('🔗 '+T('breadcrumbSettings'),
    slider('Font size', '--breadcrumb-font-size', 'components.breadcrumb.fontSize', 11, 16, 13, 'px')
    + slider(T('gap'), '--breadcrumb-gap', 'components.breadcrumb.gap', 2, 12, 6, 'px')
    + colorPick('Color', '--breadcrumb-color', 'components.breadcrumb.color', '#94a3b8')
    + colorPick('Active', '--breadcrumb-active-color', 'components.breadcrumb.activeColor', '#1e293b')
    + previewBreadcrumb()
  , false);

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 7: ADVANCED ────────────────────────────────────────────────── */
/* ══════════════════════════════════════════════════════════════════════════ */
function renderAdvanced(){
  var h = '';

  h += sect('📤 '+T('importExport'),
    '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    +'<button class="hm-btn hm-btn-secondary" onclick="(function(){var j=HmTheme.exportTheme();var b=new Blob([j],{type:\'application/json\'});var a=document.createElement(\'a\');a.href=URL.createObjectURL(b);a.download=\'hesem-theme.json\';a.click()})()">📥 Export JSON</button>'
    +'<button class="hm-btn hm-btn-secondary" onclick="(function(){var i=document.createElement(\'input\');i.type=\'file\';i.accept=\'.json\';i.onchange=function(){var r=new FileReader();r.onload=function(){if(HmTheme.importTheme(r.result)){renderAdminAppearance();if(typeof showToast===\'function\')showToast(\'Theme imported\',\'success\')}};r.readAsText(i.files[0])};i.click()})()">📤 Import JSON</button>'
    +'</div>'
  , true);

  h += sect('🖊️ '+T('customCSS'),
    '<textarea id="adm_custom_css" style="width:100%;min-height:120px;font-family:var(--font-mono);font-size:12px;padding:10px;border:1px solid var(--border);border-radius:var(--radius-md);background:var(--bg-surface-alt,#f8fafc);color:var(--text-primary);resize:vertical"'
    +' oninput="HmTheme.setDeep(\'advanced.customCSS\',this.value)">'+(cfg('advanced.customCSS')||'')+'</textarea>'
    +'<div style="font-size:10px;color:var(--text-tertiary);margin-top:4px">CSS injected LAST with highest priority. Use sparingly.</div>'
  , false);

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

/* ── Expose ──────────────────────────────────────────────────────────────── */
window._renderAdminAppearanceFullVersion = '20260405j';
window._renderAdminAppearanceFull = render;

})();
