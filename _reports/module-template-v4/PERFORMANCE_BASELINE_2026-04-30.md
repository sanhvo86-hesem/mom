# HMV4 Performance Baseline — 2026-04-30

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 88ms | 88ms | 0.000 | 0ms | 41ms | 50ms | 557ms | 196 KB | 7 |
| workspace-board | 100ms | 100ms | 0.000 | 0ms | 58ms | 58ms | 604ms | 195 KB | 7 |
| workspace-board-degraded | 356ms | 356ms | 0.000 | 0ms | 324ms | 324ms | 879ms | 195 KB | 7 |
| nc-overview | 184ms | 184ms | 0.000 | 0ms | 149ms | 149ms | 666ms | 193 KB | 7 |
| nc-conflict | 64ms | 64ms | 0.000 | 0ms | 28ms | 29ms | 541ms | 193 KB | 7 |
| nc-degraded | 60ms | 60ms | 0.000 | 0ms | 25ms | 26ms | 553ms | 193 KB | 7 |
| portal-baseline | 368ms | 368ms | 0.003 | 0ms | 922ms | 922ms | 943ms | 10971 KB | 126 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
