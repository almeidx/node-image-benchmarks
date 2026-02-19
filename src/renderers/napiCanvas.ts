import { createCanvas, GlobalFonts, loadImage } from "@napi-rs/canvas";
import { drawCoverImage, drawKitchenSink, measureTextLayout } from "../canvasScene.js";
import type { BenchContext, BenchRenderer } from "../types.js";
import { UnsupportedTaskError, streamToBuffer } from "../utils.js";

let fontsRegistered = false;

function ensureFonts(context: BenchContext): void {
  if (fontsRegistered) {
    return;
  }

  GlobalFonts.registerFromPath(context.fontPaths.regular, context.fontFamily);
  GlobalFonts.registerFromPath(context.fontPaths.semibold, context.fontFamily);
  fontsRegistered = true;
}

async function encodeCanvas(
  canvas: ReturnType<typeof createCanvas> & {
    encode?: (format: "png" | "webp") => Promise<Buffer | Uint8Array>;
  },
  format: "png" | "webp" | "svg",
  task: string,
): Promise<Buffer> {
  if (format === "svg") {
    throw new UnsupportedTaskError(task, "@napi-rs/canvas does not support SVG encoding");
  }

  try {
    if (typeof canvas.encode !== "function") {
      throw new Error("encode() is not available on this canvas instance");
    }

    const output = await canvas.encode(format);
    return Buffer.isBuffer(output) ? output : Buffer.from(output);
  } catch (error) {
    throw new UnsupportedTaskError(task, `failed to encode ${format}: ${(error as Error).message}`);
  }
}

export const napiCanvasBenchRenderer: BenchRenderer = {
  name: "@napi-rs/canvas",
  prepare: async (context) => {
    ensureFonts(context);
  },
  run: async (context, task) => {
    ensureFonts(context);

    const canvas = createCanvas(context.width, context.height) as unknown as ReturnType<typeof createCanvas> & {
      encode?: (format: "png" | "webp") => Promise<Buffer | Uint8Array>;
    };
    const ctx = canvas.getContext("2d") as unknown as Parameters<typeof drawKitchenSink>[0];

    if (task === "image-buffer") {
      const image = await loadImage(context.buffers.background);
      drawCoverImage(ctx, canvas, image as { width: number; height: number });
      const png = await encodeCanvas(canvas, "png", task);
      return { kind: "image", format: "png", bytes: png.length, buffer: png };
    }

    if (task === "image-stream") {
      const sourceBuffer = await streamToBuffer(context.createBackgroundStream());
      const image = await loadImage(sourceBuffer);
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
      loadImage(context.buffers.background),
      loadImage(context.buffers.avatar),
      loadImage(context.buffers.badge),
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

    return {
      kind: "image",
      format,
      bytes: output.length,
      buffer: output,
    };
  },
};
