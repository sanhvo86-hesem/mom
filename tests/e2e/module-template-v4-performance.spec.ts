import { test, expect } from '@playwright/test';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

interface PerfMetrics {
  page: string;
  url: string;
  fcp: number | null;
  lcp: number | null;
  cls: number | null;
  tbt: number | null;
  domContentLoaded: number;
  loadEvent: number;
  totalDuration: number;
  transferKB: number;
  resourceCount: number;
}

const PERF_TARGETS = {
  fcpWarn: 1500,
  fcpFail: 3000,
  lcpWarn: 2500,
  lcpFail: 4000,
  tbtWarn: 200,
  tbtFail: 500,
  clsWarn: 0.1,
  clsFail: 0.25
} as const;

interface PerfTarget {
  name: string;
  url: string;
  waitUntil?: 'load' | 'domcontentloaded' | 'networkidle' | 'commit';
  timeoutMs?: number;
}

const perfTargets: PerfTarget[] = [
  { name: 'shell-home', url: '/tests/fixtures/module-template-v4/pages/shell-home.html' },
  { name: 'workspace-board', url: '/tests/fixtures/module-template-v4/pages/workspace-board.html' },
  { name: 'workspace-board-degraded', url: '/tests/fixtures/module-template-v4/pages/workspace-board-degraded.html' },
  { name: 'nc-overview', url: '/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-overview.html' },
  { name: 'nc-conflict', url: '/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-conflict.html' },
  { name: 'nc-degraded', url: '/tests/fixtures/module-template-v4/pages/authoritative-record-shell-nc-degraded.html' },
  { name: 'portal-baseline', url: '/mom/portal.html', waitUntil: 'domcontentloaded', timeoutMs: 60_000 }
];

const collected: PerfMetrics[] = [];

test.describe('module-template-v4 performance baseline', () => {
  test.use({ viewport: { width: 1280, height: 800 } });
  test.skip(
    ({ browserName }) => browserName !== 'chromium',
    'Performance baseline uses Chromium-specific PerformanceObserver entries (longtask, largest-contentful-paint).'
  );

  for (const target of perfTargets) {
    test(`perf: ${target.name}`, async ({ page }) => {
      if (target.timeoutMs) test.setTimeout(target.timeoutMs);
      const transferBytes: number[] = [];
      let resourceCount = 0;
      page.on('response', (resp) => {
        resourceCount += 1;
        const len = Number(resp.headers()['content-length'] || 0);
        if (len > 0) transferBytes.push(len);
      });

      const navStart = Date.now();
      await page.goto(target.url, { waitUntil: target.waitUntil ?? 'networkidle' });
      const totalDuration = Date.now() - navStart;

      const navTiming = await page.evaluate(() => {
        const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
        return nav
          ? {
              domContentLoaded: nav.domContentLoadedEventEnd - nav.startTime,
              loadEvent: nav.loadEventEnd - nav.startTime
            }
          : { domContentLoaded: 0, loadEvent: 0 };
      });

      const paintTiming = await page.evaluate(() => {
        const fcp = performance.getEntriesByName('first-contentful-paint')[0] as PerformanceEntry | undefined;
        return { fcp: fcp ? fcp.startTime : null };
      });

      // LCP via PerformanceObserver — give the browser one render frame to flush
      await page.waitForTimeout(800);
      const lcp = await page.evaluate(
        () =>
          new Promise<number | null>((resolveOuter) => {
            try {
              let last: number | null = null;
              const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                if (entries.length) {
                  last = entries[entries.length - 1].startTime;
                }
              });
              observer.observe({ type: 'largest-contentful-paint', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                resolveOuter(last);
              }, 400);
            } catch (_e) {
              resolveOuter(null);
            }
          })
      );

      // CLS via PerformanceObserver — buffered layout-shift entries
      const cls = await page.evaluate(
        () =>
          new Promise<number | null>((resolveOuter) => {
            try {
              let total = 0;
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries() as Array<PerformanceEntry & { value?: number; hadRecentInput?: boolean }>) {
                  if (!entry.hadRecentInput && typeof entry.value === 'number') total += entry.value;
                }
              });
              observer.observe({ type: 'layout-shift', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                resolveOuter(total);
              }, 200);
            } catch (_e) {
              resolveOuter(null);
            }
          })
      );

      // TBT proxy: long-task durations > 50ms summed during page load window
      const tbt = await page.evaluate(
        () =>
          new Promise<number | null>((resolveOuter) => {
            try {
              let totalBlocking = 0;
              const observer = new PerformanceObserver((list) => {
                for (const entry of list.getEntries()) {
                  const blocking = entry.duration - 50;
                  if (blocking > 0) totalBlocking += blocking;
                }
              });
              observer.observe({ type: 'longtask', buffered: true });
              setTimeout(() => {
                observer.disconnect();
                resolveOuter(totalBlocking);
              }, 200);
            } catch (_e) {
              resolveOuter(null);
            }
          })
      );

      const metrics: PerfMetrics = {
        page: target.name,
        url: target.url,
        fcp: paintTiming.fcp,
        lcp,
        cls,
        tbt,
        domContentLoaded: Math.round(navTiming.domContentLoaded),
        loadEvent: Math.round(navTiming.loadEvent),
        totalDuration,
        transferKB: Math.round(transferBytes.reduce((sum, n) => sum + n, 0) / 1024),
        resourceCount
      };
      collected.push(metrics);

      // Assertions: only fail on FAIL thresholds, not warnings
      if (metrics.fcp != null) {
        expect(metrics.fcp, `${target.name} FCP under fail threshold`).toBeLessThan(PERF_TARGETS.fcpFail);
      }
      if (metrics.lcp != null) {
        expect(metrics.lcp, `${target.name} LCP under fail threshold`).toBeLessThan(PERF_TARGETS.lcpFail);
      }
      if (metrics.cls != null) {
        expect(metrics.cls, `${target.name} CLS under fail threshold`).toBeLessThan(PERF_TARGETS.clsFail);
      }
      if (metrics.tbt != null) {
        expect(metrics.tbt, `${target.name} TBT under fail threshold`).toBeLessThan(PERF_TARGETS.tbtFail);
      }
    });
  }

  test.afterAll(async () => {
    if (collected.length === 0) return;
    const date = new Date().toISOString().slice(0, 10);
    const outPath = resolve(HERE, `../../_reports/module-template-v4/PERFORMANCE_BASELINE_${date}.md`);
    if (!existsSync(dirname(outPath))) mkdirSync(dirname(outPath), { recursive: true });
    const fmt = (v: number | null, unit = 'ms') =>
      v == null ? 'n/a' : unit === 'ms' ? `${Math.round(v)}ms` : v.toFixed(3);
    const lines = [
      `# HMV4 Performance Baseline — ${date}`,
      '',
      'Captured by `npm run test:perf` using Playwright PerformanceObserver',
      '(longtask, layout-shift, largest-contentful-paint, paint).',
      'Local-machine run; treat as a relative baseline, not absolute SLI.',
      '',
      '## Metrics',
      '',
      '| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |',
      '|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|',
      ...collected.map(
        (m) =>
          `| ${m.page} | ${fmt(m.fcp)} | ${fmt(m.lcp)} | ${fmt(m.cls, 'cls')} | ${fmt(m.tbt)} | ${m.domContentLoaded}ms | ${m.loadEvent}ms | ${m.totalDuration}ms | ${m.transferKB} KB | ${m.resourceCount} |`
      ),
      '',
      '## Thresholds',
      '',
      `- FCP: warn > ${PERF_TARGETS.fcpWarn}ms, fail > ${PERF_TARGETS.fcpFail}ms`,
      `- LCP: warn > ${PERF_TARGETS.lcpWarn}ms, fail > ${PERF_TARGETS.lcpFail}ms`,
      `- TBT: warn > ${PERF_TARGETS.tbtWarn}ms, fail > ${PERF_TARGETS.tbtFail}ms`,
      `- CLS: warn > ${PERF_TARGETS.clsWarn}, fail > ${PERF_TARGETS.clsFail}`,
      ''
    ];
    writeFileSync(outPath, lines.join('\n'), 'utf8');
    console.log(`\n[perf] Baseline written to ${outPath}`);
  });
});
