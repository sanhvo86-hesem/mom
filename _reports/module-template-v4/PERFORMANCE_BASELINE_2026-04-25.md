# HMV4 Performance Baseline — 2026-04-25

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 60ms | 60ms | 0.000 | 0ms | 31ms | 32ms | 593ms | 62 KB | 7 |
| workspace-board | 36ms | 36ms | 0.000 | 0ms | 9ms | 10ms | 575ms | 64 KB | 7 |
| workspace-board-degraded | 36ms | 36ms | 0.000 | 0ms | 9ms | 10ms | 518ms | 64 KB | 7 |
| nc-overview | 48ms | 48ms | 0.000 | 0ms | 14ms | 14ms | 569ms | 62 KB | 7 |
| nc-conflict | 52ms | 52ms | 0.000 | 0ms | 18ms | 19ms | 544ms | 62 KB | 7 |
| nc-degraded | 36ms | 36ms | 0.000 | 0ms | 9ms | 10ms | 525ms | 62 KB | 7 |
| portal-baseline | 120ms | 120ms | 0.003 | 2ms | 544ms | 0ms | 560ms | 10854 KB | 127 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
