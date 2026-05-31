#!/usr/bin/env node
/* ════════════════════════════════════════════════════════════════════════════
 * Smoke test — Blocks L3 equivalence map (Phase 2.2 Stage 1)
 *
 * Loads 00bh-blocks-facade.js + 00bi-blocks-l3-map.js in a vm sandbox with
 * stubbed BlockKit (echoing slots) + HmBlockEngine, and asserts:
 *   - preferL3 defaults OFF → engine type passes through to BE (no visual change)
 *   - preferL3 ON → kpi-row routes to kpi.grid via the adapter
 *   - the adapter maps items+data+trend → tiles{label,value,sub,tone} correctly
 *   - l3Candidates() lists only faithful pairs with a PUBLISHED L3 block
 *   - a failing adapter degrades to the engine render (never worse)
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
const mapFp = resolve(root, 'mom/scripts/portal/00bi-blocks-l3-map.js');

let facadeSrc, mapSrc;
try {
  facadeSrc = readFileSync(facadeFp, 'utf8');
  mapSrc = readFileSync(mapFp, 'utf8');
} catch (e) { console.error('ERROR: cannot read sources:', e.message); process.exit(2); }

const win = {
  BlockKit: {
    _pub: { 'kpi.grid': 1 },
    get(k) { return this._pub[k] ? { block_key: k, status: 'published', category: 'display', display_name_en: k, display_name_vi: k, slots: {} } : null; },
    list() { return Object.keys(this._pub); },
    /* echo the slots so the adapter's output is inspectable */
    render(k, slots) { return 'L3:' + k + ':' + JSON.stringify(slots); }
  },
  HmBlockEngine: {
    BLOCK_CATALOG: { 'kpi-row': { label: 'Dãy KPI', labelEn: 'KPI Row', category: 'layout' } },
    renderBlock(block) { return 'ENGINE:' + block.type; }
  }
};
win.window = win;

const ctx = vm.createContext(win);
try {
  vm.runInContext(facadeSrc, ctx, { filename: '00bh-blocks-facade.js' });
  vm.runInContext(mapSrc, ctx, { filename: '00bi-blocks-l3-map.js' });
} catch (e) { console.error('ERROR: source threw on load:', e.message); process.exit(2); }

const Blocks = win.Blocks;
const failures = [];
function check(name, cond) { if (!cond) failures.push(name); }

check('map layer attached', !!(Blocks && Blocks._equivalence && Blocks._equivalence['kpi-row']));
check('kpi-row flipped ON by default (approved)', Blocks.l3Enabled && Blocks.l3Enabled['kpi-row'] === true);
check('isFlipped(kpi-row) true', Blocks.isFlipped('kpi-row') === true);
check('isFlipped(unmapped) false', Blocks.isFlipped('data-table') === false);

/* per-block OFF → passes through to engine (set the key off) */
Blocks.l3Enabled = {};
check('OFF: kpi-row → engine', Blocks.render('kpi-row', { config: { items: [] } }) === 'ENGINE:kpi-row');
Blocks.l3Enabled = { 'kpi-row': true }; // restore approved default for the rest

/* l3Candidates lists the faithful published pair */
const cands = Blocks.l3Candidates();
check('l3Candidates includes kpi-row→kpi.grid',
  cands.length === 1 && cands[0].from === 'kpi-row' && cands[0].to === 'kpi.grid');

/* adapter correctness */
const cfg = {
  items: [
    { label: { vi: 'OEE', en: 'OEE' }, dataKey: 'oee', suffix: '%', trend: 4 },
    { label: 'Scrap', dataKey: 'scrap', suffix: '%', trend: -2 },
    { labelEn: 'Open', dataKey: 'open', default: 7 },
    { label: 'Backlog', dataKey: 'backlog', suffix: ' USD' },          // big number, no trend
    { label: 'Holds', dataKey: 'holds', color: 'var(--red)' },          // semantic color, no trend
    { label: 'OTD', dataKey: 'otd', suffix: '%', color: 'var(--green)', trend: -1 }, // color wins over trend
    { label: 'Flat', dataKey: 'flat', trend: 0 }                        // trend 0 → no sub
  ]
};
const data = { oee: 92, scrap: 1.2, backlog: 1250000, holds: 3, otd: 97, flat: 5 };
const adapted = Blocks._adapters['kpi-row'](cfg, data);
check('adapter tile count', adapted.tiles.length === 7);
check('adapter value+suffix from data', adapted.tiles[0].value === '92%');
check('adapter positive trend → success + +sub', adapted.tiles[0].tone === 'success' && adapted.tiles[0].sub === '+4%');
check('adapter negative trend → danger', adapted.tiles[1].tone === 'danger' && adapted.tiles[1].sub === '-2%');
check('adapter default value when no data', adapted.tiles[2].value === '7');
check('adapter label resolves {vi,en} and labelEn', adapted.tiles[0].label === 'OEE' && adapted.tiles[2].label === 'Open');
check('adapter thousand-separators numeric', adapted.tiles[3].value === '1,250,000 USD');
check('adapter explicit color → tone (no trend)', adapted.tiles[4].tone === 'danger' && adapted.tiles[4].sub === undefined);
check('adapter color wins over trend sign', adapted.tiles[5].tone === 'success' && adapted.tiles[5].sub === '-1%');
check('adapter trend 0 → no sub, no tone', adapted.tiles[6].sub === undefined && adapted.tiles[6].tone === undefined);

/* ON (kpi-row flipped) → routes through L3 with adapted slots */
const onOut = Blocks.render('kpi-row', { config: cfg, data: data });
check('ON: kpi-row routes to L3 kpi.grid', onOut.indexOf('L3:kpi.grid:') === 0);
check('ON: adapted slots reach L3', onOut.indexOf('"value":"92%"') >= 0 && onOut.indexOf('"tone":"success"') >= 0);

/* renderL3 direct (used by the engine hook) */
check('renderL3 produces L3 for kpi-row', (Blocks.renderL3('kpi-row', cfg, data) || '').indexOf('L3:kpi.grid:') === 0);
check('renderL3 null for unmapped', Blocks.renderL3('data-table', {}, {}) === null);

/* unmapped type still goes to engine */
check('unmapped type → engine', Blocks.render('data-table', { config: {} }) === 'ENGINE:data-table');

/* failing adapter degrades to engine (never worse) */
Blocks._equivalence['kpi-row'].adapt = function () { throw new Error('boom'); };
check('failing adapter falls back to engine', Blocks.render('kpi-row', { config: cfg }) === 'ENGINE:kpi-row');

if (failures.length) {
  console.error('blocks-l3-map smoke FAILED:');
  failures.forEach((f) => console.error('  ✗ ' + f));
  process.exit(1);
}
console.log('blocks-l3-map smoke clean — OFF passthrough + ON routing + adapter mapping verified');
process.exit(0);
