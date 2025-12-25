
import { ReactNode } from 'react';

export enum AppStep {
  GENERATE = 'GENERATE',
  EDIT = 'EDIT',
  MOCKUP = 'MOCKUP',
  ADMIN = 'ADMIN'
}

export enum EditorTool {
  NONE = 'NONE',
  PICKER_REMOVE = 'PICKER_REMOVE',
  PICKER_EDIT = 'PICKER_EDIT',
  BRUSH_ERASER = 'BRUSH_ERASER', // Removes background
  BRUSH_RESTORE = 'BRUSH_RESTORE', // Restores background (Mask Refine)
  GENERATIVE_FILL = 'GENERATIVE_FILL',
  MASK_BRUSH = 'MASK_BRUSH' // Manual masking
}

export enum PatternType {
  GRID = 'GRID',
  BRICK = 'BRICK',
  HALF_DROP = 'HALF_DROP'
}

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface HSL {
  h: number; // 0-360
  s: number; // 0-100
  l: number; // 0-100
}

export interface TextLayer {
  id: string;
  type: 'text';
  text: string;
  fontFamily: string;
  color: string;
  size: number;
  x: number;
  y: number;
  // Advanced Typography
  strokeColor: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  curvature: number; // -100 to 100 (0 = straight)
  letterSpacing: number;
}

export interface ImageLayer {
  id: string;
  type: 'image';
  url: string;
  x: number;
  y: number;
  scale: number; // Percentage relative to canvas
  rotation: number;
}

export type Layer = TextLayer | ImageLayer;

export interface ImageFilters {
  brightness: number; // -100 to 100
  contrast: number;   // -100 to 100
  saturation: number; // -100 to 100
  noise: number;      // 0 to 100
  vintage: number;    // 0 to 100 (Sepia/Warmth)
  blur: number;       // 0 to 10
  sharpen: number;    // 0 to 100
  posterize: number;  // 0 (off) to 32 (levels)
  halftone: number;   // 0 (off) to 10 (dot size)
}

export interface StickerSettings {
  enabled: boolean;
  color: string;
  width: number;
}

export interface EditorState {
  removeColors: RGB[];
  removeTolerance: number;
  editColor: RGB | null;
  editTolerance: number;
  hueShift: number;
  satShift: number;
  layers: Layer[];
  filters: ImageFilters;
  brushSize: number;
  sticker: StickerSettings;
  // New Print Features
  fabricColor: string; // Hex
  showGuides: boolean;
  printPreset: string; // Key for PRINT_PRESETS
}

export interface PrintPreset {
  name: string;
  width: number; // inches
  height: number; // inches
  dpi: number;
  safeMargin: number; // inches
}

export const PRINT_PRESETS: Record<string, PrintPreset> = {
  'standard': { name: 'Standard Merch (12"x16")', width: 12, height: 16, dpi: 300, safeMargin: 0.5 },
  'large': { name: 'Large Front (14"x18")', width: 14, height: 18, dpi: 300, safeMargin: 0.75 },
  'pocket': { name: 'Pocket Print (4"x4")', width: 4, height: 4, dpi: 300, safeMargin: 0.25 },
  'allover': { name: 'All-Over Print (24"x30")', width: 24, height: 30, dpi: 150, safeMargin: 1.0 }
};

export interface PreFlightResult {
  thinLines: boolean;
  lowContrast: boolean;
  issues: string[];
}

export interface ErrorBoundaryProps {
  children?: ReactNode;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export const FONTS = [
  { name: 'Inter', family: "'Inter', sans-serif" },
  { name: 'Anton', family: "'Anton', sans-serif" },
  { name: 'Oswald', family: "'Oswald', sans-serif" },
  { name: 'Pacifico', family: "'Pacifico', cursive" },
  { name: 'Marker', family: "'Permanent Marker', cursive" },
  { name: 'Lobster', family: "cursive" }, 
  { name: 'Monospace', family: "monospace" }
];

export const DEFAULT_TEXTURES = [
  { name: 'Grunge', url: 'https://images.unsplash.com/photo-1621193677201-657c6b547849?q=80&w=500&auto=format&fit=crop' },
  { name: 'Paper', url: 'https://images.unsplash.com/photo-1577610537482-1698e5473489?q=80&w=500&auto=format&fit=crop' },
  { name: 'Canvas', url: 'https://images.unsplash.com/photo-1550684848-fac1c5b4e853?q=80&w=500&auto=format&fit=crop' },
  { name: 'Noise', url: 'https://images.unsplash.com/photo-1550684847-75bdda21cc95?q=80&w=500&auto=format&fit=crop' }
];
