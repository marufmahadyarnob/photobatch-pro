import { ImageCropSettings, ImageAdjustments, BackgroundSettings } from '../types';

// Helper to convert an image source URL to an HTMLImageElement
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = (err) => reject(new Error('Failed to load image: ' + err));
    img.src = src;
  });
}

/**
 * Smart Face Centroid Finder Heuristic
 * Scans a downsampled copy of the image to spot typical portrait coordinates (skin color boundaries and high-contrast facial structures).
 * Falls back to an elegant Rule-of-Thirds crop if skin detection is inconclusive.
 */
export function detectFace(img: HTMLImageElement): { x: number; y: number; width: number; height: number } {
  const tempCanvas = document.createElement('canvas');
  const size = 120; // Fast scan grid
  tempCanvas.width = size;
  tempCanvas.height = size;
  const ctx = tempCanvas.getContext('2d');
  if (!ctx) {
    // Basic fallback: centered top-middle box
    return { x: 0.25, y: 0.15, width: 0.5, height: 0.5 };
  }

  // Draw the image downsampled
  ctx.drawImage(img, 0, 0, size, size);
  const imgData = ctx.getImageData(0, 0, size, size);
  const data = imgData.data;

  let skinPixelsCount = 0;
  let sumX = 0;
  let sumY = 0;
  
  let minX = size;
  let maxX = 0;
  let minY = size;
  let maxY = 0;

  for (let y = 0; y < size; y++) {
    // We expect student portraits to stand vertically; skip extreme lower chest and extreme top margins
    if (y < size * 0.1 || y > size * 0.85) continue;
    
    for (let x = Math.round(size * 0.1); x < Math.round(size * 0.9); x++) {
      const idx = (y * size + x) * 4;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];

      // Standard Human Skin Color Ranges in RGB Space
      const matchesSkin = r > 85 && g > 45 && b > 25 &&
                          r > g && r > b &&
                          r - g > 12 && Math.abs(g - b) > 6;

      if (matchesSkin) {
        skinPixelsCount++;
        sumX += x;
        sumY += y;
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  // If we found a concentration of skin tones, center around the centroid
  if (skinPixelsCount > 150) {
    const centerX = sumX / skinPixelsCount / size;
    const centerY = sumY / skinPixelsCount / size;
    
    // Passport standards require some breathing room above the head (~20/30% padding)
    // We frame a square box representing the ideal face focus area
    const width = Math.min(0.55, Math.max(0.35, (maxX - minX) / size * 1.5));
    const height = width; // Keep square framing

    // Center the crop target around the detected centroid with a slight vertical boost (to keep chin in play)
    const x = Math.max(0.1, Math.min(0.9 - width, centerX - width / 2));
    const y = Math.max(0.05, Math.min(0.85 - height, centerY - height * 0.42));

    return { x, y, width, height };
  }

  // Smart fallback: Default center passport crop centered around upper mid 
  // typical vertical face placement in standard student portraits
  return {
    x: 0.25, // Center horizontals 50%
    y: 0.12, // Frame slightly down from the top edge
    width: 0.5,
    height: 0.5
  };
}

/**
 * Smart Backdrop Color Sampling
 * Samples the outer boundaries of the picture (corners) to recognize the backdrop hue.
 * This color is then used for alpha segmentation & replacement.
 */
function sampleBackdropColor(ctx: CanvasRenderingContext2D, width: number, height: number): { r: number; g: number; b: number } {
  const samples = [
    ctx.getImageData(5, 5, 1, 1).data,
    ctx.getImageData(width - 5, 5, 1, 1).data,
    ctx.getImageData(width / 2, 5, 1, 1).data, // top center
    ctx.getImageData(5, height / 2, 1, 1).data, // left middle
    ctx.getImageData(width - 5, height / 2, 1, 1).data, // right middle
  ];

  let rSum = 0, gSum = 0, bSum = 0;
  samples.forEach(s => {
    rSum += s[0];
    gSum += s[1];
    bSum += s[2];
  });

  return {
    r: Math.round(rSum / samples.length),
    g: Math.round(gSum / samples.length),
    b: Math.round(bSum / samples.length),
  };
}

/**
 * Executes high-fidelity pixel filters and transforms standard passport cropping.
 * Applied client-side via a high-performance 2D Canvas context.
 */
export async function applyImageProcesses(
  imageSrc: string,
  crop: ImageCropSettings,
  adjustments: ImageAdjustments,
  background: BackgroundSettings,
  outputWidth: number,
  outputHeight: number,
  lockAspectRatio: boolean = true
): Promise<string> {
  const img = await loadImage(imageSrc);

  // Design standard resolution offscreen canvas
  const canvas = document.createElement('canvas');
  canvas.width = outputWidth;
  canvas.height = outputHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return imageSrc;
  }

  // 1. Draw solid backdrop replacement first if requested
  if (background.mode !== 'original') {
    ctx.fillStyle = background.mode === 'white' ? '#FFFFFF' 
                  : background.mode === 'blue' ? '#0F62FE' // Standard official deep passport blue
                  : background.customColor || '#FFFFFF';
    ctx.fillRect(0, 0, outputWidth, outputHeight);
  }

  // 2. Setup a separate off-screen buffer to perform subject foreground separation
  const fgCanvas = document.createElement('canvas');
  fgCanvas.width = outputWidth;
  fgCanvas.height = outputHeight;
  const fgCtx = fgCanvas.getContext('2d');
  if (!fgCtx) {
    return imageSrc;
  }

  // Clear foreground
  fgCtx.clearRect(0, 0, outputWidth, outputHeight);

  // Apply matrix transformations (Rotate, flip, zoom, drag coordinates)
  fgCtx.save();
  fgCtx.translate(outputWidth / 2, outputHeight / 2);
  fgCtx.rotate((crop.rotation * Math.PI) / 180);
  fgCtx.scale(crop.flipH ? -1 : 1, crop.flipV ? -1 : 1);

  // Scale calculations
  // crop.x / crop.y denote the center-point or top-left corners of original framing
  const srcW = img.width * crop.width;
  const srcH = img.height * crop.height;
  
  // Calculate rendering scale factor to map source crop box to destination output box
  // Zoom boosts scale
  const scaleX = outputWidth / srcW * crop.zoom;
  const scaleY = outputHeight / srcH * crop.zoom;
  const scale = lockAspectRatio ? Math.min(scaleX, scaleY) : Math.max(scaleX, scaleY);

  // Draw face centered on source coordinates
  const drawW = img.width * scale;
  const drawH = img.height * scale;

  // Let's position it offsetting from our manual or auto center points
  const centerX = (crop.x + crop.width / 2) * img.width;
  const centerY = (crop.y + crop.height / 2) * img.height;

  fgCtx.drawImage(
    img,
    -centerX * scale,
    -centerY * scale,
    drawW,
    drawH
  );
  fgCtx.restore();

  // 3. Perform image adjustments & filters (Brightness, Contrast, Saturation, Skin Smoothing)
  const fgImgData = fgCtx.getImageData(0, 0, outputWidth, outputHeight);
  const fgData = fgImgData.data;

  // Backdrop substitution logic:
  let dominantColor = { r: 240, g: 240, b: 240 };
  if (background.mode !== 'original') {
    dominantColor = sampleBackdropColor(fgCtx, outputWidth, outputHeight);
  }

  // Apply pixel processors
  const brightness = adjustments.brightness; // -100 to 100
  const contrast = adjustments.contrast;     // -100 to 100
  const saturation = adjustments.saturation; // -100 to 100
  const skinSmooth = adjustments.skinSmooth; // 0 to 100

  // Calculate contrast scale factor
  const contrastFactor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  const smoothRadius = skinSmooth > 0 ? Math.max(1, Math.round(skinSmooth * 0.08)) : 0;

  for (let i = 0; i < fgData.length; i += 4) {
    let r = fgData[i];
    let g = fgData[i + 1];
    let b = fgData[i + 2];
    let a = fgData[i + 3];

    // Skip fully transparent pixels
    if (a === 0) continue;

    // A. Background chroma isolation:
    if (background.mode !== 'original') {
      // Calculate color distance (DeltaE approximation in RGB)
      const diffR = r - dominantColor.r;
      const diffG = g - dominantColor.g;
      const diffB = b - dominantColor.b;
      // High tolerance for blue walls / white school hallways
      const distance = Math.sqrt(diffR * diffR + diffG * diffG + diffB * diffB);

      // Gradient boundary alpha thresholding (chroma segmenting with feathering)
      const tolerance = 70 + (background.edgeSmooth * 1.5);
      const featherWidth = 35 + (background.edgeSmooth * 0.8);

      if (distance < tolerance) {
        a = 0; // Wipe background out entirely
      } else if (distance < tolerance + featherWidth) {
        // Linear blending near cut margins
        const ratio = (distance - tolerance) / featherWidth;
        a = Math.round(ratio * 255);
      }
    }

    if (a > 0) {
      // B. Brightness & Contrast adjusting
      r = Math.min(255, Math.max(0, (r - 128) * contrastFactor + 128 + brightness));
      g = Math.min(255, Math.max(0, (g - 128) * contrastFactor + 128 + brightness));
      b = Math.min(255, Math.max(0, (b - 128) * contrastFactor + 128 + brightness));

      // C. Saturation adjusting
      if (saturation !== 0) {
        const gray = 0.2989 * r + 0.587 * g + 0.114 * b;
        const satRatio = 1 + saturation / 100;
        r = Math.min(255, Math.max(0, gray + (r - gray) * satRatio));
        g = Math.min(255, Math.max(0, gray + (g - gray) * satRatio));
        b = Math.min(255, Math.max(0, gray + (b - gray) * satRatio));
      }
    }

    fgData[i] = r;
    fgData[i + 1] = g;
    fgData[i + 2] = b;
    fgData[i + 3] = a;
  }

  // Put modified data back
  fgCtx.putImageData(fgImgData, 0, 0);

  // D. Skin Beautify / Surface smoothing:
  // Using canvas composite overlay layering to emulate sub-surface smoothing efficiently.
  // Blending a blurred, low-pass skin blend back onto the high contrast facial boundaries
  if (smoothRadius > 0) {
    const blurCanvas = document.createElement('canvas');
    blurCanvas.width = outputWidth;
    blurCanvas.height = outputHeight;
    const blurCtx = blurCanvas.getContext('2d');
    if (blurCtx) {
      blurCtx.filter = `blur(${smoothRadius}px)`;
      blurCtx.drawImage(fgCanvas, 0, 0);

      // Create overlay that fades the high frequencies
      fgCtx.save();
      // Only blend skin smooth on ~35% transparency to retain features (eyes, nose, hair margins)
      fgCtx.globalAlpha = Math.min(0.65, smoothRadius / 10);
      fgCtx.globalCompositeOperation = 'source-atop';
      // High-frequency skin blur blend
      fgCtx.drawImage(blurCanvas, 0, 0);
      fgCtx.restore();
    }
  }

  // 4. Combine Cutout and background replacements
  // Optionally render a beautiful soft depth drop-shadow underneath the student
  if (background.mode !== 'original' && background.softShadow) {
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.22)';
    ctx.shadowBlur = Math.round(outputWidth * 0.04);
    ctx.shadowOffsetX = 0;
    ctx.shadowOffsetY = Math.round(outputHeight * 0.02);
    ctx.drawImage(fgCanvas, 0, 0);
    ctx.restore();
  } else {
    ctx.drawImage(fgCanvas, 0, 0);
  }

  // Return base64 URL of the polished school portrait
  return canvas.toDataURL('image/jpeg', 0.95);
}
