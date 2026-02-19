import { readFile } from "node:fs/promises";
import { Renderer as TakumiEngine } from "@takumi-rs/core";
import { fromJsx } from "@takumi-rs/helpers/jsx";
import type { ReactElement } from "react";
import type { BenchContext, BenchRenderer, BenchTaskName } from "../types.js";
import { UnsupportedTaskError, streamToBuffer, toDataUri } from "../utils.js";

type TakumiVariant = "style" | "tailwind";

let takumiEnginePromise: Promise<TakumiEngine> | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

async function getEngine(context: BenchContext): Promise<TakumiEngine> {
  if (!takumiEnginePromise) {
    takumiEnginePromise = (async () => {
      const [regularFont, semiboldFont] = await Promise.all([
        readFile(context.fontPaths.regular),
        readFile(context.fontPaths.semibold),
      ]);

      const engine = new TakumiEngine();
      await engine.loadFonts([toArrayBuffer(regularFont), toArrayBuffer(semiboldFont)]);
      return engine;
    })();
  }

  return takumiEnginePromise;
}

async function renderElement(
  engine: TakumiEngine,
  element: ReactElement,
  context: BenchContext,
  task: BenchTaskName,
  format: "png" | "webp",
): Promise<Buffer> {
  const node = await fromJsx(element);

  try {
    return await engine.render(node as { type: string }, {
      width: context.width,
      height: context.height,
      format,
    });
  } catch (error) {
    throw new UnsupportedTaskError(task, (error as Error).message);
  }
}

function buildImageElement(context: BenchContext, source: string, variant: TakumiVariant): ReactElement {
  if (variant === "tailwind") {
    return (
      <div tw="relative h-full w-full overflow-hidden bg-black">
        <img
          src={source}
          width={context.width}
          height={context.height}
          tw="absolute"
          style={{
            left: 0,
            top: 0,
            width: context.width,
            height: context.height,
            objectFit: "cover",
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        width: context.width,
        height: context.height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#0f172a",
      }}
    >
      <img
        src={source}
        width={context.width}
        height={context.height}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: context.width,
          height: context.height,
          objectFit: "cover",
        }}
      />
    </div>
  );
}

function buildKitchenSinkElement(context: BenchContext, variant: TakumiVariant): ReactElement {
  const progressWidth = Math.round((context.width - 84) * 0.67);
  const overlayGradient = "linear-gradient(135deg, rgba(10, 18, 32, 0.65) 0%, rgba(24, 42, 64, 0.25) 50%, rgba(8, 12, 20, 0.8) 100%)";

  if (variant === "tailwind") {
    return (
      <div tw="relative h-full w-full overflow-hidden text-white">
        <img
          src={context.dataUris.background}
          width={context.width}
          height={context.height}
          tw="absolute"
          style={{
            left: 0,
            top: 0,
            width: context.width,
            height: context.height,
            objectFit: "cover",
          }}
        />
        <div
          tw="absolute"
          style={{
            left: 0,
            top: 0,
            width: context.width,
            height: context.height,
            backgroundImage: overlayGradient,
          }}
        />

        <div
          tw="absolute overflow-hidden"
          style={{
            left: 42,
            top: 42,
            width: 220,
            height: 220,
            borderRadius: 28,
          }}
        >
          <img
            src={context.dataUris.avatar}
            width={220}
            height={220}
            tw="absolute"
            style={{
              left: 0,
              top: 0,
              width: 220,
              height: 220,
              objectFit: "cover",
            }}
          />
        </div>

        <div
          tw="absolute overflow-hidden"
          style={{
            left: 288,
            top: 64,
            width: 120,
            height: 120,
            borderRadius: 24,
          }}
        >
          <img
            src={context.dataUris.badge}
            width={120}
            height={120}
            tw="absolute"
            style={{
              left: 0,
              top: 0,
              width: 120,
              height: 120,
              objectFit: "cover",
            }}
          />
        </div>

        <div
          tw="absolute"
          style={{
            left: 42,
            top: 288,
            width: context.width - 84,
            height: 54,
            borderRadius: 27,
            backgroundColor: "rgba(31, 41, 55, 0.95)",
          }}
        />

        <div
          tw="absolute"
          style={{
            left: 42,
            top: 288,
            width: progressWidth,
            height: 54,
            borderRadius: 27,
            backgroundColor: "#4f91df",
          }}
        />

        <div
          tw="absolute rounded-full"
          style={{
            left: context.width - 102,
            top: 60,
            width: 56,
            height: 56,
            backgroundColor: "#f59e0b",
          }}
        />
        <div
          tw="absolute rounded-full"
          style={{
            left: context.width - 92,
            top: 70,
            width: 36,
            height: 36,
            backgroundColor: "#111827",
          }}
        />

        <div
          tw="absolute"
          style={{
            left: 438,
            top: 58,
            color: "#ffffff",
            fontFamily: context.fontFamily,
            fontSize: 64,
            fontWeight: 700,
          }}
        >
          Image Benchmark Suite
        </div>
        <div
          tw="absolute"
          style={{
            left: 438,
            top: 136,
            color: "rgba(255, 255, 255, 0.82)",
            fontFamily: context.fontFamily,
            fontSize: 30,
            fontWeight: 400,
          }}
        >
          buffer | stream | kitchen sink | text layout | format compare
        </div>
        <div
          tw="absolute"
          style={{
            left: 438,
            top: 194,
            color: "#d1e5ff",
            fontFamily: context.fontFamily,
            fontSize: 44,
            fontWeight: 600,
          }}
        >
          PNG / WEBP / SVG
        </div>
        <div
          tw="absolute"
          style={{
            left: 42,
            top: 364,
            color: "#ffffff",
            fontFamily: context.fontFamily,
            fontSize: 28,
            fontWeight: 400,
          }}
        >
          {`samples: ${context.textSamples.length}`}
        </div>
        <div
          tw="absolute"
          style={{
            left: 42,
            top: 404,
            color: "#ffffff",
            fontFamily: context.fontFamily,
            fontSize: 28,
            fontWeight: 400,
          }}
        >
          stream source is in-memory (disk I/O excluded)
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        width: context.width,
        height: context.height,
        position: "relative",
        overflow: "hidden",
        backgroundColor: "#000000",
        color: "#ffffff",
        fontFamily: context.fontFamily,
      }}
    >
      <img
        src={context.dataUris.background}
        width={context.width}
        height={context.height}
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: context.width,
          height: context.height,
          objectFit: "cover",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: context.width,
          height: context.height,
          backgroundImage: overlayGradient,
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 42,
          top: 42,
          width: 220,
          height: 220,
          borderRadius: 28,
          overflow: "hidden",
        }}
      >
        <img src={context.dataUris.avatar} width={220} height={220} style={{ width: 220, height: 220, objectFit: "cover" }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 288,
          top: 64,
          width: 120,
          height: 120,
          borderRadius: 24,
          overflow: "hidden",
        }}
      >
        <img src={context.dataUris.badge} width={120} height={120} style={{ width: 120, height: 120, objectFit: "cover" }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 42,
          top: 288,
          width: context.width - 84,
          height: 54,
          borderRadius: 27,
          backgroundColor: "rgba(31, 41, 55, 0.95)",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: 42,
          top: 288,
          width: progressWidth,
          height: 54,
          borderRadius: 27,
          backgroundColor: "#4f91df",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: context.width - 102,
          top: 60,
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: "#f59e0b",
        }}
      />

      <div
        style={{
          position: "absolute",
          left: context.width - 92,
          top: 70,
          width: 36,
          height: 36,
          borderRadius: 18,
          backgroundColor: "#111827",
        }}
      />

      <div style={{ position: "absolute", left: 438, top: 58, color: "#ffffff", fontSize: 64, fontWeight: 700 }}>
        Image Benchmark Suite
      </div>
      <div style={{ position: "absolute", left: 438, top: 136, color: "rgba(255, 255, 255, 0.82)", fontSize: 30, fontWeight: 400 }}>
        buffer | stream | kitchen sink | text layout | format compare
      </div>
      <div style={{ position: "absolute", left: 438, top: 194, color: "#d1e5ff", fontSize: 44, fontWeight: 600 }}>
        PNG / WEBP / SVG
      </div>
      <div style={{ position: "absolute", left: 42, top: 364, color: "#ffffff", fontSize: 28, fontWeight: 400 }}>
        {`samples: ${context.textSamples.length}`}
      </div>
      <div style={{ position: "absolute", left: 42, top: 404, color: "#ffffff", fontSize: 28, fontWeight: 400 }}>
        stream source is in-memory (disk I/O excluded)
      </div>
    </div>
  );
}

function buildTextLayoutElement(context: BenchContext, variant: TakumiVariant): ReactElement {
  if (variant === "tailwind") {
    return (
      <div tw="flex h-full w-full flex-col gap-2 bg-slate-900 p-10 text-white">
        {context.textSamples.map((sample, index) => (
          <div key={`${index}-${sample}`} tw={index % 2 === 0 ? "text-4xl font-semibold" : "text-2xl font-normal text-slate-200"}>
            {sample}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div
      style={{
        width: context.width,
        height: context.height,
        display: "flex",
        flexDirection: "column",
        gap: 8,
        backgroundColor: "#0f172a",
        color: "#ffffff",
        padding: 40,
        fontFamily: context.fontFamily,
      }}
    >
      {context.textSamples.map((sample, index) => (
        <div
          key={`${index}-${sample}`}
          style={{
            fontSize: index % 2 === 0 ? 40 : 24,
            fontWeight: index % 2 === 0 ? 600 : 400,
            color: index % 2 === 0 ? "#ffffff" : "#e2e8f0",
          }}
        >
          {sample}
        </div>
      ))}
    </div>
  );
}

function sumRunWidths(node: {
  width?: number;
  runs?: Array<{ width: number }>;
  children?: Array<{ width?: number; runs?: Array<{ width: number }>; children?: unknown[] }>;
}): number {
  let total = typeof node.width === "number" ? node.width : 0;

  for (const run of node.runs ?? []) {
    total += run.width;
  }

  for (const child of node.children ?? []) {
    total += sumRunWidths(child as Parameters<typeof sumRunWidths>[0]);
  }

  return total;
}

function createTakumiRenderer(variant: TakumiVariant): BenchRenderer {
  const name = variant === "tailwind" ? "takumi (jsx+tw)" : "takumi (jsx+style)";

  return {
    name,
    prepare: async (context) => {
      await getEngine(context);
    },
    run: async (context, task) => {
      const engine = await getEngine(context);

      if (task === "encode-svg") {
        throw new UnsupportedTaskError(task, "Takumi currently supports png/webp/jpeg/raw, not svg");
      }

      if (task === "text-layout") {
        const element = buildTextLayoutElement(context, variant);
        const node = await fromJsx(element);

        const measured = await engine.measure(node as { type: string }, {
          width: context.width,
          height: context.height,
        });

        return {
          kind: "metric",
          value: sumRunWidths(measured as Parameters<typeof sumRunWidths>[0]),
        };
      }

      if (task === "image-stream") {
        const sourceBuffer = await streamToBuffer(context.createBackgroundStream());
        const element = buildImageElement(context, toDataUri(sourceBuffer), variant);
        const png = await renderElement(engine, element, context, task, "png");
        return { kind: "image", format: "png", bytes: png.length, buffer: png };
      }

      if (task === "image-buffer") {
        const element = buildImageElement(context, context.dataUris.background, variant);
        const png = await renderElement(engine, element, context, task, "png");
        return { kind: "image", format: "png", bytes: png.length, buffer: png };
      }

      const format = task === "encode-webp" ? "webp" : "png";
      const element = buildKitchenSinkElement(context, variant);
      const output = await renderElement(engine, element, context, task, format);

      return {
        kind: "image",
        format,
        bytes: output.length,
        buffer: output,
      };
    },
  };
}

export const takumiStyleBenchRenderer = createTakumiRenderer("style");
export const takumiTailwindBenchRenderer = createTakumiRenderer("tailwind");
