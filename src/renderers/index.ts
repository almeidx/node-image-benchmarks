import { napiCanvasBenchRenderer } from "./napiCanvas.js";
import { nodeCanvasBenchRenderer } from "./nodeCanvas.js";
import { skiaCanvasBenchRenderer } from "./skiaCanvas.js";
import { satoriStyleBenchRenderer, satoriTailwindBenchRenderer } from "./satori.js";
import { takumiStyleBenchRenderer, takumiTailwindBenchRenderer } from "./takumi.js";

export const benchRenderers = [
  napiCanvasBenchRenderer,
  nodeCanvasBenchRenderer,
  skiaCanvasBenchRenderer,
  takumiStyleBenchRenderer,
  takumiTailwindBenchRenderer,
  satoriStyleBenchRenderer,
  satoriTailwindBenchRenderer,
] as const;
