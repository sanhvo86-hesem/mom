# HMV4 Performance Baseline — 2026-04-25

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 160ms | 160ms | 0.000 | 0ms | 122ms | 127ms | 648ms | 82 KB | 7 |
| workspace-board | 56ms | 56ms | 0.000 | 0ms | 15ms | 16ms | 529ms | 81 KB | 7 |
| workspace-board-degraded | 68ms | 68ms | 0.000 | 0ms | 12ms | 13ms | 576ms | 81 KB | 7 |
| nc-overview | 504ms | 504ms | 0.000 | 0ms | 468ms | 469ms | 988ms | 79 KB | 7 |
| nc-conflict | 56ms | 56ms | 0.000 | 0ms | 21ms | 22ms | 567ms | 79 KB | 7 |
| nc-degraded | 48ms | 48ms | 0.000 | 0ms | 16ms | 16ms | 527ms | 79 KB | 7 |
| portal-baseline | 688ms | 688ms | 0.004 | 27ms | 951ms | 952ms | 1033ms | 10850 KB | 126 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
