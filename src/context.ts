import assert from "node:assert";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import type { BenchContext } from "./types.js";
import { createInMemoryPngStream, toDataUri } from "./utils.js";

const DEFAULT_WIDTH = 1_280;
const DEFAULT_HEIGHT = 720;
const DEFAULT_FONT_FAMILY = "Inter";

export async function createBenchContext(): Promise<BenchContext> {
  const backgroundPath = join(process.cwd(), "fixtures", "background.png");
  const avatarPath = join(process.cwd(), "fixtures", "avatar.png");
  const badgePath = join(process.cwd(), "fixtures", "guild.png");

  const [background, avatar, badge] = await Promise.all([
    readFile(backgroundPath),
    readFile(avatarPath),
    readFile(badgePath),
  ]);

  assert(background.length > 0, "fixtures/background.png is empty");
  assert(avatar.length > 0, "fixtures/avatar.png is empty");
  assert(badge.length > 0, "fixtures/guild.png is empty");

  const regularFont = join(process.cwd(), "assets", "fonts", "Inter-Regular.ttf");
  const semiboldFont = join(process.cwd(), "assets", "fonts", "Inter-SemiBold.ttf");

  return {
    width: DEFAULT_WIDTH,
    height: DEFAULT_HEIGHT,
    fontFamily: DEFAULT_FONT_FAMILY,
    fontPaths: {
      regular: regularFont,
      semibold: semiboldFont,
    },
    buffers: {
      background,
      avatar,
      badge,
    },
    dataUris: {
      background: toDataUri(background),
      avatar: toDataUri(avatar),
      badge: toDataUri(badge),
    },
    textSamples: [
      "benchmark: the quick brown fox jumps over the lazy dog",
      "node image generation libraries",
      "buffer decode + draw + encode",
      "stream decode (disk io excluded)",
      "kitchen sink rendering and compositing",
      "text layout and metrics throughput",
      "0123456789 abcdefghijklmnopqrstuvwxyz",
      "Symbols !@#$%^&*()[]{}<>?/~",
      "Longer sample with mixed CASE and numbers 492178",
      "Short",
      "Spacing    and    punctuation...",
      "Wrapping is intentionally disabled",
    ],
    createBackgroundStream: () => createInMemoryPngStream(background),
    createAvatarStream: () => createInMemoryPngStream(avatar),
  };
}
