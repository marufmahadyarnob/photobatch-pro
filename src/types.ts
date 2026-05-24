export interface ImageCropSettings {
  x: number; // percentage based or coordinate
  y: number;
  width: number;
  height: number;
  zoom: number;
  rotation: number; // 0, 90, 180, 270 or arbitrary
  flipH: boolean;
  flipV: boolean;
}

export interface ImageAdjustments {
  brightness: number;  // -100 to 100
  contrast: number;    // -100 to 100
  skinSmooth: number;  // 0 to 100 (blur/bilateral-like glow filter)
  saturation: number;  // -100 to 100
}

export interface BackgroundSettings {
  mode: 'original' | 'transparent' | 'white' | 'blue' | 'custom';
  customColor?: string;
  edgeSmooth: number;  // 0 to 20 px
  softShadow: boolean;
}

export interface StudentPhoto {
  id: string;
  originalName: string;
  name: string;        // Renamed target files
  originalUrl: string; // Blob URL
  processedUrl: string; // Blob URL of final visual representation
  width: number;
  height: number;
  crop: ImageCropSettings;
  adjustments: ImageAdjustments;
  background: BackgroundSettings;
  isLockedAspectRatio: boolean;
  faceRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  status: 'idle' | 'processing' | 'done' | 'error';
  progress: number;
  errorMsg?: string;
  history: Array<{
    crop: ImageCropSettings;
    adjustments: ImageAdjustments;
    background: BackgroundSettings;
  }>;
  historyIndex: number;
}

export interface PhotoPreset {
  id: string;
  name: string;
  width: number;
  height: number;
  unit: 'px' | 'mm' | 'inch' | 'ratio';
  aspectRatio: number; // width / height
}

export interface BatchSettings {
  brightness: number;
  contrast: number;
  skinSmooth: number;
  saturation: number;
  backgroundMode: 'original' | 'transparent' | 'white' | 'blue' | 'custom';
  customBackgroundColor: string;
  edgeSmooth: number;
  softShadow: boolean;
  presetId: string;
  customWidth: number;
  customHeight: number;
  customUnit: 'px' | 'mm' | 'inch' | 'ratio';
}

export interface AutoNamingSettings {
  prefix: string;
  suffix: string;
  startNumber: number;
  padding: number; // e.g. 2 -> 01, 3 -> 001
  separator: string;
}

export interface PrintLayoutSettings {
  pageSize: 'A4' | 'Letter';
  orientation: 'portrait' | 'landscape';
  photoPresetId: string;
  columns: number;
  rows: number;
  spacing: number; // mm
  showBorder: boolean;
  showCutLines: boolean;
}
