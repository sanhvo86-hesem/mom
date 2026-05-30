/* Headless smoke test: load 00-block-engine.js in a vm sandbox and render every
 * block in M-lego-showcase.json, flagging throws / empty-states / generic
 * fallback. One-off dev tool. */
import vm from 'node:vm';
import { readFileSync } from 'node:fs';

const esc = (s) => String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
function el(){
  return { _html:'', style:{}, dataset:{}, setAttribute(){}, getAttribute(){return null;},
    appendChild(n){ this._html += (n && n.__text !== undefined ? esc(n.__text) : (n && n._html) || ''); return n; },
    set innerHTML(v){ this._html = v; }, get innerHTML(){ return this._html; },
    set textContent(v){ this._html = esc(v); }, get textContent(){ return this._html; },
    querySelector(){ return null; }, querySelectorAll(){ return []; }, addEventListener(){},
    classList:{ add(){}, remove(){}, toggle(){}, contains(){ return false; } }, appendChildren(){} };
}
const documentStub = { createElement:()=>el(), createTextNode:(t)=>({__text:t}), getElementById:()=>null,
  querySelector:()=>null, querySelectorAll:()=>[], addEventListener(){}, body:el(), documentElement:el() };

const base = {
  document:documentStub, navigator:{ language:'vi' }, location:{ href:'', search:'', pathname:'/' },
  lang:'vi', currentUser:{ username:'admin', roles:['admin'] },
  console, Math, Date, JSON, Object, Array, String, Number, Boolean, RegExp, Error,
  parseInt, parseFloat, isFinite, isNaN, encodeURIComponent, decodeURIComponent, Intl,
  setTimeout:()=>0, clearTimeout(){}, setInterval:()=>0, clearInterval(){}, requestAnimationFrame:()=>0,
  localStorage:{ getItem:()=>null, setItem(){}, removeItem(){} },
  fetch:()=>Promise.resolve({ json:()=>Promise.resolve({}) }), apiCall:()=>Promise.resolve({}),
};
base.window = base; base.globalThis = base; base.self = base;
const ctx = new Proxy(base, { has:()=>true, get:(t,k)=> (k in t ? t[k] : undefined), set:(t,k,v)=>{ t[k]=v; return true; } });
vm.createContext(ctx);
vm.runInContext(readFileSync('mom/scripts/portal/00-block-engine.js','utf8'), ctx, { filename:'00-block-engine.js' });

const BE = base.HmBlockEngine;
if(!BE || !BE.renderBlock){ console.error('ENGINE FAILED TO LOAD / no renderBlock export'); process.exit(2); }

const schema = JSON.parse(readFileSync('mom/data/modules/M-lego-showcase.json','utf8'));
const state = BE.getModuleState('M-lego-showcase'); state._schema = schema;
const EMPTY = /(Không có dữ liệu|No data|generic renderer|renderer mặc định|No columns|Chưa cấu hình|chưa hỗ trợ|Heatmap fields|SPC measurements)/i;

let ok = 0, problems = [];
schema.tabs.forEach((tab) => {
  tab.blocks.forEach((b) => {
    let html = '';
    try { html = BE.renderBlock(b, {}, state); }
    catch(e){ problems.push([tab.tabId, b.type, 'THROW: ' + e.message]); return; }
    if(!html || !html.trim()){ problems.push([tab.tabId, b.type, 'BLANK']); return; }
    if(/class="hm-empty"/.test(html) && EMPTY.test(html)){ problems.push([tab.tabId, b.type, 'EMPTY/FALLBACK']); return; }
    if(/\[object Object\]|undefined<|>undefined<|NaN%/.test(html)){ problems.push([tab.tabId, b.type, 'BAD-INTERP: ' + (html.match(/\[object Object\]|undefined|NaN%/)||[''])[0]]); return; }
    ok++;
  });
});

console.log('Rendered OK: ' + ok + ' / ' + (ok + problems.length));
if(problems.length){
  console.log('\nPROBLEMS (' + problems.length + '):');
  problems.forEach(p => console.log('  [' + p[0].padEnd(13) + '] ' + p[1].padEnd(26) + p[2]));
  process.exit(1);
} else {
  console.log('All blocks render non-empty ✓');
}
