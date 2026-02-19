import { Readable } from "node:stream";
import { toPngDataUri } from "./io.js";

export class UnsupportedTaskError extends Error {
  constructor(task: string, detail: string) {
    super(`${task}: ${detail}`);
    this.name = "UnsupportedTaskError";
  }
}

export function toDataUri(buffer: Buffer): string {
  return toPngDataUri(buffer);
}

export async function streamToBuffer(stream: Readable): Promise<Buffer> {
  const chunks: Buffer[] = [];

  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }

  return Buffer.concat(chunks);
}

export function mean(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function percentile(values: number[], fraction: number): number {
  if (values.length === 0) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.min(sorted.length - 1, Math.max(0, Math.ceil(sorted.length * fraction) - 1));
  return sorted[index] ?? 0;
}

export function formatMb(bytes: number): number {
  return bytes / (1024 * 1024);
}

export function createInMemoryPngStream(buffer: Buffer): Readable {
  return Readable.from(buffer);
}
