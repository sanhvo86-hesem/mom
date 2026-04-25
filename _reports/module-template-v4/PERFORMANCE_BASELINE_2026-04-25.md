# HMV4 Performance Baseline — 2026-04-25

Captured by `npm run test:perf` using Playwright PerformanceObserver
(longtask, layout-shift, largest-contentful-paint, paint).
Local-machine run; treat as a relative baseline, not absolute SLI.

## Metrics

| Page | FCP | LCP | CLS | TBT | DCL | Load | Total | Transfer | Reqs |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| shell-home | 424ms | 424ms | 0.000 | 0ms | 394ms | 394ms | 915ms | 62 KB | 7 |
| workspace-board | 180ms | 180ms | 0.000 | 0ms | 149ms | 150ms | 664ms | 64 KB | 7 |
| workspace-board-degraded | 120ms | 120ms | 0.000 | 0ms | 86ms | 86ms | 674ms | 64 KB | 7 |
| nc-overview | 68ms | 68ms | 0.000 | 0ms | 36ms | 37ms | 597ms | 62 KB | 7 |
| nc-conflict | 52ms | 52ms | 0.000 | 0ms | 20ms | 20ms | 549ms | 62 KB | 7 |
| nc-degraded | 60ms | 60ms | 0.000 | 0ms | 21ms | 23ms | 578ms | 62 KB | 7 |
| portal-baseline | 84ms | 84ms | 0.003 | 0ms | 626ms | 0ms | 637ms | 10831 KB | 126 |

## Thresholds

- FCP: warn > 1500ms, fail > 3000ms
- LCP: warn > 2500ms, fail > 4000ms
- TBT: warn > 200ms, fail > 500ms
- CLS: warn > 0.1, fail > 0.25
