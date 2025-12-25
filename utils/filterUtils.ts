import { ImageFilters } from '../types';

export const applyFilters = (
  data: ImageData,
  filters: ImageFilters
): ImageData => {
  const { brightness, contrast, saturation, noise, vintage, posterize, halftone } = filters;
  const w = data.width;
  const h = data.height;
  const dst = new Uint8ClampedArray(data.data);

  // Pre-calculate contrast factor
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  
  // Saturation factor
  const satMult = 1 + (saturation / 100);

  // Helper for Vintage/Sepia
  const vintageFactor = vintage / 100;

  for (let i = 0; i < dst.length; i += 4) {
    let r = dst[i];
    let g = dst[i + 1];
    let b = dst[i + 2];
    const a = dst[i + 3];

    // Optimization: Skip fully transparent pixels
    if (a === 0) continue;

    // 1. Brightness
    r += brightness;
    g += brightness;
    b += brightness;

    // 2. Contrast
    r = contrastFactor * (r - 128) + 128;
    g = contrastFactor * (g - 128) + 128;
    b = contrastFactor * (b - 128) + 128;

    // 3. Saturation (Global)
    if (saturation !== 0) {
      const gray = 0.2989 * r + 0.5870 * g + 0.1140 * b;
      r = -gray * satMult + r * (1 + satMult) + gray; 
      g = -gray * satMult + g * (1 + satMult) + gray;
      b = -gray * satMult + b * (1 + satMult) + gray;
    }

    // 4. Vintage / Sepia Mix
    if (vintage > 0) {
      const tr = (r * 0.393) + (g * 0.769) + (b * 0.189);
      const tg = (r * 0.349) + (g * 0.686) + (b * 0.168);
      const tb = (r * 0.272) + (g * 0.534) + (b * 0.131);
      
      r = r * (1 - vintageFactor) + tr * vintageFactor;
      g = g * (1 - vintageFactor) + tg * vintageFactor;
      b = b * (1 - vintageFactor) + tb * vintageFactor;
    }

    // 5. Posterize (Reduce colors)
    if (posterize > 0) {
        // Levels between 2 and 32 typically
        // Input `posterize` is 0-32. 
        // We invert logic: High value = more posterization (fewer levels)? 
        // Let's say user slider 1-10 mapped to levels 20 down to 2.
        // Actually, let's make `posterize` be the number of levels.
        const levels = Math.max(2, 34 - posterize); 
        const step = 255 / (levels - 1);
        r = Math.round(r / step) * step;
        g = Math.round(g / step) * step;
        b = Math.round(b / step) * step;
    }

    // 6. Noise (Distress Look)
    if (noise > 0) {
      const random = (0.5 - Math.random()) * noise;
      r += random;
      g += random;
      b += random;
    }

    // 7. Halftone (Dot Pattern)
    if (halftone > 0) {
        const x = (i / 4) % w;
        const y = Math.floor((i / 4) / w);
        // Calculate grayscale
        const gray = 0.299 * r + 0.587 * g + 0.114 * b;
        
        // Simple dot pattern
        const size = halftone + 2; // Grid size
        const radius = (size / 2) * (1 - (gray / 255)); // Darker = larger dot
        
        const centerX = Math.floor(x / size) * size + size / 2;
        const centerY = Math.floor(y / size) * size + size / 2;
        
        const dist = Math.sqrt(Math.pow(x - centerX, 2) + Math.pow(y - centerY, 2));
        
        if (dist < radius) {
            // Dot: keep color (or make black?)
            // Usually halftone uses CMYK dots, here we emulate "cutout" style
            // Let's make it simple black/white halftone or just subtractive
            // If inside dot radius, keep color. If outside, make transparent or white?
            // "Vintage print" usually means white paper + ink.
            
            // Let's make it "Screen" style: Dark areas are dots of Ink. Light areas are empty.
            // But we have color. 
            // Effect: Mask alpha based on dot.
            
            // Implementation: Simple "Ordered Dither" look
            // Just thresholding luminance often looks cheap.
            
            // Let's try: Sin wave approach for smoother dots
            const sine = (Math.sin(x * 0.5) + Math.sin(y * 0.5)) * 50;
            // r -= sine; g -= sine; b -= sine; // Just adds texture
            
            // Real dot:
            // if (dist > radius) a = 0; // Holes
            
            // Let's go with "Texture Overlay" approach for 'halftone' param
            // Darkens pixels in a grid
             const cx = x % size;
             const cy = y % size;
             // Center of this cell
             const center = size / 2;
             const d = Math.sqrt((cx - center) ** 2 + (cy - center) ** 2);
             
             // Invert luminance: 0 is black (large dot), 255 is white (small/no dot)
             const threshold = (255 - gray) / 255 * (size / 1.2); 
             
             if (d > threshold) {
                 // Empty space (paper)
                 // r = r + 50; g = g + 50; b = b + 50; // Lighten
             } else {
                 // Ink dot
                 r = r * 0.8; g = g * 0.8; b = b * 0.8; // Darken
             }
        }
    }

    dst[i] = r;
    dst[i + 1] = g;
    dst[i + 2] = b;
    dst[i + 3] = a; // Ensure alpha is kept
  }

  return new ImageData(dst, w, h);
};