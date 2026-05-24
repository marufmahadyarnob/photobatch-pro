import { PhotoPreset } from '../types';

export const PHOTO_PRESETS: PhotoPreset[] = [
  {
    id: 'square-1-1',
    name: 'Square Profile (1:1 Ratio / 600px)',
    width: 600,
    height: 600,
    unit: 'px',
    aspectRatio: 1,
  },
  {
    id: 'us-passport',
    name: 'US Passport / Visa (2" x 2")',
    width: 51,
    height: 51,
    unit: 'mm',
    aspectRatio: 1,
  },
  {
    id: 'schengen-passport',
    name: 'UK / Schengen / Euro (35 x 45 mm)',
    width: 35,
    height: 45,
    unit: 'mm',
    aspectRatio: 35 / 45,
  },
  {
    id: 'id-card',
    name: 'Standard ID Card (85.6 x 54 mm)',
    width: 85.6,
    height: 54,
    unit: 'mm',
    aspectRatio: 85.6 / 54,
  },
  {
    id: 'indian-passport',
    name: 'Indian Passport (35 x 35 mm)',
    width: 35,
    height: 35,
    unit: 'mm',
    aspectRatio: 1,
  },
  {
    id: 'stamp-size',
    name: 'Stamp Size (20 x 25 mm)',
    width: 20,
    height: 25,
    unit: 'mm',
    aspectRatio: 20 / 25,
  },
  {
    id: 'ratio-3-4',
    name: 'Classic Student Card (3:4 Ratio)',
    width: 3,
    height: 4,
    unit: 'ratio',
    aspectRatio: 3 / 4,
  }
];

// Helper to convert mm/inch to pixels for rendering or printing at 300 DPI
export function convertToPixels(value: number, unit: 'px' | 'mm' | 'inch'): number {
  if (unit === 'px') return value;
  if (unit === 'inch') return Math.round(value * 300);
  // mm to inch is value / 25.4, then multiply by 300 DPI
  return Math.round((value / 25.4) * 300);
}

export function formatDimensions(preset: PhotoPreset | { width: number, height: number, unit: string }): string {
  if (preset.unit === 'ratio') {
    return `${preset.width}:${preset.height} Ratio`;
  }
  return `${preset.width}${preset.unit} × ${preset.height}${preset.unit}`;
}
