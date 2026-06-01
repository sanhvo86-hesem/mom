#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();

const portalRuntimeFiles = [
  'mom/scripts/portal/00bb-graphics-authority.js',
  'mom/scripts/portal/00bc-block-registry.js',
  'mom/scripts/portal/00bd-blockkit.js',
  'mom/scripts/portal/00be-archetype-registry.js',
  'mom/scripts/portal/00bf-archetypekit.js',
  'mom/scripts/portal/00-block-engine.js',
  'mom/scripts/portal/00bh-blocks-facade.js',
  'mom/scripts/portal/00bi-blocks-l3-map.js',
  'mom/scripts/portal/01-module-router.js',
  'mom/scripts/portal/02-state-auth-ui.js',
  'mom/scripts/portal/40-eqms-shell.js',
];

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function assert(condition, message) {
  if (!condition) fail(message);
}

function read(rel) {
  return fs.readFileSync(path.join(root, rel), 'utf8');
}

function createElement(tagName = 'div') {
  let textValue = '';
  let htmlValue = '';
  const node = {
    tagName: String(tagName).toUpperCase(),
    style: {},
    dataset: {},
    attributes: {},
    children: [],
    childNodes: [],
    className: '',
    innerHTML: '',
    textContent: '',
    value: '',
    checked: false,
    disabled: false,
    hidden: false,
    parentNode: null,
    classList: {
      add() {},
      remove() {},
      toggle() { return false; },
      contains() { return false; },
    },
    appendChild(child) {
      if (child && typeof child === 'object') child.parentNode = this;
      this.children.push(child);
      this.childNodes.push(child);
      return child;
    },
    removeChild(child) {
      this.children = this.children.filter((item) => item !== child);
      this.childNodes = this.childNodes.filter((item) => item !== child);
      return child;
    },
    insertBefore(child) { return this.appendChild(child); },
    remove() {},
    setAttribute(name, value) {
      this.attributes[name] = String(value);
      if (name === 'class') this.className = String(value);
      if (name.startsWith('data-')) {
        const key = name.slice(5).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
        this.dataset[key] = String(value);
      }
    },
    getAttribute(name) {
      if (name === 'class') return this.className;
      return Object.prototype.hasOwnProperty.call(this.attributes, name) ? this.attributes[name] : null;
    },
    hasAttribute(name) { return Object.prototype.hasOwnProperty.call(this.attributes, name); },
    addEventListener() {},
    removeEventListener() {},
    dispatchEvent() { return true; },
    querySelector() { return null; },
    querySelectorAll() { return []; },
    closest() { return null; },
    focus() {},
    blur() {},
    click() {},
  };
  Object.defineProperty(node, 'textContent', {
    get() { return textValue; },
    set(value) {
      textValue = String(value ?? '');
      htmlValue = textValue
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
    },
  });
  Object.defineProperty(node, 'innerHTML', {
    get() { return htmlValue; },
    set(value) { htmlValue = String(value ?? ''); },
  });
  return node;
}

function createStorage() {
  const data = new Map();
  return {
    getItem(key) { return data.has(String(key)) ? data.get(String(key)) : null; },
    setItem(key, value) { data.set(String(key), String(value)); },
    removeItem(key) { data.delete(String(key)); },
    clear() { data.clear(); },
  };
}

const body = createElement('body');
const head = createElement('head');
const document = {
  readyState: 'loading',
  body,
  head,
  documentElement: createElement('html'),
  currentScript: null,
  createElement,
  createTextNode(text) { return { nodeType: 3, textContent: String(text) }; },
  createDocumentFragment() { return createElement('fragment'); },
  getElementById() { return null; },
  querySelector() { return null; },
  querySelectorAll() { return []; },
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};

const context = {
  console,
  document,
  navigator: { clipboard: { writeText: async () => {} }, userAgent: 'portal-runtime-smoke' },
  location: { hash: '', href: 'https://eqms.hesemeng.com/mom/portal.html', pathname: '/mom/portal.html', search: '' },
  history: { replaceState() {}, pushState() {} },
  localStorage: createStorage(),
  sessionStorage: createStorage(),
  crypto: { randomUUID: () => '00000000-0000-4000-8000-000000000000' },
  URL,
  URLSearchParams,
  Date,
  Math,
  JSON,
  Promise,
  Map,
  Set,
  WeakMap,
  WeakSet,
  Object,
  Array,
  String,
  Number,
  Boolean,
  RegExp,
  Error,
  TypeError,
  parseInt,
  parseFloat,
  isNaN,
  encodeURIComponent,
  decodeURIComponent,
  setTimeout,
  clearTimeout,
  setInterval,
  clearInterval,
  requestAnimationFrame: (fn) => setTimeout(fn, 0),
  cancelAnimationFrame: clearTimeout,
  Event: class Event { constructor(type, init = {}) { this.type = type; Object.assign(this, init); } },
  CustomEvent: class CustomEvent { constructor(type, init = {}) { this.type = type; this.detail = init.detail; } },
  EventSource: class EventSource { addEventListener() {} close() {} },
  fetch: async () => ({ ok: true, status: 200, json: async () => ({ ok: true }), text: async () => '' }),
  lang: 'en',
  csrfToken: 'portal-runtime-smoke',
  currentUser: { username: 'ci', role: 'admin' },
  apiCall: async () => ({ ok: true, data: [] }),
  apiRequest: async () => ({ ok: true, data: [] }),
  showToast() {},
  addEventListener() {},
  removeEventListener() {},
  dispatchEvent() { return true; },
};
context.window = context;
context.globalThis = context;
context.self = context;
context.document.defaultView = context;

const sandbox = vm.createContext(context);

const portalHtml = read('mom/portal.html');
for (const rel of portalRuntimeFiles) {
  assert(fs.existsSync(path.join(root, rel)), `missing runtime file ${rel}`);
  const scriptName = path.basename(rel);
  assert(portalHtml.includes(scriptName), `mom/portal.html does not load ${scriptName}`);
  new vm.Script(read(rel), { filename: rel });
}

for (const rel of portalRuntimeFiles) {
  const script = new vm.Script(read(rel), { filename: rel });
  script.runInContext(sandbox, { timeout: 2500 });
}

assert(context.__HM_BLOCK_REGISTRY__ && Array.isArray(context.__HM_BLOCK_REGISTRY__.blocks), 'block registry global is missing');
assert(context.BlockKit && typeof context.BlockKit.render === 'function', 'BlockKit.render is missing');
assert(context.__HM_ARCHETYPE_REGISTRY__ && Array.isArray(context.__HM_ARCHETYPE_REGISTRY__.archetypes), 'archetype registry global is missing');
assert(context.ArchetypeKit && typeof context.ArchetypeKit.render === 'function', 'ArchetypeKit.render is missing');
assert(context.HmBlockEngine && typeof context.HmBlockEngine.renderBlock === 'function', 'HmBlockEngine.renderBlock is missing');
assert(context.Blocks && typeof context.Blocks.render === 'function', 'Blocks.render facade is missing');
assert(context.Blocks && typeof context.Blocks.renderL3 === 'function', 'Blocks L3 adapter is missing');
assert(context.HmModuleRouter && typeof context.HmModuleRouter.renderModuleById === 'function', 'HmModuleRouter.renderModuleById is missing');
assert(context.HmModuleRouter && typeof context.HmModuleRouter.clearCache === 'function', 'HmModuleRouter.clearCache is missing');
assert(context.EqmsShell && context.EqmsShell.ui && typeof context.EqmsShell.ui.renderKpiRow === 'function', 'EqmsShell.ui.renderKpiRow is missing');
assert(typeof context.switchAdminTab === 'function', 'switchAdminTab is missing from state/auth runtime');

const kpiHtml = context.BlockKit.render('kpi.grid', {
  tiles: [{ label: '<Ready>', value: '99%', sub: 'stable', tone: 'success' }],
});
assert(kpiHtml.includes('&lt;Ready&gt;'), 'BlockKit KPI render did not escape labels');
assert(kpiHtml.includes('99%'), 'BlockKit KPI render did not include tile value');

const archetypeHtml = context.ArchetypeKit.render('workspace-projection', {
  shell: { slots: { title: 'Runtime Smoke', tabs: [{ label: 'All', active: true }] } },
  list: { slots: { columns: ['ID'], rows: [['SMOKE-1']] } },
});
assert(archetypeHtml.includes('Runtime Smoke'), 'ArchetypeKit workspace render missing shell title');
assert(archetypeHtml.includes('SMOKE-1'), 'ArchetypeKit workspace render missing table content');

const l3Html = context.Blocks.render('kpi-row', {
  config: { items: [{ label: 'OEE', dataKey: 'oee', suffix: '%', color: 'green' }] },
  data: { oee: 91 },
});
assert(l3Html.includes('OEE') && l3Html.includes('91%'), 'Blocks L3 kpi-row facade did not render through KPI grid');

const eqmsHtml = context.EqmsShell.ui.renderKpiRow([{ label: 'Open NCR', value: 2, tone: 'warning' }]);
assert(eqmsHtml.includes('Open NCR') && eqmsHtml.includes('2'), 'EqmsShell KPI row render failed');

if (process.exitCode) process.exit(process.exitCode);
console.log('PASS portal runtime smoke: critical globals and render contracts are intact.');
