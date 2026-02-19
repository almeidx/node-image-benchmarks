import type { BenchContext } from "./types.js";

interface Canvas2DLike {
  fillStyle: unknown;
  strokeStyle: unknown;
  lineWidth: number;
  font: string;
  textBaseline: "top" | "alphabetic";
  beginPath: () => void;
  closePath: () => void;
  clip: () => void;
  save: () => void;
  restore: () => void;
  moveTo: (x: number, y: number) => void;
  lineTo: (x: number, y: number) => void;
  quadraticCurveTo: (cpx: number, cpy: number, x: number, y: number) => void;
  fillRect: (x: number, y: number, width: number, height: number) => void;
  fill: () => void;
  stroke: () => void;
  drawImage: (...args: unknown[]) => void;
  arc: (x: number, y: number, radius: number, startAngle: number, endAngle: number) => void;
  createLinearGradient: (x0: number, y0: number, x1: number, y1: number) => {
    addColorStop: (offset: number, color: string) => void;
  };
  fillText: (text: string, x: number, y: number, maxWidth?: number) => void;
  measureText: (text: string) => { width: number };
}

export function drawRoundedRect(
  ctx: Canvas2DLike,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
): void {
  const boundedRadius = Math.min(radius, width / 2, height / 2);
  const right = x + width;
  const bottom = y + height;

  ctx.moveTo(x + boundedRadius, y);
  ctx.lineTo(right - boundedRadius, y);
  ctx.quadraticCurveTo(right, y, right, y + boundedRadius);
  ctx.lineTo(right, bottom - boundedRadius);
  ctx.quadraticCurveTo(right, bottom, right - boundedRadius, bottom);
  ctx.lineTo(x + boundedRadius, bottom);
  ctx.quadraticCurveTo(x, bottom, x, bottom - boundedRadius);
  ctx.lineTo(x, y + boundedRadius);
  ctx.quadraticCurveTo(x, y, x + boundedRadius, y);
}

export function drawCoverImage(
  ctx: Canvas2DLike,
  canvas: { width: number; height: number },
  image: { width: number; height: number },
): void {
  const imageRatio = image.width / image.height;
  const canvasRatio = canvas.width / canvas.height;

  if (imageRatio > canvasRatio) {
    const drawWidth = canvas.height * imageRatio;
    const drawX = (canvas.width - drawWidth) / 2;
    ctx.drawImage(image, drawX, 0, drawWidth, canvas.height);
  } else {
    const drawHeight = canvas.width / imageRatio;
    const drawY = (canvas.height - drawHeight) / 2;
    ctx.drawImage(image, 0, drawY, canvas.width, drawHeight);
  }
}

export function drawKitchenSink(
  ctx: Canvas2DLike,
  canvas: { width: number; height: number },
  images: {
    background: { width: number; height: number };
    avatar: unknown;
    badge: unknown;
  },
  context: BenchContext,
): void {
  drawCoverImage(ctx, canvas, images.background);

  const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  gradient.addColorStop(0, "rgba(10, 18, 32, 0.65)");
  gradient.addColorStop(0.5, "rgba(24, 42, 64, 0.25)");
  gradient.addColorStop(1, "rgba(8, 12, 20, 0.8)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, 42, 42, 220, 220, 28);
  ctx.clip();
  ctx.drawImage(images.avatar, 42, 42, 220, 220);
  ctx.restore();

  ctx.save();
  ctx.beginPath();
  drawRoundedRect(ctx, 288, 64, 120, 120, 24);
  ctx.clip();
  ctx.drawImage(images.badge, 288, 64, 120, 120);
  ctx.restore();

  ctx.beginPath();
  drawRoundedRect(ctx, 42, 288, canvas.width - 84, 54, 27);
  ctx.fillStyle = "rgba(31, 41, 55, 0.95)";
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  drawRoundedRect(ctx, 42, 288, Math.round((canvas.width - 84) * 0.67), 54, 27);
  ctx.fillStyle = "#4f91df";
  ctx.fill();
  ctx.closePath();

  ctx.beginPath();
  ctx.arc(canvas.width - 74, 88, 28, 0, Math.PI * 2);
  ctx.fillStyle = "#f59e0b";
  ctx.fill();

  ctx.beginPath();
  ctx.arc(canvas.width - 74, 88, 18, 0, Math.PI * 2);
  ctx.fillStyle = "#111827";
  ctx.fill();

  ctx.font = `700 64px \"${context.fontFamily}\"`;
  ctx.textBaseline = "top";
  ctx.fillStyle = "#ffffff";
  ctx.fillText("Image Benchmark Suite", 438, 58);

  ctx.font = `400 30px \"${context.fontFamily}\"`;
  ctx.fillStyle = "rgba(255, 255, 255, 0.82)";
  ctx.fillText("buffer | stream | kitchen sink | text layout | format compare", 438, 136);

  ctx.font = `600 44px \"${context.fontFamily}\"`;
  ctx.fillStyle = "#d1e5ff";
  ctx.fillText("PNG / WEBP / SVG", 438, 194);

  ctx.font = `400 28px \"${context.fontFamily}\"`;
  ctx.fillStyle = "#ffffff";
  ctx.fillText(`samples: ${context.textSamples.length}`, 42, 364);

  ctx.fillText("stream source is in-memory (disk I/O excluded)", 42, 404);
}

export function measureTextLayout(ctx: Canvas2DLike, context: BenchContext): number {
  let total = 0;

  ctx.font = `600 40px \"${context.fontFamily}\"`;
  for (const sample of context.textSamples) {
    total += ctx.measureText(sample).width;
  }

  ctx.font = `400 26px \"${context.fontFamily}\"`;
  for (const sample of context.textSamples) {
    total += ctx.measureText(`${sample} :: ${sample.length}`).width;
  }

  return total;
}
