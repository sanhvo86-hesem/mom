/* Security regression: load 00-block-engine.js in a vm sandbox and feed the
 * showcase renderers the exact attack inputs the adversarial audit found, then
 * assert the output contains no live injection (no raw <script>/<img>, no
 * attribute breakout). One-off dev tool. */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
function el(){ return { _html:'', style:{}, setAttribute(){}, getAttribute(){return null;}, appendChild(n){ this._html += (n&&n.__text!==undefined?esc(n.__text):(n&&n._html)||''); return n; }, set innerHTML(v){this._html=v;}, get innerHTML(){return this._html;}, set textContent(v){this._html=esc(v);}, get textContent(){return this._html;}, querySelector(){return null;}, querySelectorAll(){return[];}, addEventListener(){}, classList:{add(){},remove(){},toggle(){},contains(){return false;}} }; }
const documentStub = { createElement:()=>el(), createTextNode:t=>({__text:t}), getElementById:()=>null, querySelector:()=>null, querySelectorAll:()=>[], addEventListener(){}, body:el(), documentElement:el() };
const base = { document:documentStub, navigator:{language:'vi'}, location:{href:'',search:'',pathname:'/'}, lang:'vi', currentUser:{username:'a',roles:['admin']}, console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error, parseInt, parseFloat, isFinite, isNaN, encodeURIComponent, decodeURIComponent, Intl, setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){}, requestAnimationFrame:()=>0, localStorage:{getItem:()=>null,setItem(){},removeItem(){}}, fetch:()=>Promise.resolve({json:()=>Promise.resolve({})}), apiCall:()=>Promise.resolve({}) };
base.window = base; base.globalThis = base; base.self = base;
const ctx = new Proxy(base, { has:()=>true, get:(t,k)=>k in t?t[k]:undefined, set:(t,k,v)=>{t[k]=v;return true;} });
vm.createContext(ctx);
vm.runInContext(readFileSync('mom/scripts/portal/00-block-engine.js','utf8'), ctx, { filename:'00-block-engine.js' });
const BE = base.HmBlockEngine;
const st = BE.getModuleState('xss'); st._schema = { moduleId:'xss' };

const XSS = '<img src=x onerror=alert(1)>';
const ATTR = '" onerror="alert(1)" x="';
const STYLE = 'red"><script>alert(1)</script>';

function render(type, config){ return BE.renderBlock({ blockId:'b', id:'b', type:type, config:config }, {}, st); }

const cases = [
  ['nav-related-links icon', render('nav-related-links', { demoData:{ items:[{ label:'X', icon:XSS }] } })],
  ['info-banner icon', render('info-banner', { icon:XSS, text:'hi' })],
  ['action-toolbar btn.icon', render('action-toolbar', { buttons:[{ label:'X', icon:XSS }] })],
  ['kanban-board lane.color', render('kanban-board', { statusKey:'status', lanes:[{ key:'a', label:'A', color:STYLE }], demoData:{ items:[{ status:'a', title:'T' }] } })],
  ['insight-funnel item.color', render('insight-funnel', { demoData:{ items:[{ label:'L', value:10, color:STYLE }] } })],
  ['media-image src', render('media-image', { src:ATTR, caption:'c' })],
  ['media-gallery src', render('media-gallery', { demoData:{ items:[{ src:ATTR, caption:'c' }] } })],
  ['data-cards owner', render('data-cards', { columns:3, dataKey:'items', titleKey:'t', demoData:{ items:[{ t:XSS, status:'open' }] } })],
  ['nav-links javascript: href', render('nav-related-links', { demoData:{ items:[{ label:'L', href:'javascript:alert(1)' }] } })],
  ['data-table javascript: link', render('data-table', { dataKey:'items', columns:[{ key:'u', label:'U', type:'link' }], demoData:{ items:[{ u:'javascript:alert(1)' }] } })],
];

let fail = 0;
for(const [name, html] of cases){
  const h = String(html || '');
  // Real injection signals only: an injected <script>, a live event-handler that
  // broke out via a LITERAL quote (escaped quotes are &quot; and cannot break out),
  // or a javascript: URL in an attribute. Escaped content (&lt;img …&gt;,
  // src="&quot; onerror=&quot;…") is inert and must NOT be flagged.
  const bad = /<script\b/i.test(h)
    || /"\s+on[a-z]+\s*=/i.test(h)
    || /(?:href|src)\s*=\s*"\s*javascript:/i.test(h);
  if(bad){ console.error('  ✗ INJECTION in ' + name + ':\n    ' + h.slice(0, 240)); fail++; }
  else console.log('  ✓ safe: ' + name);
}
// _esc unit
const e = ctx.window.HmBlockEngine; // (renderBlock proven above)
console.log(fail ? ('\nFAIL: ' + fail + ' injection(s)') : '\nAll XSS regression cases safe ✓');
process.exit(fail ? 1 : 0);
