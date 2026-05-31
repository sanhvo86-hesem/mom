#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 * Smoke test — window.Blocks facade dispatch + parity (Lego-SSOT strangler seam)
 *
 * Loads mom/scripts/portal/00bh-blocks-facade.js in a vm sandbox with STUBBED
 * window.BlockKit + window.HmBlockEngine, and asserts the facade's dispatch and
 * read-only-union behavior. This isolates the FACADE logic (the thing that can
 * regress) from the 14k-line engine. Pairs with the live Chrome parity check.
 *
 * Exit 0 = clean, 1 = assertion failure, 2 = setup error.
 * ════════════════════════════════════════════════════════════════════════════ */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..', '..');
const facadeFp = resolve(root, 'mom/scripts/portal/00bh-blocks-facade.js');

let src;
try { src = readFileSync(facadeFp, 'utf8'); }
catch (e) { console.error('ERROR: cannot read facade:', e.message); process.exit(2); }

/* Stub the two systems the facade dispatches over. */
const bkCalls = [];
const beCalls = [];
const win = {
  BlockKit: {
    _published: { 'panel.standard': 1, 'kpi.grid': 1, 'table.data': 1 },
    get(key) { return this._published[key] ? { block_key: key, status: 'published', category: 'display', display_name_en: key, display_name_vi: key, slots: {} } : null; },
    list() { return Object.keys(this._published); },
    render(key, slots) { bkCalls.push([key, slots]); return 'BK<' + key + '>'; }
  },
  HmBlockEngine: {
    BLOCK_CATALOG: {
      'data-table': { label: 'Bảng', labelEn: 'Data Table', category: 'data', icon: '📋', renderer: 'data-table' },
      'info-banner': { label: 'Thông báo', labelEn: 'Info Banner', category: 'layout', icon: '📢', renderer: 'info-banner' },
      'kpi.grid': { label: 'should-not-win', labelEn: 'shadow', category: 'display' } // collision: BlockKit must win
    },
    renderBlock(block, data, state) { beCalls.push([block.type, block.config]); return 'BE<' + block.type + '>'; }
  }
};
win.window = win;

const ctx = vm.createContext(win);
try { vm.runInContext(src, ctx, { filename: '00bh-blocks-facade.js' }); }
catch (e) { console.error('ERROR: facade threw on load:', e.message); process.exit(2); }

const Blocks = win.Blocks;
const failures = [];
function check(name, cond) { if (!cond) failures.push(name); }

check('facade exposed', !!(Blocks && typeof Blocks.render === 'function'));

/* dispatch / source */
check("source(panel.standard)==blockkit", Blocks.source('panel.standard') === 'blockkit');
check("source(data-table)==engine", Blocks.source('data-table') === 'engine');
check("source(unknown)==null", Blocks.source('nope') === null);
check('has(data-table)', Blocks.has('data-table') === true);
check('has(nope)==false', Blocks.has('nope') === false);

/* render dispatch */
check("render L3 → BlockKit", Blocks.render('panel.standard', { title: 'X' }) === 'BK<panel.standard>');
check("render engine → BE", Blocks.render('info-banner', { config: { text: 'hi' } }) === 'BE<info-banner>');
check("published L3 wins a key collision", Blocks.render('kpi.grid', {}) === 'BK<kpi.grid>');
/* Catch-all: any non-L3 type delegates to BE (BE handles its own unknowns
   gracefully). This keeps the facade backward-compatible — it never renders
   FEWER things than BE did before the seam existed. */
check("unknown type → BE catch-all", Blocks.render('nope', {}) === 'BE<nope>');

/* engine payload shaping: config passed through */
beCalls.length = 0;
Blocks.render('data-table', { config: { pageSize: 9 } });
check('engine receives config', beCalls.length === 1 && beCalls[0][1] && beCalls[0][1].pageSize === 9);

/* list = union, deduped (kpi.grid appears once though in both) */
const list = Blocks.list();
check('list unions both', list.includes('panel.standard') && list.includes('data-table'));
check('list dedupes collision', list.filter((k) => k === 'kpi.grid').length === 1);

/* meta normalization */
const m1 = Blocks.meta('panel.standard');
check('meta L3 source', m1 && m1.source === 'blockkit' && m1.display.en === 'panel.standard');
const m2 = Blocks.meta('info-banner');
check('meta engine source', m2 && m2.source === 'engine' && m2.display.en === 'Info Banner' && m2.icon === '📢');

/* coverage */
const cov = Blocks.coverage();
check('coverage counts', cov.blockkitPublished === 3 && cov.engineCatalog === 3 && cov.total === list.length);

/* BE absent → graceful comment, still no throw (the only path that emits the
   "no renderer" fallback). Re-evaluate the facade in a context with no engine. */
const win2 = { BlockKit: win.BlockKit };
win2.window = win2;
const ctx2 = vm.createContext(win2);
vm.runInContext(src, ctx2, { filename: '00bh-blocks-facade.js' });
const r = win2.Blocks.render('nope', {});
check('BE absent + unknown → no-renderer comment', /no renderer/.test(r));
check('BE absent + L3 type still renders', win2.Blocks.render('panel.standard', {}) === 'BK<panel.standard>');

if (failures.length) {
  console.error('blocks-facade smoke FAILED:');
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('blocks-facade smoke clean — dispatch + parity + union verified (' + list.length + ' keys)');
process.exit(0);
