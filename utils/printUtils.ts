
import { PreFlightResult, RGB } from '../types';
import { hexToRgb, getColorDistance } from './colorUtils';

export const analyzePrintQuality = (
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  fabricHex: string
): PreFlightResult => {
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;
  const fabricRgb = hexToRgb(fabricHex);
  const issues: string[] = [];
  let thinLineCount = 0;
  let lowContrastCount = 0;
  
  // 1. Thin Line Detection (Simple Kernel)
  // We skip pixels to keep performance high
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const idx = (y * width + x) * 4;
      const alpha = data[idx + 3];

      if (alpha > 50) { // Only check opaque pixels
        // Check immediate neighbors for alpha drop-off
        // If a pixel is surrounded by transparent pixels on opposite sides (narrow), it's a thin line.
        const left = data[idx - 4 + 3];
        const right = data[idx + 4 + 3];
        const top = data[idx - (width * 4) + 3];
        const bottom = data[idx + (width * 4) + 3];

        // Horizontal thin line check
        if (top < 50 && bottom < 50) thinLineCount++;
        // Vertical thin line check
        if (left < 50 && right < 50) thinLineCount++;

        // 2. Contrast Check against Fabric
        const pixelRgb = { r: data[idx], g: data[idx+1], b: data[idx+2] };
        const dist = getColorDistance(pixelRgb, fabricRgb);
        // Distance threshold for "bad visibility" on fabric
        if (dist < 40) lowContrastCount++;
      }
    }
  }

  if (thinLineCount > (width * height * 0.001)) {
    issues.push("Detected thin lines that may break during screen printing or peeling.");
  }

  if (lowContrastCount > (width * height * 0.05)) {
    issues.push(`Low contrast detected against ${fabricHex} fabric. Design may blend in.`);
  }

  return {
    thinLines: thinLineCount > (width * height * 0.001),
    lowContrast: lowContrastCount > (width * height * 0.05),
    issues
  };
};

export const autoOptimizeContrast = (
  ctx: CanvasRenderingContext2D, 
  fabricHex: string
) => {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;
  const imgData = ctx.getImageData(0, 0, w, h);
  const data = imgData.data;
  const fabric = hexToRgb(fabricHex);
  const fabricLum = 0.299 * fabric.r + 0.587 * fabric.g + 0.114 * fabric.b;
  const isDarkFabric = fabricLum < 128;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 10) continue;

    const r = data[i];
    const g = data[i+1];
    const b = data[i+2];
    
    const dist = getColorDistance({r,g,b}, fabric);
    if (dist < 60) {
      // Color is too close to fabric. Shift it.
      if (isDarkFabric) {
        // Lighten
        data[i] = Math.min(255, r + 50);
        data[i+1] = Math.min(255, g + 50);
        data[i+2] = Math.min(255, b + 50);
      } else {
        // Darken
        data[i] = Math.max(0, r - 50);
        data[i+1] = Math.max(0, g - 50);
        data[i+2] = Math.max(0, b - 50);
      }
    }
  }
  ctx.putImageData(imgData, 0, 0);
};

export const getSpotColors = (ctx: CanvasRenderingContext2D, maxColors: number = 8): string[] => {
    // Very simplified quantization for UI display
    const w = ctx.canvas.width;
    const h = ctx.canvas.height;
    const data = ctx.getImageData(0,0,w,h).data;
    const colorCounts: Record<string, number> = {};

    for(let i=0; i<data.length; i+=40) { // Sample sparsely
        if(data[i+3] < 128) continue;
        // Quantize to reduce noise (round to nearest 32)
        const r = Math.round(data[i] / 32) * 32;
        const g = Math.round(data[i+1] / 32) * 32;
        const b = Math.round(data[i+2] / 32) * 32;
        const key = `rgb(${r},${g},${b})`;
        colorCounts[key] = (colorCounts[key] || 0) + 1;
    }

    return Object.entries(colorCounts)
        .sort(([,a], [,b]) => b - a)
        .slice(0, maxColors)
        .map(([k]) => k);
};
