# HMV4 Performance Baseline — 2026-04-25

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 40ms | 40ms | 0.000 | 0ms | 12ms | 18ms | 587ms | 78 KB | 7 |
| workspace-board | 60ms | 60ms | 0.000 | 0ms | 24ms | 26ms | 583ms | 77 KB | 7 |
| workspace-board-degraded | 36ms | 36ms | 0.000 | 0ms | 9ms | 10ms | 525ms | 76 KB | 7 |
| nc-overview | 40ms | 40ms | 0.000 | 0ms | 11ms | 13ms | 570ms | 74 KB | 7 |
| nc-conflict | 48ms | 48ms | 0.000 | 0ms | 12ms | 12ms | 526ms | 75 KB | 7 |
| nc-degraded | 44ms | 44ms | 0.000 | 0ms | 14ms | 15ms | 528ms | 75 KB | 7 |
| portal-baseline | 296ms | 296ms | 0.003 | 8ms | 766ms | 0ms | 796ms | 10846 KB | 126 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
