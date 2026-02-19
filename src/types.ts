import type { Readable } from "node:stream";

export type BenchTaskName =
  | "image-buffer"
  | "image-stream"
  | "kitchen-sink"
  | "text-layout"
  | "encode-png"
  | "encode-webp"
  | "encode-svg";

export interface BenchContext {
  width: number;
  height: number;
  fontFamily: string;
  fontPaths: {
    regular: string;
    semibold: string;
  };
  buffers: {
    background: Buffer;
    avatar: Buffer;
    badge: Buffer;
  };
  dataUris: {
    background: string;
    avatar: string;
    badge: string;
  };
  textSamples: string[];
  createBackgroundStream: () => Readable;
  createAvatarStream: () => Readable;
}

export type TaskOutput =
  | {
      kind: "image";
      bytes: number;
      format: "png" | "webp" | "svg";
      buffer: Buffer;
    }
  | {
      kind: "metric";
      value: number;
    };

export interface BenchRenderer {
  name: string;
  prepare?: (context: BenchContext) => Promise<void>;
  run: (context: BenchContext, task: BenchTaskName) => Promise<TaskOutput>;
}

export interface BenchCaseStats {
  renderer: string;
  task: BenchTaskName;
  iterations: number;
  warmup: number;
  avgMs: number;
  p95Ms: number;
  minMs: number;
  maxMs: number;
  rssPeakDeltaMb: number;
  heapPeakDeltaMb: number;
  heapEndDeltaMb: number;
  outputKind: TaskOutput["kind"];
  outputAverage: number;
  outputUnit: "bytes" | "value";
}

export interface BenchCaseSkip {
  renderer: string;
  task: BenchTaskName;
  reason: string;
}
