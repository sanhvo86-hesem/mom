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
function cfgNum(path, def){ var v=cfg(path); return v!==''&&v!==undefined ? Number(v) : def; }

/* ── Helper: slider + number input ──────────────────────────────────────── */
function slider(label, cssVar, path, min, max, def, unit, step){
  var val = cfgNum(path, def);
  step = step || 1;
  var sid = 'adm_s_'+path.replace(/\./g,'_');
  var nid = 'adm_n_'+path.replace(/\./g,'_');
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    +'<span style="min-width:140px;font-size:12px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'<input type="range" id="'+sid+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'
    +' oninput="document.getElementById(\''+nid+'\').value=this.value;HmTheme.setVar(\''+cssVar+'\',this.value+\''+(unit||'px')+'\')"'
    +' style="flex:1;accent-color:var(--brand-2)">'
    +'<input type="number" id="'+nid+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+val+'"'
    +' oninput="document.getElementById(\''+sid+'\').value=this.value;HmTheme.setVar(\''+cssVar+'\',this.value+\''+(unit||'px')+'\')"'
    +' style="width:64px;height:28px;text-align:center;border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px;font-family:var(--font-mono)">'
    +'<span style="font-size:11px;color:var(--text-tertiary);min-width:24px">'+(unit||'px')+'</span>'
    +'</div>';
}

/* ── Helper: color picker + hex ─────────────────────────────────────────── */
function colorPick(label, cssVar, path, def){
  var val = cfg(path) || def || '#000000';
  var cid = 'adm_cp_'+path.replace(/\./g,'_');
  var hid = 'adm_hp_'+path.replace(/\./g,'_');
  return '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">'
    +'<input type="color" id="'+cid+'" value="'+esc(val)+'"'
    +' oninput="document.getElementById(\''+hid+'\').value=this.value;HmTheme.setVar(\''+cssVar+'\',this.value)"'
    +' style="width:32px;height:28px;border:1px solid var(--border);border-radius:4px;cursor:pointer;padding:1px">'
    +'<input type="text" id="'+hid+'" value="'+esc(val)+'"'
    +' oninput="document.getElementById(\''+cid+'\').value=this.value;HmTheme.setVar(\''+cssVar+'\',this.value)"'
    +' style="width:80px;height:28px;padding:0 6px;border:1px solid var(--border);border-radius:4px;font-family:var(--font-mono);font-size:11px">'
    +'<span style="font-size:11px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'</div>';
}

/* ── Helper: text input ─────────────────────────────────────────────────── */
function textInput(label, cssVar, path, def, placeholder){
  var val = cfg(path) || def || '';
  return '<div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">'
    +'<span style="min-width:140px;font-size:12px;color:var(--text-secondary)">'+esc(label)+'</span>'
    +'<input type="text" value="'+esc(val)+'"'
    +' oninput="HmTheme.setVar(\''+cssVar+'\',this.value)"'
    +' placeholder="'+(placeholder||'')+'"'
    +' style="flex:1;height:28px;padding:0 8px;border:1px solid var(--border);border-radius:var(--radius-md);font-size:12px">'
    +'</div>';
}

/* ── Helper: radio group ────────────────────────────────────────────────── */
function radioRow(name, options, current, onChange){
  var h = '<div style="display:flex;gap:6px;flex-wrap:wrap">';
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
    {key:'advanced', icon:'🧩', label:T('advanced')}
  ];

  var h = '<div style="max-width:900px;margin:0 auto">';

  /* Title */
  h += '<div style="margin-bottom:16px"><h3 style="margin:0;font-size:18px;font-weight:700">🎨 '+(typeof lang!=='undefined'&&lang==='en'?'System Appearance':'Giao diện hệ thống')+'</h3>';
  h += '<div style="margin-top:6px;padding:5px 10px;background:var(--blue-bg,rgba(37,99,235,0.08));border:1px solid var(--blue,#2563eb);border-radius:6px;font-size:11px;color:var(--blue,#2563eb)">💡 '+T('liveHint')+'</div></div>';

  /* Sub-tab bar */
  h += '<div style="display:flex;gap:4px;border-bottom:2px solid var(--border);margin-bottom:16px;overflow-x:auto">';
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

  /* Density presets */
  h += sect(T('presets')+' — '+T('overview'),
    '<div style="margin-bottom:12px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('overview')+'</strong></div>'
    + radioRow('adm_density', [
      {value:'compact',icon:'📐',label:T('compact')},
      {value:'default',icon:'⚖️',label:T('default')},
      {value:'comfortable',icon:'🖐️',label:T('comfortable')}
    ], cur.density, "HmTheme.set('density',this.value);renderAdminAppearance()")
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
    textInput(T('display'), '--font-display', 'typography.display.family', 'Inter', 'Inter, Roboto, Poppins...')
    + slider(T('display')+' '+T('fontWeight'), '--font-display-weight', 'typography.display.weight', 100, 900, 700, '', 100)
    + textInput(T('heading'), '--font-heading', 'typography.heading.family', 'Inter')
    + slider(T('heading')+' '+T('fontWeight'), '--font-heading-weight', 'typography.heading.weight', 100, 900, 600, '', 100)
    + textInput(T('body'), '--font-body', 'typography.body.family', 'Inter')
    + slider(T('body')+' '+T('fontWeight'), '--font-body-weight', 'typography.body.weight', 100, 900, 400, '', 100)
    + textInput(T('label'), '--font-label', 'typography.label.family', 'Inter')
    + slider(T('label')+' '+T('fontWeight'), '--font-label-weight', 'typography.label.weight', 100, 900, 600, '', 100)
    + textInput(T('mono'), '--font-mono', 'typography.mono.family', 'JetBrains Mono')
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
  , true);

  h += sect('↕️ '+T('lineHeight'),
    slider('Tight', '--leading-tight', 'lineHeight.tight', 1.0, 1.5, 1.25, '', 0.05)
    + slider('Normal', '--leading-normal', 'lineHeight.normal', 1.2, 1.8, 1.5, '', 0.05)
    + slider('Relaxed', '--leading-relaxed', 'lineHeight.relaxed', 1.4, 2.2, 1.75, '', 0.05)
  , false);

  h += sect('🏷️ '+T('letterSpacing')+' & '+T('textTransform'),
    slider(T('letterSpacing'), '--label-letter-spacing', 'typography.label.spacing', 0, 0.2, 0.05, 'em', 0.01)
    + '<div style="margin-top:8px"><strong style="font-size:12px;color:var(--text-secondary)">'+T('textTransform')+'</strong></div>'
    + radioRow('adm_label_transform', [
      {value:'none',label:T('none')},
      {value:'uppercase',label:T('uppercase')},
      {value:'capitalize',label:T('capitalize')}
    ], cfg('typography.label.transform')||'uppercase', "HmTheme.setVar('--label-transform',this.value)")
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
    + colorPick('Sidebar', '--bg-sidebar', 'brand.sidebarBg', '#0c2d48')
  , true);

  h += sect('🚦 '+T('status')+' (Light + Dark)',
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    +'<div><strong style="font-size:11px;color:var(--text-secondary)">LIGHT</strong>'
    + colorPick('Success', '--green', 'statusColors.success', '#16a34a')
    + colorPick('Error', '--red', 'statusColors.error', '#dc2626')
    + colorPick('Warning', '--amber', 'statusColors.warning', '#d97706')
    + colorPick('Info', '--blue', 'statusColors.info', '#2563eb')
    + colorPick('Purple', '--purple', 'statusColors.purple', '#7c3aed')
    + colorPick('Cyan', '--cyan', 'statusColors.cyan', '#0891b2')
    +'</div><div><strong style="font-size:11px;color:var(--text-secondary)">DARK</strong>'
    + colorPick('Success', '--green-dark', 'statusColorsDark.success', '#22c55e')
    + colorPick('Error', '--red-dark', 'statusColorsDark.error', '#f87171')
    + colorPick('Warning', '--amber-dark', 'statusColorsDark.warning', '#fbbf24')
    + colorPick('Info', '--blue-dark', 'statusColorsDark.info', '#60a5fa')
    + colorPick('Purple', '--purple-dark', 'statusColorsDark.purple', '#a78bfa')
    + colorPick('Cyan', '--cyan-dark', 'statusColorsDark.cyan', '#22d3ee')
    +'</div></div>'
  , false);

  h += sect('☀️ '+T('surfacesLight'),
    colorPick('Page BG', '--bg-page', 'colorsLight.bgPage', '#f8fafc')
    + colorPick('Surface', '--bg-surface', 'colorsLight.bgSurface', '#ffffff')
    + colorPick('Surface Alt', '--bg-surface-alt', 'colorsLight.bgSurfaceAlt', '#f1f5f9')
    + colorPick('Header', '--bg-header', 'colorsLight.bgHeader', '#ffffff')
    + colorPick('Modal', '--bg-modal', 'colorsLight.bgModal', '#ffffff')
    + colorPick('Hover', '--bg-hover', 'colorsLight.bgHover', '#f8fafc')
  , false);

  h += sect('🌙 '+T('surfacesDark'),
    colorPick('Page BG Dark', '--bg-page', 'colorsDark.bgPage', '#0f172a')
    + colorPick('Surface Dark', '--bg-surface', 'colorsDark.bgSurface', '#1e293b')
    + colorPick('Surface Alt Dark', '--bg-surface-alt', 'colorsDark.bgSurfaceAlt', '#162032')
    + colorPick('Header Dark', '--bg-header', 'colorsDark.bgHeader', '#1e293b')
    + colorPick('Hover Dark', '--bg-hover', 'colorsDark.bgHover', '#263348')
    + colorPick('Sidebar Dark', '--bg-sidebar', 'colorsDark.sidebarBg', '#0a1628')
  , false);

  h += sect('📝 '+T('textLight'),
    colorPick('Primary', '--text-primary', 'colorsLight.textPrimary', '#1e293b')
    + colorPick('Secondary', '--text-secondary', 'colorsLight.textSecondary', '#64748b')
    + colorPick('Muted', '--text-tertiary', 'colorsLight.textTertiary', '#94a3b8')
    + colorPick('Link', '--text-link', 'colorsLight.textLink', '#1565c0')
    + colorPick('Inverse', '--text-inverse', 'colorsLight.textInverse', '#ffffff')
  , false);

  h += sect('📝 '+T('textDark'),
    colorPick('Primary Dark', '--text-primary', 'colorsDark.textPrimary', '#f1f5f9')
    + colorPick('Secondary Dark', '--text-secondary', 'colorsDark.textSecondary', '#94a3b8')
    + colorPick('Muted Dark', '--text-tertiary', 'colorsDark.textTertiary', '#64748b')
    + colorPick('Link Dark', '--text-link', 'colorsDark.textLink', '#60a5fa')
  , false);

  h += sect('🔲 '+T('borders'),
    '<strong style="font-size:11px">Light</strong>'
    + colorPick('Border', '--border', 'colorsLight.border', '#e2e8f0')
    + colorPick('Focus', '--border-focus', 'colorsLight.borderFocus', '#1565c0')
    + colorPick('Error', '--border-error', 'colorsLight.borderError', '#dc2626')
    + '<strong style="font-size:11px;margin-top:8px;display:block">Dark</strong>'
    + colorPick('Border Dark', '--border', 'colorsDark.border', '#334155')
    + colorPick('Focus Dark', '--border-focus', 'colorsDark.borderFocus', '#60a5fa')
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
  , false);

  h += sect('📋 '+T('tableDetail'),
    slider('Row height', '--hds-table-row-h', 'density.tableRowH', 28, 56, 40, 'px')
    + slider('Cell padding X', '--hds-table-cell-px', 'density.tableCellPx', 4, 20, 12, 'px')
    + slider('Cell padding Y', '--hds-table-cell-py', 'density.tableCellPy', 2, 16, 8, 'px')
    + slider('Header font', '--hds-table-head-font', 'density.tableHeadFont', 9, 14, 11, 'px')
    + slider('Body font', '--hds-table-body-font', 'density.tableBodyFont', 10, 16, 13, 'px')
  , false);

  h += sect('🔲 '+T('radiusScale'),
    slider('Radius sm', '--radius-sm', 'radius.sm', 0, 12, 4, 'px')
    + slider('Radius md (controls)', '--radius-md', 'radius.md', 0, 16, 6, 'px')
    + slider('Radius lg (cards)', '--radius-lg', 'radius.lg', 0, 20, 8, 'px')
    + slider('Radius xl (sections)', '--radius-xl', 'radius.xl', 0, 24, 12, 'px')
    + slider('Radius 2xl (modals)', '--radius-2xl', 'radius.2xl', 0, 32, 16, 'px')
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
  , false);

  h += sect('📐 '+T('layoutDim'),
    slider('Sidebar width', '--sidebar-w', 'layout.sidebarW', 180, 360, 260, 'px')
    + slider('Sidebar collapsed', '--sidebar-w-collapsed', 'layout.sidebarCollapsed', 40, 80, 56, 'px')
    + slider('Header height', '--header-h', 'layout.headerH', 36, 72, 52, 'px')
    + slider('Content max-width', '--content-max-w', 'layout.contentMaxW', 960, 2400, 1400, 'px')
    + slider('Modal max-width', '--modal-max-w', 'layout.modalMaxW', 480, 1400, 800, 'px')
    + slider('Modal small max-width', '--modal-sm-max-w', 'layout.modalSmMaxW', 280, 720, 480, 'px')
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
  , true);

  h += sect('🔵 '+T('focusRing'),
    slider('Width', '--focus-ring-width', 'effects.focusRingWidth', 1, 5, 3, 'px')
    + colorPick('Color', '--focus-ring-color', 'effects.focusRingColor', 'rgba(21,101,192,0.12)')
    + slider('Offset', '--focus-ring-offset', 'effects.focusRingOffset', 0, 4, 0, 'px')
  , false);

  h += sect('🖊️ '+T('selectionColor'),
    colorPick('Selection BG', '--selection-bg', 'effects.selectionBg', '#3b82f6')
    + colorPick('Selection Text', '--selection-color', 'effects.selectionColor', '#ffffff')
  , false);

  h += sect('✏️ '+T('caretColor'),
    colorPick('Caret', '--caret-color', 'effects.caretColor', '#1565c0')
  , false);

  h += sect('💬 '+T('placeholder'),
    colorPick('Placeholder color', '--placeholder-color', 'effects.placeholderColor', '#94a3b8')
  , false);

  h += sect('🚫 '+T('disabledState'),
    slider('Opacity', '--disabled-opacity', 'effects.disabledOpacity', 0.2, 0.8, 0.5, '', 0.05)
  , false);

  h += sect('📜 '+T('scrollbar'),
    slider('Width', '--scrollbar-width', 'effects.scrollbarWidth', 4, 12, 8, 'px')
    + colorPick('Track', '--scrollbar-track', 'effects.scrollbarTrack', '#f1f5f9')
    + colorPick('Thumb', '--scrollbar-thumb', 'effects.scrollbarThumb', '#cbd5e1')
    + slider('Thumb radius', '--scrollbar-radius', 'effects.scrollbarRadius', 0, 8, 4, 'px')
  , false);

  h += sect('🌫️ '+T('backdrop'),
    slider('Backdrop blur', '--backdrop-blur', 'effects.backdropBlur', 0, 20, 0, 'px')
    + slider('Overlay opacity', '--overlay-opacity', 'effects.overlayOpacity', 0, 1, 0.4, '', 0.05)
  , false);

  return h;
}

/* ══════════════════════════════════════════════════════════════════════════ */
/* ── SUB-TAB 6: ADVANCED ────────────────────────────────────────────────── */
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
window._renderAdminAppearanceFull = render;

})();
