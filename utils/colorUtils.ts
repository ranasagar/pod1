
import { RGB, HSL } from '../types';

export const hexToRgb = (hex: string): RGB => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 0, g: 0, b: 0 };
};

export const rgbToHsl = (r: number, g: number, b: number): HSL => {
  r /= 255; g /= 255; b /= 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h: h * 360, s: s * 100, l: l * 100 };
};

export const hslToRgb = (h: number, s: number, l: number): RGB => {
  h /= 360; s /= 100; l /= 100;
  let r, g, b;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return { r: Math.round(r * 255), g: Math.round(g * 255), b: Math.round(b * 255) };
};

export const getColorDistance = (c1: RGB, c2: RGB): number => {
  return Math.sqrt(
    Math.pow(c1.r - c2.r, 2) +
    Math.pow(c1.g - c2.g, 2) +
    Math.pow(c1.b - c2.b, 2)
  );
};

export const processImage = (
  ctx: CanvasRenderingContext2D,
  originalData: ImageData,
  removeTargets: RGB[],
  removeTolerance: number,
  editTarget: RGB | null,
  editHueShift: number,
  editSatShift: number,
  editTolerance: number
) => {
  const width = originalData.width;
  const height = originalData.height;
  const processed = ctx.createImageData(width, height);
  const data = processed.data;
  const src = originalData.data;

  const hasRemoval = removeTargets.length > 0;
  // Margin in pixels to force check for edge cleanup
  const edgeMargin = 5; 

  for (let i = 0; i < src.length; i += 4) {
    const r = src[i];
    const g = src[i + 1];
    const b = src[i + 2];
    const a = src[i + 3];

    // Default to copy original
    data[i] = r; data[i + 1] = g; data[i + 2] = b; data[i + 3] = a;

    if (a === 0) continue;

    const currentRGB = { r, g, b };
    const x = (i / 4) % width;
    const y = Math.floor((i / 4) / width);

    // 1. Multi-Target Background Removal
    let isRemoved = false;
    for (const target of removeTargets) {
      const dist = getColorDistance(currentRGB, target);
      if (dist <= removeTolerance) {
        data[i + 3] = 0; // Transparent
        isRemoved = true;
        break;
      }
    }

    // 2. Seamless Edge Safety: 
    // If background removal is active, and we are at the literal edge of the canvas,
    // force transparency if it looks even slightly like the background (or just to be safe).
    // This kills the "rectangular box" effect if AI drew to the edge.
    if (!isRemoved && hasRemoval) {
        const isEdge = x < edgeMargin || x > width - edgeMargin || y < edgeMargin || y > height - edgeMargin;
        if (isEdge) {
             // More aggressive tolerance at edges to fade out the box
             for (const target of removeTargets) {
                 if (getColorDistance(currentRGB, target) <= removeTolerance * 1.5) {
                    data[i+3] = 0;
                    isRemoved = true;
                    break;
                 }
             }
             // Hard cut 1px edge to prevent single pixel lines
             if (x === 0 || x === width - 1 || y === 0 || y === height - 1) {
                  data[i+3] = 0;
                  isRemoved = true;
             }
        }
    }

    if (isRemoved) continue;

    // 3. Selective Color Editing
    if (editTarget) {
      if (getColorDistance(currentRGB, editTarget) <= editTolerance) {
        const hsl = rgbToHsl(r, g, b);
        let newH = hsl.h + editHueShift;
        if (newH < 0) newH += 360;
        if (newH > 360) newH -= 360;

        let newS = hsl.s + editSatShift;
        newS = Math.max(0, Math.min(100, newS));

        const newRGB = hslToRgb(newH, newS, hsl.l);
        data[i] = newRGB.r; data[i + 1] = newRGB.g; data[i + 2] = newRGB.b;
      }
    }
  }
  return processed;
};
