# HMV4 Performance Baseline — 2026-04-27

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 624ms | 624ms | 0.000 | 0ms | 593ms | 598ms | 1115ms | 196 KB | 7 |
| workspace-board | 48ms | 48ms | 0.000 | 0ms | 17ms | 17ms | 546ms | 195 KB | 7 |
| workspace-board-degraded | 44ms | 44ms | 0.000 | 0ms | 17ms | 18ms | 526ms | 195 KB | 7 |
| nc-overview | 444ms | 444ms | 0.000 | 0ms | 395ms | 397ms | 975ms | 193 KB | 7 |
| nc-conflict | 296ms | 296ms | 0.000 | 0ms | 261ms | 261ms | 816ms | 193 KB | 7 |
| nc-degraded | 116ms | 116ms | 0.000 | 0ms | 87ms | 88ms | 616ms | 193 KB | 7 |
| portal-baseline | 220ms | 220ms | 0.001 | 9ms | 827ms | 1101ms | 1927ms | 10964 KB | 124 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
