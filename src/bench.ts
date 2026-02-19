import { mkdir, writeFile } from "node:fs/promises";
import os from "node:os";
import { join } from "node:path";
import process from "node:process";
import { parseArgs } from "node:util";
import { createBenchContext } from "./context.js";
import { benchRenderers } from "./renderers/index.js";
import type { BenchCaseSkip, BenchCaseStats, BenchTaskName, TaskOutput } from "./types.js";
import { UnsupportedTaskError, formatMb, mean, percentile } from "./utils.js";

const ALL_TASKS: BenchTaskName[] = [
  "image-buffer",
  "image-stream",
  "kitchen-sink",
  "text-layout",
  "encode-png",
  "encode-webp",
  "encode-svg",
];

interface CliOptions {
  tasks: BenchTaskName[];
  iterations: number;
  warmup: number;
  saveImages: boolean;
  saveDir: string;
  reportJsonPath: string;
  reportMarkdownPath: string;
}

interface SavedImageRecord {
  renderer: string;
  task: BenchTaskName;
  format: "png" | "webp" | "svg";
  path: string;
}

function parseInteger(value: string | undefined, fallback: number, label: string): number {
  if (value === undefined) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }

  return parsed;
}

function parseTasks(value: string | string[] | undefined): BenchTaskName[] {
  if (value === undefined) {
    return ALL_TASKS;
  }

  const requested = (Array.isArray(value) ? value : [value])
    .flatMap((item) => item.split(","))
    .map((item) => item.trim())
    .filter(Boolean);

  if (requested.length === 0) {
    throw new Error("--workload requires at least one task name");
  }

  const invalid = requested.filter((item) => !ALL_TASKS.includes(item as BenchTaskName));
  if (invalid.length > 0) {
    throw new Error(`Unknown workload(s): ${invalid.join(", ")}`);
  }

  return requested as BenchTaskName[];
}

function parseCliOptions(): CliOptions {
  const rawArgs = process.argv.slice(2);
  const args = rawArgs.filter((arg) => arg !== "--");
  const { values } = parseArgs({
    args,
    options: {
      workload: { type: "string", multiple: true },
      iterations: { type: "string" },
      warmup: { type: "string" },
      "save-images": { type: "boolean", default: false },
      "save-dir": { type: "string" },
    },
    strict: true,
    allowPositionals: false,
  });

  const saveDirArg = values["save-dir"];
  const saveImages = values["save-images"] || saveDirArg !== undefined;

  return {
    tasks: parseTasks(values.workload),
    warmup: parseInteger(values.warmup ?? process.env.BENCH_WARMUP, 3, "warmup"),
    iterations: parseInteger(values.iterations ?? process.env.BENCH_ITERATIONS, 12, "iterations"),
    saveImages,
    saveDir: saveDirArg ?? join(process.cwd(), "outputs", "samples"),
    reportJsonPath: join(process.cwd(), "outputs", "benchmark-report.json"),
    reportMarkdownPath: join(process.cwd(), "outputs", "benchmark-report.md"),
  };
}

function round(value: number, digits = 3): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function outputValueAsNumber(output: TaskOutput): number {
  return output.kind === "image" ? output.bytes : output.value;
}

async function runCase(
  task: BenchTaskName,
  renderer: (typeof benchRenderers)[number],
  options: CliOptions,
  context: Awaited<ReturnType<typeof createBenchContext>>,
): Promise<{
  stats: BenchCaseStats;
  sample?: {
    format: "png" | "webp" | "svg";
    buffer: Buffer;
  };
}> {
  for (let iteration = 0; iteration < options.warmup; iteration += 1) {
    await renderer.run(context, task);
  }

  globalThis.gc?.();

  const baseline = process.memoryUsage();
  const times: number[] = [];
  const outputs: number[] = [];

  let rssPeak = baseline.rss;
  let heapPeak = baseline.heapUsed;
  let outputKind: TaskOutput["kind"] = "metric";
  let outputUnit: "bytes" | "value" = "value";
  let sample:
    | {
        format: "png" | "webp" | "svg";
        buffer: Buffer;
      }
    | undefined;

  for (let iteration = 0; iteration < options.iterations; iteration += 1) {
    const start = performance.now();
    const output = await renderer.run(context, task);
    const end = performance.now();

    outputKind = output.kind;
    outputUnit = output.kind === "image" ? "bytes" : "value";

    if (options.saveImages && !sample && output.kind === "image") {
      sample = {
        format: output.format,
        buffer: output.buffer,
      };
    }

    times.push(end - start);
    outputs.push(outputValueAsNumber(output));

    const memory = process.memoryUsage();
    rssPeak = Math.max(rssPeak, memory.rss);
    heapPeak = Math.max(heapPeak, memory.heapUsed);
  }

  globalThis.gc?.();
  const ending = process.memoryUsage();

  return {
    stats: {
      renderer: renderer.name,
      task,
      iterations: options.iterations,
      warmup: options.warmup,
      avgMs: round(mean(times)),
      p95Ms: round(percentile(times, 0.95)),
      minMs: round(Math.min(...times)),
      maxMs: round(Math.max(...times)),
      rssPeakDeltaMb: round(formatMb(rssPeak - baseline.rss)),
      heapPeakDeltaMb: round(formatMb(heapPeak - baseline.heapUsed)),
      heapEndDeltaMb: round(formatMb(ending.heapUsed - baseline.heapUsed)),
      outputKind,
      outputAverage: round(mean(outputs)),
      outputUnit,
    },
    sample,
  };
}

function toSafeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function formatOutput(stats: BenchCaseStats): string {
  if (stats.outputKind === "image") {
    return `${round(stats.outputAverage / 1024, 2)} KB`;
  }

  return `${round(stats.outputAverage, 2)}`;
}

function buildMarkdownReport(
  options: CliOptions,
  stats: BenchCaseStats[],
  skipped: BenchCaseSkip[],
  savedImages: SavedImageRecord[],
): string {
  const lines: string[] = [];

  lines.push("# Node Image Library Benchmark Report");
  lines.push("");
  lines.push(`Generated: ${new Date().toISOString()}`);
  lines.push(`- Node.js: ${process.version}`);
  lines.push(`- Platform: ${process.platform} ${process.arch}`);
  lines.push(`- CPU: ${os.cpus()[0]?.model ?? "unknown"}`);
  lines.push(`- GC exposed: ${globalThis.gc ? "yes" : "no"}`);
  lines.push(`- Warmup iterations: ${options.warmup}`);
  lines.push(`- Measured iterations: ${options.iterations}`);
  lines.push("");
  lines.push("## Method");
  lines.push("");
  lines.push("- `image-stream` uses in-memory streams sourced from preloaded fixture buffers (disk I/O excluded).");
  lines.push("- Memory columns are per-case peak deltas from per-case baseline (`rss`, `heapUsed`).");
  lines.push("- `text-layout`: canvas/takumi use text layout measurement widths; satori reports SVG output size from text layout generation.");
  lines.push("");

  for (const task of options.tasks) {
    const rows = stats
      .filter((entry) => entry.task === task)
      .sort((left, right) => left.avgMs - right.avgMs);

    lines.push(`## ${task}`);
    lines.push("");

    if (rows.length === 0) {
      lines.push("No successful runs.");
      lines.push("");
      continue;
    }

    lines.push("| Renderer | Avg (ms) | P95 (ms) | Min (ms) | Max (ms) | RSS peak Δ (MB) | Heap peak Δ (MB) | Output |",
    );
    lines.push("|---|---:|---:|---:|---:|---:|---:|---:|");

    for (const row of rows) {
      lines.push(
        `| ${row.renderer} | ${row.avgMs.toFixed(3)} | ${row.p95Ms.toFixed(3)} | ${row.minMs.toFixed(3)} | ${row.maxMs.toFixed(3)} | ${row.rssPeakDeltaMb.toFixed(3)} | ${row.heapPeakDeltaMb.toFixed(3)} | ${formatOutput(row)} |`,
      );
    }

    lines.push("");
  }

  if (skipped.length > 0) {
    lines.push("## Unsupported / Skipped");
    lines.push("");
    lines.push("| Renderer | Task | Reason |",);
    lines.push("|---|---|---|");

    for (const skip of skipped) {
      lines.push(`| ${skip.renderer} | ${skip.task} | ${skip.reason.replaceAll("|", "\\|")} |`);
    }

    lines.push("");
  }

  if (savedImages.length > 0) {
    lines.push("## Saved Images");
    lines.push("");
    lines.push("| Renderer | Task | Format | Path |");
    lines.push("|---|---|---|---|");

    for (const image of savedImages) {
      lines.push(`| ${image.renderer} | ${image.task} | ${image.format} | ${image.path.replaceAll("|", "\\|")} |`);
    }

    lines.push("");
  }

  return lines.join("\n");
}

const options = parseCliOptions();
const context = await createBenchContext();
const stats: BenchCaseStats[] = [];
const skipped: BenchCaseSkip[] = [];
const savedImages: SavedImageRecord[] = [];

for (const renderer of benchRenderers) {
  await renderer.prepare?.(context);
}

if (options.saveImages) {
  await mkdir(options.saveDir, { recursive: true });
}

for (const task of options.tasks) {
  for (const renderer of benchRenderers) {
    process.stdout.write(`running ${renderer.name} :: ${task} ... `);

    try {
      const result = await runCase(task, renderer, options, context);
      stats.push(result.stats);
      console.log(`avg ${result.stats.avgMs.toFixed(3)} ms`);

      if (options.saveImages && result.sample) {
        const fileName = `${toSafeFileName(task)}__${toSafeFileName(renderer.name)}.${result.sample.format}`;
        const filePath = join(options.saveDir, fileName);
        await writeFile(filePath, result.sample.buffer);
        savedImages.push({
          renderer: renderer.name,
          task,
          format: result.sample.format,
          path: filePath,
        });
      }
    } catch (error) {
      if (error instanceof UnsupportedTaskError) {
        skipped.push({
          renderer: renderer.name,
          task,
          reason: error.message,
        });
        console.log("skipped");
        continue;
      }

      console.log("failed");
      throw error;
    }
  }
}

await mkdir(join(process.cwd(), "outputs"), { recursive: true });

const reportJson = {
  generatedAt: new Date().toISOString(),
  node: process.version,
  platform: `${process.platform}-${process.arch}`,
  cpu: os.cpus()[0]?.model ?? "unknown",
  tasks: options.tasks,
  warmup: options.warmup,
  iterations: options.iterations,
  gcExposed: Boolean(globalThis.gc),
  stats,
  skipped,
  savedImages,
};

const reportMarkdown = buildMarkdownReport(options, stats, skipped, savedImages);

await Promise.all([
  writeFile(options.reportJsonPath, `${JSON.stringify(reportJson, null, 2)}\n`),
  writeFile(options.reportMarkdownPath, reportMarkdown),
]);

console.log(`\nWrote JSON report: ${options.reportJsonPath}`);
console.log(`Wrote Markdown report: ${options.reportMarkdownPath}`);
if (options.saveImages) {
  console.log(`Saved sample images: ${options.saveDir}`);
}
