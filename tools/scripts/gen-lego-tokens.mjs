#!/usr/bin/env node
/* HESEM Lego Foundation token generator.
 *
 * Reads the DTCG 2025.10 source (tokens/lego.tokens.json), derives OKLCH brand/
 * status ramps (base/hover/active/on) + semantic aliases, and emits:
 *   - mom/styles/lego-foundation.css   (CSS custom properties, @layer lego.tokens,
 *                                        hex defaults + @supports OKLCH enhancement,
 *                                        light + dark via the app's data-color-mode)
 *   - tokens/lego.tokens.generated.json (compiled DTCG interchange artifact)
 *
 * Pure Node, no dependencies. Run:  node tools/scripts/gen-lego-tokens.mjs
 * The generated CSS is additive + namespaced (--lego-*); it does not override any
 * existing production variable. The runtime theming engine (00bg-lego-theme.js)
 * bridges these onto the live-consumed vars when an admin applies a brand.
 *
 * Color math: Björn Ottosson's OKLab/OKLCH (public domain).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';

const CHECK = process.argv.includes('--check');
const ROOT = new URL('../../', import.meta.url);
const SRC = new URL('tokens/lego.tokens.json', ROOT);
const OUT_CSS = new URL('mom/styles/lego-foundation.css', ROOT);
const OUT_SHELL = new URL('mom/styles/lego-shell.css', ROOT);
const OUT_JSON = new URL('tokens/lego.tokens.generated.json', ROOT);

/* ── color math ─────────────────────────────────────────────────────────── */
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
const cbrt = (x) => Math.cbrt(x);
function hexToRgb(hex){
  const h = hex.replace('#','').trim();
  const v = h.length === 3 ? h.split('').map(c=>c+c).join('') : h;
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
const toHex2 = (n) => clamp(Math.round(n),0,255).toString(16).padStart(2,'0');
const rgbToHex = ([r,g,b]) => '#' + toHex2(r)+toHex2(g)+toHex2(b);
const sToLin = (c) => { c/=255; return c<=0.04045 ? c/12.92 : Math.pow((c+0.055)/1.055, 2.4); };
const linToS = (c) => { const v = c<=0.0031308 ? c*12.92 : 1.055*Math.pow(c,1/2.4)-0.055; return v*255; };
function rgbToOklab([r,g,b]){
  const lr=sToLin(r), lg=sToLin(g), lb=sToLin(b);
  const l = 0.4122214708*lr + 0.5363325363*lg + 0.0514459929*lb;
  const m = 0.2119034982*lr + 0.6806995451*lg + 0.1073969566*lb;
  const s = 0.0883024619*lr + 0.2817188376*lg + 0.6299787005*lb;
  const l_=cbrt(l), m_=cbrt(m), s_=cbrt(s);
  return [
    0.2104542553*l_ + 0.7936177850*m_ - 0.0040720468*s_,
    1.9779984951*l_ - 2.4285922050*m_ + 0.4505937099*s_,
    0.0259040371*l_ + 0.7827717662*m_ - 0.8086757660*s_
  ];
}
function oklabToRgb([L,a,b]){
  const l_ = L + 0.3963377774*a + 0.2158037573*b;
  const m_ = L - 0.1055613458*a - 0.0638541728*b;
  const s_ = L - 0.0894841775*a - 1.2914855480*b;
  const l=l_*l_*l_, m=m_*m_*m_, s=s_*s_*s_;
  return [
    linToS( 4.0767416621*l - 3.3077115913*m + 0.2309699292*s),
    linToS(-1.2684380046*l + 2.6097574011*m - 0.3413193965*s),
    linToS(-0.0041960863*l - 0.7034186147*m + 1.7076147010*s)
  ];
}
function rgbToOklch(rgb){
  const [L,a,b] = rgbToOklab(rgb);
  const C = Math.hypot(a,b);
  let H = Math.atan2(b,a) * 180/Math.PI;
  if(H<0) H+=360;
  return { L, C, H };
}
function oklchToRgb({L,C,H}){
  const hr = H*Math.PI/180;
  return oklabToRgb([L, C*Math.cos(hr), C*Math.sin(hr)]).map(v=>clamp(v,0,255));
}
const oklchToHex = (o) => rgbToHex(oklchToRgb(o));
const fmtL = (n) => (Math.round(n*1000)/1000);
const fmtC = (n) => (Math.round(n*1000)/1000);
const fmtH = (n) => (Math.round(n*100)/100);
const oklchStr = ({L,C,H}) => `oklch(${fmtL(L)} ${fmtC(C)} ${fmtH(H)})`;

/* derive base/hover/active/on for a seed hex */
function deriveRamp(hex){
  const base = rgbToOklch(hexToRgb(hex));
  const hover  = { L: clamp(base.L-0.05,0,1), C: base.C, H: base.H };
  const active = { L: clamp(base.L-0.10,0,1), C: base.C, H: base.H };
  // readable foreground on the base color
  const on = base.L < 0.62 ? { L:0.99, C:0, H:base.H } : { L:0.20, C:0.01, H:base.H };
  return { base, hover, active, on };
}

/* ── build ──────────────────────────────────────────────────────────────── */
const srcRaw = readFileSync(SRC, 'utf8');
const SRC_SHA = createHash('sha256').update(srcRaw).digest('hex').slice(0, 16);
const src = JSON.parse(srcRaw);
const seeds = src.color.seed;
const SEED_NAMES = Object.keys(seeds).filter(k => !k.startsWith('$'));

const hexLines = [];   // universal hex defaults
const oklchLines = []; // @supports enhancement
const compiled ={ $description: 'GENERATED — do not edit. Source: tokens/lego.tokens.json', $sourceSha256: SRC_SHA, color: { seed:{}, derived:{} } };

for(const name of SEED_NAMES){
  const hex = seeds[name].$value;
  const r = deriveRamp(hex);
  hexLines.push(`    --lego-${name}: ${oklchToHex(r.base)};`);
  hexLines.push(`    --lego-${name}-hover: ${oklchToHex(r.hover)};`);
  hexLines.push(`    --lego-${name}-active: ${oklchToHex(r.active)};`);
  hexLines.push(`    --lego-${name}-on: ${oklchToHex(r.on)};`);
  oklchLines.push(`    --lego-${name}: ${oklchStr(r.base)};`);
  oklchLines.push(`    --lego-${name}-hover: ${oklchStr(r.hover)};`);
  oklchLines.push(`    --lego-${name}-active: ${oklchStr(r.active)};`);
  oklchLines.push(`    --lego-${name}-on: ${oklchStr(r.on)};`);
  compiled.color.seed[name] = hex;
  compiled.color.derived[name] = {
    base: oklchToHex(r.base), hover: oklchToHex(r.hover), active: oklchToHex(r.active), on: oklchToHex(r.on),
    oklch: { base: oklchStr(r.base), hover: oklchStr(r.hover), active: oklchStr(r.active) }
  };
}

/* mode-aware derived (color-mix) — subtle/border per seed */
const mixLight = [], mixDark = [];
for(const name of SEED_NAMES){
  mixLight.push(`    --lego-${name}-subtle: color-mix(in oklab, var(--lego-${name}), white 88%);`);
  mixLight.push(`    --lego-${name}-border: color-mix(in oklab, var(--lego-${name}), var(--lego-text-strong) 16%);`);
  mixDark.push(`    --lego-${name}-subtle: color-mix(in oklab, var(--lego-${name}), black 76%);`);
  mixDark.push(`    --lego-${name}-border: color-mix(in oklab, var(--lego-${name}), white 14%);`);
}

/* semantic surfaces/text/border light + dark */
function semanticGroup(group){
  const out = { light: [], dark: [] };
  const g = src.color[group];
  for(const k of Object.keys(g)){
    if(k.startsWith('$')) continue;
    const v = g[k].$value;
    out.light.push(`    --lego-${group}-${k}: ${v.light};`);
    out.dark.push(`    --lego-${group}-${k}: ${v.dark};`);
    compiled.color[`${group}.${k}`] = v;
  }
  return out;
}
const surf = semanticGroup('surface');
const text = semanticGroup('text');
const bord = semanticGroup('border');

/* scales */
const dim = (o) => `${o.value}${o.unit}`;
const scaleLines = [
  `    --lego-space: ${dim(src.space.master.$value)};`,
  `    --lego-space-section: ${dim(src.space.section.$value)};`,
  `    --lego-radius: ${dim(src.radius.master.$value)};`,
  `    --lego-radius-card: ${dim(src.radius.card.$value)};`,
  `    --lego-radius-pill: ${dim(src.radius.pill.$value)};`,
  `    --lego-control-h: ${dim(src.control.height.standard.$value)};`,
  `    --lego-control-h-cozy: ${dim(src.control.height.cozy.$value)};`,
  `    --lego-motion-fast: ${dim(src.motion.fast.$value)};`,
  `    --lego-motion-base: ${dim(src.motion.base.$value)};`,
  `    --lego-motion-slow: ${dim(src.motion.slow.$value)};`,
];
for(const k of Object.keys(src.font.size)){
  if(k.startsWith('$')) continue;
  scaleLines.push(`    --lego-font-${k}: ${dim(src.font.size[k].$value)};`);
}

const css = `/* ============================================================================
 * lego-foundation.css — GENERATED by tools/scripts/gen-lego-tokens.mjs
 * Source of truth: tokens/lego.tokens.json (DTCG 2025.10). DO NOT EDIT BY HAND.
 *
 * Additive + namespaced (--lego-*). Defines an OKLCH-derived token foundation:
 * one brand seed -> base/hover/active/on ramp; subtle/border via color-mix;
 * semantic surfaces/text/border with light + dark (app data-color-mode); a
 * progressive-enhancement @supports block upgrades the hex defaults to wide-gamut
 * OKLCH. Governed by @layer so tenant/runtime overrides win predictably.
 * ==========================================================================*/
/* @source-sha256 ${SRC_SHA} */
@layer lego.tokens, lego.components;

@layer lego.tokens {
  :root {
    /* ── derived brand/status ramps (hex, universal) ── */
${hexLines.join('\n')}

    /* ── semantic surfaces / text / border (light) ── */
${surf.light.join('\n')}
${text.light.join('\n')}
${bord.light.join('\n')}

    /* ── scales ── */
${scaleLines.join('\n')}

    /* ── mode-aware derived (light) ── */
${mixLight.join('\n')}
  }

  :root[data-color-mode="dark"],
  :root[data-color-scheme-active="dark"] {
${surf.dark.join('\n')}
${text.dark.join('\n')}
${bord.dark.join('\n')}
${mixDark.join('\n')}
  }

  @media (prefers-color-scheme: dark) {
    :root[data-color-mode="auto"] {
${surf.dark.map(l=>'  '+l).join('\n')}
${text.dark.map(l=>'  '+l).join('\n')}
${bord.dark.map(l=>'  '+l).join('\n')}
${mixDark.map(l=>'  '+l).join('\n')}
    }
  }

  /* ── progressive enhancement: wide-gamut OKLCH on capable browsers ── */
  @supports (color: oklch(0.5 0.1 200)) {
    :root {
${oklchLines.join('\n')}
    }
  }
}

@layer lego.components {
  /* Performance utility: opt-in off-screen skipping for long block lists.
     Scoped via class so it never affects unrelated modules. */
  .lego-cv {
    content-visibility: auto;
    contain-intrinsic-size: auto 72px;
  }
  /* Auto-apply to the Lego Showcase module only — off-screen blocks are skipped
     during layout/paint, keeping scroll smooth. Scoped to the module container so
     production modules are untouched. (The router renders one tab at a time, so a
     tab holds up to ~21 blocks rather than all 161 — the win is modest but real
     on the long Data/Chart tabs.) */
  .hm-blocks-container[data-module="M-lego-showcase"] > .hm-block {
    content-visibility: auto;
    contain-intrinsic-size: auto 160px;
  }
  /* Visible keyboard focus for all controls (WCAG 2.2 2.4.7/2.4.13). */
  .hm-btn:focus-visible,
  .hm-link-card:focus-visible,
  .hm-nav-pills button:focus-visible,
  .hm-pagination button:focus-visible {
    outline: 2px solid var(--brand-2, #2563eb);
    outline-offset: 2px;
  }
  @media (prefers-reduced-motion: reduce) {
    .lego-anim { transition: none !important; animation: none !important; }
  }
}
`;

/* ── Module Shell v3 — full-bleed canvas + uniform frame (Theme Layout) ───────
 * Complete redesign per the "đập đi làm lại" brief: the module is a FULL-BLEED
 * canvas flush to the page (0px outer, no outer radius); inside, a single uniform
 * frame token (--lego-frame) drives BOTH the gap to the outer edge AND the gap
 * between blocks, so they are identical (8px) and tunable in one place. Blocks are
 * refined cards on the canvas. Everything binds to Theme Layout tokens (--lego-frame,
 * --lego-block-radius), which default to the master density knob and are overridable
 * at runtime by LegoTheme.setLayout / theme presets and by Module Master — nothing
 * is hardcoded. Scoped to engine-rendered modules (orders-v3 .o3-shell untouched). */
const shellCss = `/* ============================================================================
 * lego-shell.css — GENERATED by tools/scripts/gen-lego-tokens.mjs. DO NOT EDIT.
 * Module Shell v3: full-bleed canvas, uniform Theme-Layout frame. One token
 * (--lego-frame) = gap-to-edge = gap-between-blocks; --lego-block-radius = block
 * rounding; outer canvas is flush (0px) and square. Defaults to the master density
 * knob; overridable via LegoTheme.setLayout / theme presets / Module Master.
 * ==========================================================================*/
/* @source-sha256 ${SRC_SHA} */
:root{
  /* Theme Layout knobs (one uniform spacing + block rounding) */
  --lego-frame: var(--o3-space, 8px);
  --lego-block-radius: var(--o3-radius-card, 8px);
  --lego-shell-ppad: var(--o3-space-section, 12px);
  --lego-shell-bd: var(--border, #e2e8f0);
  --lego-shell-sf: var(--bg-surface, #fff);
  --lego-shell-canvas: var(--bg-page, #f1f5f9);
}
/* full-bleed: the module canvas reaches the page edge (0px gutter, no outer radius).
   renderModuleFromSchema wraps the shell in .hm-runtime-design-stage. */
#content > .page[data-module],
#content > .page:has(.hm-blocks-container){ padding: 0 !important; max-width: none !important; }
.hm-runtime-design-stage{
  padding: var(--lego-frame) !important;   /* uniform frame: gap to outer edge */
  margin: 0 !important;
  background: var(--lego-shell-canvas) !important;  /* deliberate module canvas, full-bleed */
  min-height: 100%;
  border-radius: 0 !important;
}
/* header: refined card; bottom gap == frame */
.hm-page-header{
  margin: 0 0 var(--lego-frame) !important;
  padding: var(--lego-frame) var(--lego-shell-ppad) !important;
  gap: var(--lego-frame) !important;
  background: var(--lego-shell-sf);
  border: 1px solid var(--lego-shell-bd);
  border-radius: var(--lego-block-radius);
}
.hm-page-title{ font-size: var(--text-lg, 16px) !important; }
/* tabs: tight connected strip; bottom gap == frame */
.hm-tab-bar, .hm-tabs{
  margin: 0 0 var(--lego-frame) !important;
  gap: 2px !important;
  padding: 4px !important;
  border-bottom: 0 !important;
  background: var(--lego-shell-sf);
  border: 1px solid var(--lego-shell-bd);
  border-radius: var(--lego-block-radius);
}
/* blocks: single column, uniform frame gap, each a refined card on the canvas */
.hm-blocks-container{ gap: var(--lego-frame) !important; }
.hm-block{
  margin: 0 !important;
  background: var(--lego-shell-sf);
  border: 1px solid var(--lego-shell-bd);
  border-radius: var(--lego-block-radius);
  padding: var(--lego-shell-ppad);
}
.hm-block.hm-block-no-pad{ padding: 0 !important; }
.hm-block.hm-block-flush{ background: transparent; border: 0; padding: 0; }
.hm-block-header{ margin: 0 0 var(--lego-frame) !important; }
.hm-block-title{ font-size: var(--text-md, 14px); font-weight: var(--font-bold, 700); color: var(--text-primary); }
/* inner filter-bar: strip its own card chrome (the .hm-block panel provides it) */
.hm-block .hm-filter-bar{ margin: 0 !important; border: 0 !important; border-radius: 0 !important; padding: 0 !important; background: transparent !important; gap: var(--lego-frame) !important; }
/* Admin graphics control plane (same tidy language): the .admin-panel outer card
   carried a chunky 16px radius — flatten it to 0 so the outer frame reads as
   'removed' (flush, edge-to-edge). Inner panels keep the refined --lego-block-radius
   and the uniform --lego-frame gaps. */
.admin-panel,
.admin-nav-panel{ border-radius: 0 !important; }
.admin-nav-panel{ padding: var(--lego-frame) !important; }
#admin-content.admin-panel{ margin: 0 !important; padding: var(--lego-frame) !important; }
/* Zero outer page gutter — panels flush to the #content edges */
#content > #page-admin.page{ padding: 0 !important; }
.admin-console-shell{ gap: 0 !important; }
/* Rail: stick flush to top, sized to visible area, no visible scrollbar track */
.admin-console-rail{
  top: 0 !important;
  max-height: calc(100vh - var(--header-h, 52px)) !important;
  padding-right: 0 !important;
  scrollbar-gutter: auto !important;
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
.admin-console-rail::-webkit-scrollbar{ display: none !important; }
/* Main page scroll (#content overflow-y:auto) hidden while admin is active */
#content:has(#page-admin.active){
  scrollbar-width: none !important;
  -ms-overflow-style: none !important;
}
#content:has(#page-admin.active)::-webkit-scrollbar{ display: none !important; }
`;

const jsonOut = JSON.stringify(compiled, null, 2) + '\n';

if (CHECK) {
  let drift = [];
  const onDisk = (u) => { try { return readFileSync(u, 'utf8'); } catch { return null; } };
  if (onDisk(OUT_CSS) !== css) drift.push('mom/styles/lego-foundation.css');
  if (onDisk(OUT_SHELL) !== shellCss) drift.push('mom/styles/lego-shell.css');
  if (onDisk(OUT_JSON) !== jsonOut) drift.push('tokens/lego.tokens.generated.json');
  if (drift.length) {
    console.error('[lego-tokens] DRIFT — out of sync with tokens/lego.tokens.json:\n  ' + drift.join('\n  ') +
      '\nRun: node tools/scripts/gen-lego-tokens.mjs');
    process.exit(1);
  }
  console.log('[lego-tokens] in sync ✓ (source-sha256 ' + SRC_SHA + ')');
  process.exit(0);
}

writeFileSync(OUT_CSS, css);
writeFileSync(OUT_SHELL, shellCss);
writeFileSync(OUT_JSON, jsonOut);
console.log('Wrote lego-foundation.css + lego-shell.css + tokens.generated.json (source-sha256 ' + SRC_SHA + ')');
console.log('  seeds: ' + SEED_NAMES.join(', '));
console.log('  derived ramp (brand): base=' + compiled.color.derived.brand.base + ' hover=' + compiled.color.derived.brand.hover + ' active=' + compiled.color.derived.brand.active + ' on=' + compiled.color.derived.brand.on);
