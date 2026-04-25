# HMV4 Performance Baseline — 2026-04-25

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 44ms | 44ms | 0.000 | 0ms | 13ms | 18ms | 543ms | 66 KB | 7 |
| workspace-board | 224ms | 224ms | 0.000 | 0ms | 189ms | 190ms | 718ms | 65 KB | 7 |
| workspace-board-degraded | 56ms | 56ms | 0.000 | 0ms | 11ms | 12ms | 573ms | 65 KB | 7 |
| nc-overview | 76ms | 76ms | 0.000 | 0ms | 38ms | 40ms | 585ms | 63 KB | 7 |
| nc-conflict | 52ms | 52ms | 0.000 | 0ms | 26ms | 26ms | 553ms | 63 KB | 7 |
| nc-degraded | 56ms | 56ms | 0.000 | 0ms | 15ms | 16ms | 524ms | 63 KB | 7 |
| portal-baseline | 76ms | 76ms | 0.003 | 0ms | 472ms | 0ms | 483ms | 10834 KB | 126 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
