import { readFile } from "node:fs/promises";
import { Resvg } from "@resvg/resvg-js";
import type { ReactElement } from "react";
import satori from "satori";
import type { BenchContext, BenchRenderer, BenchTaskName } from "../types.js";
import { UnsupportedTaskError, streamToBuffer, toDataUri } from "../utils.js";

type SatoriVariant = "style" | "tailwind";

let fontsPromise: Promise<
  {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 600;
  }[]
> | null = null;

function toArrayBuffer(buffer: Buffer): ArrayBuffer {
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength) as ArrayBuffer;
}

function getFonts(context: BenchContext): Promise<
  {
    name: string;
    data: ArrayBuffer;
    style: "normal";
    weight: 400 | 600;
  }[]
> {
  if (!fontsPromise) {
    fontsPromise = Promise.all([readFile(context.fontPaths.regular), readFile(context.fontPaths.semibold)]).then(
      ([regular, semibold]) => [
        {
          name: context.fontFamily,
          data: toArrayBuffer(regular),
          style: "normal" as const,
          weight: 400 as const,
        },
        {
          name: context.fontFamily,
          data: toArrayBuffer(semibold),
          style: "normal" as const,
          weight: 600 as const,
        },
      ],
    );
  }

  return fontsPromise;
}

async function renderToSvg(context: BenchContext, element: ReactElement): Promise<string> {
  return satori(element, {
    width: context.width,
    height: context.height,
    fonts: await getFonts(context),
    tailwindConfig: {
      theme: {
        extend: {},
      },
    },
  });
}

function svgToPng(svg: string): Buffer {
  return Buffer.from(new Resvg(svg).render().asPng());
}

function buildImageElement(context: BenchContext, source: string, variant: SatoriVariant): ReactElement {
  if (variant === "tailwind") {
    return (
      <div
        tw="relative flex overflow-hidden"
        style={{
          width: context.width,
          height: context.height,
          backgroundColor: "#0f172a",
        }}
      >
        <img
          src={source}
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
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#0f172a",
      }}
    >
      <img
        src={source}
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

function buildKitchenSinkElement(context: BenchContext, variant: SatoriVariant): ReactElement {
  const progressWidth = Math.round((context.width - 84) * 0.67);
  const overlayGradient = "linear-gradient(135deg, rgba(10, 18, 32, 0.65) 0%, rgba(24, 42, 64, 0.25) 50%, rgba(8, 12, 20, 0.8) 100%)";

  if (variant === "tailwind") {
    return (
      <div
        tw="relative flex overflow-hidden text-white"
        style={{
          width: context.width,
          height: context.height,
          backgroundColor: "#000000",
        }}
      >
        <img
          src={context.dataUris.background}
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
          tw="absolute flex overflow-hidden"
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
          tw="absolute flex overflow-hidden"
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
          tw="absolute flex"
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
          tw="absolute flex"
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
          tw="absolute flex"
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
          tw="absolute flex"
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
          tw="absolute flex"
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
        display: "flex",
        overflow: "hidden",
        backgroundColor: "#000000",
        color: "#ffffff",
        fontFamily: context.fontFamily,
      }}
    >
      <img
        src={context.dataUris.background}
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
          display: "flex",
          overflow: "hidden",
        }}
      >
        <img src={context.dataUris.avatar} style={{ width: 220, height: 220, objectFit: "cover" }} />
      </div>

      <div
        style={{
          position: "absolute",
          left: 288,
          top: 64,
          width: 120,
          height: 120,
          borderRadius: 24,
          display: "flex",
          overflow: "hidden",
        }}
      >
        <img src={context.dataUris.badge} style={{ width: 120, height: 120, objectFit: "cover" }} />
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

      <div style={{ position: "absolute", left: 438, top: 58, display: "flex", color: "#ffffff", fontSize: 64, fontWeight: 700 }}>
        Image Benchmark Suite
      </div>
      <div style={{ position: "absolute", left: 438, top: 136, display: "flex", color: "rgba(255, 255, 255, 0.82)", fontSize: 30, fontWeight: 400 }}>
        buffer | stream | kitchen sink | text layout | format compare
      </div>
      <div style={{ position: "absolute", left: 438, top: 194, display: "flex", color: "#d1e5ff", fontSize: 44, fontWeight: 600 }}>
        PNG / WEBP / SVG
      </div>
      <div style={{ position: "absolute", left: 42, top: 364, display: "flex", color: "#ffffff", fontSize: 28, fontWeight: 400 }}>
        {`samples: ${context.textSamples.length}`}
      </div>
      <div style={{ position: "absolute", left: 42, top: 404, display: "flex", color: "#ffffff", fontSize: 28, fontWeight: 400 }}>
        stream source is in-memory (disk I/O excluded)
      </div>
    </div>
  );
}

function buildTextLayoutElement(context: BenchContext, variant: SatoriVariant): ReactElement {
  if (variant === "tailwind") {
    return (
      <div tw="flex h-full w-full flex-col bg-slate-900 p-10 text-white">
        {context.textSamples.map((sample, index) => (
          <div
            key={`${index}-${sample}`}
            tw={index % 2 === 0 ? "text-4xl font-semibold" : "mt-2 text-2xl font-normal text-slate-200"}
          >
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

function createSatoriRenderer(variant: SatoriVariant): BenchRenderer {
  const name = variant === "tailwind" ? "satori (jsx+tw)" : "satori (jsx+style)";

  return {
    name,
    prepare: async (context) => {
      await getFonts(context);
    },
    run: async (context, task: BenchTaskName) => {
      if (task === "encode-webp") {
        throw new UnsupportedTaskError(task, "Satori outputs SVG directly; WebP requires an additional encoder");
      }

      if (task === "image-stream") {
        const sourceBuffer = await streamToBuffer(context.createBackgroundStream());
        const svg = await renderToSvg(context, buildImageElement(context, toDataUri(sourceBuffer), variant));
        const png = svgToPng(svg);
        return { kind: "image", format: "png", bytes: png.length, buffer: png };
      }

      if (task === "image-buffer") {
        const svg = await renderToSvg(context, buildImageElement(context, context.dataUris.background, variant));
        const png = svgToPng(svg);
        return { kind: "image", format: "png", bytes: png.length, buffer: png };
      }

      if (task === "text-layout") {
        const svg = await renderToSvg(context, buildTextLayoutElement(context, variant));
        return {
          kind: "metric",
          value: svg.length,
        };
      }

      const svg = await renderToSvg(context, buildKitchenSinkElement(context, variant));

      if (task === "encode-svg") {
        const svgBuffer = Buffer.from(svg);
        return {
          kind: "image",
          format: "svg",
          bytes: svgBuffer.length,
          buffer: svgBuffer,
        };
      }

      const png = svgToPng(svg);

      return {
        kind: "image",
        format: "png",
        bytes: png.length,
        buffer: png,
      };
    },
  };
}

export const satoriStyleBenchRenderer = createSatoriRenderer("style");
export const satoriTailwindBenchRenderer = createSatoriRenderer("tailwind");
