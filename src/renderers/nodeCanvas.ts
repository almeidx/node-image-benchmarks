import { createCanvas, loadImage, registerFont } from "canvas";
import { drawCoverImage, drawKitchenSink, measureTextLayout } from "../canvasScene.js";
import type { BenchContext, BenchRenderer } from "../types.js";
import { UnsupportedTaskError, streamToBuffer } from "../utils.js";

let fontsRegistered = false;

function ensureFonts(context: BenchContext): void {
  if (fontsRegistered) {
    return;
  }

  registerFont(context.fontPaths.regular, {
    family: context.fontFamily,
    weight: "400",
    style: "normal",
  });

  registerFont(context.fontPaths.semibold, {
    family: context.fontFamily,
    weight: "600",
    style: "normal",
  });

  fontsRegistered = true;
}

function encodeRasterCanvas(
  canvas: ReturnType<typeof createCanvas>,
  format: "png" | "webp",
  task: string,
): Buffer {
  try {
    const dynamicCanvas = canvas as unknown as {
      toBuffer: (mimeType?: string) => Buffer | undefined;
    };
    const output = format === "webp" ? dynamicCanvas.toBuffer("image/webp") : dynamicCanvas.toBuffer("image/png");

    if (!output) {
      throw new Error(`${format} encoding returned no buffer`);
    }

    return output;
  } catch (error) {
    throw new UnsupportedTaskError(task, `failed to encode ${format}: ${(error as Error).message}`);
  }
}

function encodeSvgCanvas(canvas: ReturnType<typeof createCanvas>, task: string): Buffer {
  try {
    return canvas.toBuffer();
  } catch (error) {
    throw new UnsupportedTaskError(task, `failed to encode svg: ${(error as Error).message}`);
  }
}

export const nodeCanvasBenchRenderer: BenchRenderer = {
  name: "node-canvas",
  prepare: async (context) => {
    ensureFonts(context);
  },
  run: async (context, task) => {
    ensureFonts(context);

    if (task === "encode-svg") {
      const svgCanvas = createCanvas(context.width, context.height, "svg");
      const svgCtx = svgCanvas.getContext("2d") as unknown as Parameters<typeof drawKitchenSink>[0];

      const [background, avatar, badge] = await Promise.all([
        loadImage(context.buffers.background),
        loadImage(context.buffers.avatar),
        loadImage(context.buffers.badge),
      ]);

      drawKitchenSink(
        svgCtx,
        svgCanvas,
        {
          background: background as { width: number; height: number },
          avatar,
          badge,
        },
        context,
      );

      const svg = encodeSvgCanvas(svgCanvas, task);
      return { kind: "image", format: "svg", bytes: svg.length, buffer: svg };
    }

    const canvas = createCanvas(context.width, context.height);
    const ctx = canvas.getContext("2d") as unknown as Parameters<typeof drawKitchenSink>[0];

    if (task === "image-buffer") {
      const image = await loadImage(context.buffers.background);
      drawCoverImage(ctx, canvas, image as { width: number; height: number });
      const png = encodeRasterCanvas(canvas, "png", task);
      return { kind: "image", format: "png", bytes: png.length, buffer: png };
    }

    if (task === "image-stream") {
      const sourceBuffer = await streamToBuffer(context.createBackgroundStream());
      const image = await loadImage(sourceBuffer);
      drawCoverImage(ctx, canvas, image as { width: number; height: number });
      const png = encodeRasterCanvas(canvas, "png", task);
      return { kind: "image", format: "png", bytes: png.length, buffer: png };
    }

    if (task === "text-layout") {
      const total = measureTextLayout(ctx, context);
      return { kind: "metric", value: total };
    }

    const format = task === "encode-webp" ? "webp" : "png";

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

    const output = encodeRasterCanvas(canvas, format, task);
    return { kind: "image", format, bytes: output.length, buffer: output };
  },
};
