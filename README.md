# Node Image Benchmarks (TypeScript + ESM + pnpm)

This project benchmarks Node image-generation libraries with workload-oriented tests, not app-specific business logic.

Libraries in the suite:

- `@napi-rs/canvas`
- `canvas` (node-canvas)
- `skia-canvas`
- `takumi` (`@takumi-rs/core`) in two variants:
  - JSX + inline styles
  - JSX + Tailwind classes (`tw`)
- `satori` in two variants:
  - JSX + inline styles
  - JSX + Tailwind classes (`tw`)

## Workloads

- `image-buffer`: decode/draw from an in-memory buffer
- `image-stream`: decode/draw from an in-memory stream (disk I/O excluded)
- `kitchen-sink`: mixed composition (images, clipping, rounded shapes, overlays, multiple text blocks)
- `text-layout`: text layout/measurement-heavy task
- `encode-png`: kitchen-sink scene encoded as PNG
- `encode-webp`: kitchen-sink scene encoded as WebP (where supported)
- `encode-svg`: kitchen-sink scene encoded as SVG (where supported)

## Metrics

For each renderer/workload pair:

- Latency: average, p95, min, max (ms)
- Memory: peak RSS delta and peak heap delta (MB)
- Output size average (bytes/KB) for image outputs

Reports are written to:

- `outputs/benchmark-report.json`
- `outputs/benchmark-report.md`

Fonts are local files committed in this repo:

- `assets/fonts/Inter-Regular.ttf`
- `assets/fonts/Inter-SemiBold.ttf`

## Commands

```bash
pnpm install
pnpm build
pnpm bench
```

Run isolated benchmark groups:

```bash
pnpm bench:image-buffer
pnpm bench:image-stream
pnpm bench:kitchen-sink
pnpm bench:text-layout
pnpm bench:format
pnpm bench:save-images
```

Tune iterations:

```bash
BENCH_WARMUP=3 BENCH_ITERATIONS=20 pnpm bench
```

Save one generated sample per renderer/workload for manual visual comparison:

```bash
pnpm bench -- --save-images
pnpm bench -- --save-images --save-dir outputs/manual-comparison
```
