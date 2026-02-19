import { drawCoverImage, drawKitchenSink, measureTextLayout } from "../canvasScene.js";
import type { BenchContext, BenchRenderer } from "../types.js";
import { UnsupportedTaskError, streamToBuffer } from "../utils.js";

interface SkiaCanvasModule {
  createCanvas?: (width: number, height: number) => {
    width: number;
    height: number;
    getContext: (contextType: "2d") => unknown;
    toBuffer?: (format?: string) => Buffer | Uint8Array | Promise<Buffer | Uint8Array>;
    png?: Promise<Buffer | Uint8Array>;
  };
  Canvas?: new (width: number, height: number) => {
    width: number;
    height: number;
    getContext: (contextType: "2d") => unknown;
    toBuffer?: (format?: string) => Buffer | Uint8Array | Promise<Buffer | Uint8Array>;
    png?: Promise<Buffer | Uint8Array>;
  };
  loadImage?: (source: Buffer | string) => Promise<unknown>;
  Image?: new () => {
    src: Buffer | string;
    decode?: () => Promise<unknown>;
  };
  FontLibrary?: {
    use?: (...args: unknown[]) => unknown;
  };
}

let skiaModulePromise: Promise<SkiaCanvasModule> | null = null;
let fontsRegistered = false;

function getSkiaModule(): Promise<SkiaCanvasModule> {
  if (!skiaModulePromise) {
    skiaModulePromise = import("skia-canvas") as unknown as Promise<SkiaCanvasModule>;
  }

  return skiaModulePromise;
}

function resolveCreateCanvas(skia: SkiaCanvasModule): NonNullable<SkiaCanvasModule["createCanvas"]> {
  if (typeof skia.createCanvas === "function") {
    return skia.createCanvas;
  }

  if (typeof skia.Canvas === "function") {
    return (width, height) => new skia.Canvas!(width, height);
  }

  throw new Error("skia-canvas did not expose createCanvas or Canvas");
}

function ensureFonts(skia: SkiaCanvasModule, context: BenchContext): void {
  if (fontsRegistered) {
    return;
  }

  const fontUse = skia.FontLibrary?.use;

  if (typeof fontUse === "function") {
    try {
      fontUse.call(skia.FontLibrary, context.fontFamily, [context.fontPaths.regular, context.fontPaths.semibold]);
    } catch {
      fontUse.call(skia.FontLibrary, context.fontFamily, context.fontPaths.regular);
      fontUse.call(skia.FontLibrary, context.fontFamily, context.fontPaths.semibold);
    }
  }

  fontsRegistered = true;
}

async function loadSkiaImage(skia: SkiaCanvasModule, source: Buffer): Promise<unknown> {
  if (typeof skia.loadImage === "function") {
    return skia.loadImage(source);
  }

  if (typeof skia.Image === "function") {
    const image = new skia.Image();
    image.src = source;

    if (typeof image.decode === "function") {
      await image.decode();
    }

    return image;
  }

  throw new Error("skia-canvas did not expose loadImage or Image");
}

async function encodeCanvas(
  canvas: {
    toBuffer?: (format?: string) => Buffer | Uint8Array | Promise<Buffer | Uint8Array>;
    png?: Promise<Buffer | Uint8Array>;
  },
  format: "png" | "webp" | "svg",
  task: string,
): Promise<Buffer> {
  const encoderInput = format === "png" ? "png" : format;

  if (typeof canvas.toBuffer === "function") {
    try {
      const output = await canvas.toBuffer(encoderInput);
      return Buffer.isBuffer(output) ? output : Buffer.from(output);
    } catch (error) {
      throw new UnsupportedTaskError(task, `failed to encode ${format}: ${(error as Error).message}`);
    }
  }

  if (format === "png" && canvas.png) {
    const output = await canvas.png;
    return Buffer.isBuffer(output) ? output : Buffer.from(output);
  }

  throw new UnsupportedTaskError(task, `skia-canvas could not encode ${format}`);
}

export const skiaCanvasBenchRenderer: BenchRenderer = {
  name: "skia-canvas",
  run: async (context, task) => {
    const skia = await getSkiaModule();
    ensureFonts(skia, context);

    const createCanvas = resolveCreateCanvas(skia);
    const canvas = createCanvas(context.width, context.height);
    const ctx = canvas.getContext("2d") as Parameters<typeof drawKitchenSink>[0];

    if (task === "image-buffer") {
      const image = await loadSkiaImage(skia, context.buffers.background);
      drawCoverImage(ctx, canvas, image as { width: number; height: number });
      const png = await encodeCanvas(canvas, "png", task);
      return { kind: "image", format: "png", bytes: png.length, buffer: png };
    }

    if (task === "image-stream") {
      const sourceBuffer = await streamToBuffer(context.createBackgroundStream());
      const image = await loadSkiaImage(skia, sourceBuffer);
      drawCoverImage(ctx, canvas, image as { width: number; height: number });
      const png = await encodeCanvas(canvas, "png", task);
      return { kind: "image", format: "png", bytes: png.length, buffer: png };
    }

    if (task === "text-layout") {
      const total = measureTextLayout(ctx, context);
      return { kind: "metric", value: total };
    }

    const format =
      task === "encode-webp"
        ? "webp"
        : task === "encode-svg"
          ? "svg"
          : "png";

    const [background, avatar, badge] = await Promise.all([
      loadSkiaImage(skia, context.buffers.background),
      loadSkiaImage(skia, context.buffers.avatar),
      loadSkiaImage(skia, context.buffers.badge),
    ]);

    drawKitchenSink(
      ctx,
      canvas,
      {
        background: background as { width: number; height: number },
        avatar,
        badge,
      },
      context,
    );

    const output = await encodeCanvas(canvas, format, task);
    return { kind: "image", format, bytes: output.length, buffer: output };
  },
};
