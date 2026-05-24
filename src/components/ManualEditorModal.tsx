import React, { useState, useEffect, useRef } from 'react';
import { X, ZoomIn, RotateCw, RefreshCw, FlipHorizontal, FlipVertical, Sparkles, Move } from 'lucide-react';
import { StudentPhoto } from '../types';
import { detectFace } from '../utils/imageProcessor';
import { motion } from 'motion/react';

interface ManualEditorModalProps {
  photo: StudentPhoto;
  onSave: (photoId: string, updatedSettings: {
    crop: StudentPhoto['crop'];
    status: 'idle' | 'processing' | 'done' | 'error';
  }) => void;
  onClose: () => void;
}

export default function ManualEditorModal({ photo, onSave, onClose }: ManualEditorModalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // States
  const [zoom, setZoom] = useState(photo.crop.zoom);
  const [rotation, setRotation] = useState(photo.crop.rotation);
  const [flipH, setFlipH] = useState(photo.crop.flipH);
  const [flipV, setFlipV] = useState(photo.crop.flipV);

  // Crop frame dimensions (expressed as percentage of image width/height)
  const [cropX, setCropX] = useState(photo.crop.x);
  const [cropY, setCropY] = useState(photo.crop.y);
  const [cropW, setCropW] = useState(photo.crop.width);
  const [cropH, setCropH] = useState(photo.crop.height);

  // Interactive drag trackers
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 'e' | 's' | 'w'>('move');
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialCrop, setInitialCrop] = useState({ x: 0, y: 0, w: 0, h: 0 });

  // Reset values
  const resetToAutoFace = () => {
    if (imgRef.current) {
      const detected = detectFace(imgRef.current);
      setCropX(detected.x);
      setCropY(detected.y);
      setCropW(detected.width);
      setCropH(detected.height);
      setZoom(1.0);
      setRotation(0);
      setFlipH(false);
      setFlipV(false);
    }
  };

  const handleResetToDefault = () => {
    setCropX(0.15);
    setCropY(0.15);
    setCropW(0.7);
    setCropH(0.7);
    setZoom(1.0);
    setRotation(0);
    setFlipH(false);
    setFlipV(false);
  };

  // Convert client cursor coords to container relative values
  const getContainerEventCoords = (e: MouseEvent | TouchEvent) => {
    if (!containerRef.current) return { x: 0, y: 0 };
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: clientX - rect.left,
      y: clientY - rect.top,
      width: rect.width,
      height: rect.height,
    };
  };

  const handleStartDrag = (mode: typeof dragMode, e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    setDragMode(mode);
    setDragStart({ x: clientX, y: clientY });
    setInitialCrop({ x: cropX, y: cropY, w: cropW, h: cropH });
  };

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging || !containerRef.current) return;
      
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const rect = containerRef.current.getBoundingClientRect();

      // Horizontal and vertical distance in percentages
      const dx = (clientX - dragStart.x) / rect.width;
      const dy = (clientY - dragStart.y) / rect.height;

      if (dragMode === 'move') {
        // Shifting the whole frame
        setCropX(Math.max(0, Math.min(1 - initialCrop.w, initialCrop.x + dx)));
        setCropY(Math.max(0, Math.min(1 - initialCrop.h, initialCrop.y + dy)));
      } else {
        // Resizing handles (8 directions)
        let nX = initialCrop.x;
        let nY = initialCrop.y;
        let nW = initialCrop.w;
        let nH = initialCrop.h;

        const minSize = 0.15; // Minimum 15% crop size

        if (dragMode.includes('w')) {
          const maxDx = initialCrop.x + initialCrop.w - minSize;
          const allowedDx = Math.min(maxDx, dx);
          nX = initialCrop.x + allowedDx;
          nW = initialCrop.w - allowedDx;
        } else if (dragMode.includes('e')) {
          const maxDw = 1 - initialCrop.x - initialCrop.w;
          const allowedDw = Math.min(maxDw, dx);
          nW = Math.max(minSize, initialCrop.w + allowedDw);
        }

        if (dragMode.includes('n')) {
          const maxDy = initialCrop.y + initialCrop.h - minSize;
          const allowedDy = Math.min(maxDy, dy);
          nY = initialCrop.y + allowedDy;
          nH = initialCrop.h - allowedDy;
        } else if (dragMode.includes('s')) {
          const maxDh = 1 - initialCrop.y - initialCrop.h;
          const allowedDh = Math.min(maxDh, dy);
          nH = Math.max(minSize, initialCrop.h + allowedDh);
        }

        // To support passport criteria we maintain a square aspect-ratio inside the manual dialog
        // making the handles feel unified!
        if (photo.isLockedAspectRatio) {
          const size = Math.max(nW, nH);
          nW = Math.min(size, 1 - nX);
          nH = Math.min(size, 1 - nY);
        }

        setCropX(nX);
        setCropY(nY);
        setCropW(nW);
        setCropH(nH);
      }
    };

    const handleEndDrag = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleEndDrag);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleEndDrag);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleEndDrag);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleEndDrag);
    };
  }, [isDragging, dragMode, dragStart, initialCrop, photo.isLockedAspectRatio]);

  const handleSave = () => {
    onSave(photo.id, {
      crop: {
        x: cropX,
        y: cropY,
        width: cropW,
        height: cropH,
        zoom,
        rotation,
        flipH,
        flipV,
      },
      status: 'idle', // Re-trigger canvas compilation
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 md:p-6 bg-slate-950/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-3xl glass-panel text-white rounded-2xl overflow-hidden border border-slate-800 flex flex-col max-h-[96vh]"
      >
        {/* Header UI */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800/85">
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-indigo-400 bg-indigo-900/40 px-2 py-0.5 rounded">
              Manual Custom Layout
            </span>
            <h3 className="font-display font-semibold text-base text-slate-100 flex items-center gap-1.5 mt-1">
              Refining Crop &bull; {photo.name}
            </h3>
          </div>
          <button
            id="modal-close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg bg-slate-900/60 text-slate-400 hover:text-white border border-slate-800 hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Framing Canvas Port */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6 flex flex-col md:flex-row gap-6 items-center justify-center">
          
          {/* Left: Viewfinder frame container */}
          <div className="relative flex flex-col items-center">
            <span className="text-[10px] text-slate-400 mb-2 flex items-center gap-1">
              <Move className="h-3 w-3" /> Drag margins or corners to resize crop window.
            </span>
            
            <div 
              ref={containerRef}
              className="relative w-[280px] h-[280px] md:w-[360px] md:h-[360px] bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-800 select-none cursor-crosshair"
            >
              {/* Image base layer */}
              <img
                ref={imgRef}
                src={photo.originalUrl}
                alt="Framing target"
                className="w-full h-full object-contain pointer-events-none"
                style={{
                  transform: `rotate(${rotation}deg) scaleX(${flipH ? -1 : 1}) scaleY(${flipV ? -1 : 1})`,
                  filter: 'brightness(1)',
                }}
              />

              {/* Shadow overlay cover (for non-cropped viewport) */}
              <div className="absolute inset-0 pointer-events-none">
                <svg className="w-full h-full">
                  <defs>
                    <mask id="cropMask">
                      <rect width="100%" height="100%" fill="white" />
                      <rect 
                        x={`${cropX * 100}%`} 
                        y={`${cropY * 100}%`} 
                        width={`${cropW * 100}%`} 
                        height={`${cropH * 100}%`} 
                        fill="black" 
                      />
                    </mask>
                  </defs>
                  <rect width="100%" height="100%" fill="rgba(8, 10, 18, 0.72)" mask="url(#cropMask)" />
                </svg>
              </div>

              {/* Custom Crop Frame overlay: dashed outline, handles, central plus */}
              <div
                style={{
                  position: 'absolute',
                  left: `${cropX * 100}%`,
                  top: `${cropY * 100}%`,
                  width: `${cropW * 100}%`,
                  height: `${cropH * 100}%`,
                }}
                className="border-2 border-white cursor-move pointer-events-auto"
                onMouseDown={(e) => handleStartDrag('move', e)}
                onTouchStart={(e) => handleStartDrag('move', e)}
              >
                {/* 3x3 Dashed lines grids */}
                <div className="absolute inset-0 grid grid-cols-3 grid-rows-3 pointer-events-none">
                  {/* Row lines */}
                  <div className="border-b border-dashed border-white/40 col-span-3 row-span-1" />
                  <div className="border-b border-dashed border-white/40 col-span-3 row-span-1" />
                  {/* Col lines */}
                  <div className="border-r border-dashed border-white/40 col-span-1 row-span-3 absolute inset-0 left-1/3" />
                  <div className="border-r border-dashed border-white/40 col-span-1 row-span-3 absolute inset-0 left-2/3" />
                </div>

                {/* Central Red/White Crosshair target */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span className="text-white text-lg font-light select-none font-sans drop-shadow-md">+</span>
                </div>

                {/* 8 Drag boundary handles (Corner squares & edge bars) */}
                {/* Corners */}
                <div 
                  className="absolute -top-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-700/80 rounded-sm cursor-nwse-resize z-10" 
                  onMouseDown={(e) => handleStartDrag('nw', e)}
                  onTouchStart={(e) => handleStartDrag('nw', e)}
                />
                <div 
                  className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-700/80 rounded-sm cursor-nesw-resize z-10"
                  onMouseDown={(e) => handleStartDrag('ne', e)}
                  onTouchStart={(e) => handleStartDrag('ne', e)}
                />
                <div 
                  className="absolute -bottom-1.5 -right-1.5 w-3.5 h-3.5 bg-white border border-slate-700/80 rounded-sm cursor-nwse-resize z-10"
                  onMouseDown={(e) => handleStartDrag('se', e)}
                  onTouchStart={(e) => handleStartDrag('se', e)}
                />
                <div 
                  className="absolute -bottom-1.5 -left-1.5 w-3.5 h-3.5 bg-white border border-slate-700/80 rounded-sm cursor-nesw-resize z-10"
                  onMouseDown={(e) => handleStartDrag('sw', e)}
                  onTouchStart={(e) => handleStartDrag('sw', e)}
                />

                {/* Edge centers */}
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -left-1.5 w-2 h-4 bg-white border border-slate-700/80 rounded-sm cursor-ew-resize z-10"
                  onMouseDown={(e) => handleStartDrag('w', e)}
                  onTouchStart={(e) => handleStartDrag('w', e)}
                />
                <div 
                  className="absolute top-1/2 -translate-y-1/2 -right-1.5 w-2 h-4 bg-white border border-slate-700/80 rounded-sm cursor-ew-resize z-10"
                  onMouseDown={(e) => handleStartDrag('e', e)}
                  onTouchStart={(e) => handleStartDrag('e', e)}
                />
                <div 
                  className="absolute top-0 left-1/2 -translate-x-1/2 -top-1.5 w-4 h-2 bg-white border border-slate-700/80 rounded-sm cursor-ns-resize z-10"
                  onMouseDown={(e) => handleStartDrag('n', e)}
                  onTouchStart={(e) => handleStartDrag('n', e)}
                />
                <div 
                  className="absolute bottom-0 left-1/2 -translate-x-1/2 -bottom-1.5 w-4 h-2 bg-white border border-slate-700/80 rounded-sm cursor-ns-resize z-10"
                  onMouseDown={(e) => handleStartDrag('s', e)}
                  onTouchStart={(e) => handleStartDrag('s', e)}
                />
              </div>
            </div>
          </div>

          {/* Right: Fine-tuning sliders */}
          <div className="flex-1 w-full space-y-6">
            <div className="space-y-4">
              <h4 className="text-xs font-semibold text-slate-300 uppercase tracking-widest block border-b border-slate-800 pb-2">
                Viewport Frame Tuners
              </h4>

              {/* Zoom setting slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <ZoomIn className="h-3.5 w-3.5 text-indigo-400" />
                    Cropper Zoom Level
                  </span>
                  <span className="font-mono text-indigo-300">{zoom.toFixed(2)}x</span>
                </div>
                <input
                  id="editor-zoom"
                  type="range"
                  min="0.5"
                  max="3.0"
                  step="0.05"
                  value={zoom}
                  onChange={(e) => setZoom(parseFloat(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Rotation tilt setting slider */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="flex items-center gap-1">
                    <RotateCw className="h-3.5 w-3.5 text-blue-400" />
                    Fine-Tilt Rotation
                  </span>
                  <span className="font-mono text-indigo-350">{rotation}°</span>
                </div>
                <input
                  id="editor-rotate"
                  type="range"
                  min="0"
                  max="360"
                  step="1"
                  value={rotation}
                  onChange={(e) => setRotation(parseInt(e.target.value))}
                  className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none accent-indigo-500 cursor-pointer"
                />
              </div>

              {/* Mirror & Orient buttons */}
              <div className="grid grid-cols-2 gap-2 pt-2">
                <button
                  id="btn-flip-h"
                  type="button"
                  onClick={() => setFlipH(!flipH)}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
                    flipH 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  <FlipHorizontal className="h-3.5 w-3.5" />
                  Flip Horizontal
                </button>
                <button
                  id="btn-flip-v"
                  type="button"
                  onClick={() => setFlipV(!flipV)}
                  className={`flex items-center justify-center gap-1.5 py-2 text-xs rounded-xl border transition-all cursor-pointer ${
                    flipV 
                      ? 'bg-indigo-600/20 border-indigo-500 text-white font-medium' 
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  <FlipVertical className="h-3.5 w-3.5" />
                  Flip Vertical
                </button>
              </div>
            </div>

            {/* Smart centering actions */}
            <div className="space-y-2 pt-4 border-t border-slate-800/80">
              <span className="text-xs text-slate-400 block">AI centering assistants</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  id="btn-auto-centroid"
                  type="button"
                  onClick={resetToAutoFace}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-indigo-900/40 hover:bg-indigo-900/60 border border-indigo-500/30 hover:border-indigo-500/60 text-indigo-200 rounded-xl text-xs transition-all cursor-pointer font-medium active:scale-95"
                >
                  <Sparkles className="h-3.5 w-3.5" />
                  Auto Face Find
                </button>
                <button
                  id="btn-reset-editor"
                  type="button"
                  onClick={handleResetToDefault}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 bg-slate-900/60 hover:bg-slate-800 text-slate-300 rounded-xl text-xs transition-all border border-slate-800 hover:border-slate-700 cursor-pointer active:scale-95"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Reset Framing
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Footer actions */}
        <div className="px-5 py-4 border-t border-slate-800/85 bg-slate-900/30 flex items-center justify-end gap-3">
          <button
            id="editor-btn-cancel"
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-700 bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 transition-all"
          >
            Cancel Changes
          </button>
          <button
            id="editor-btn-save"
            type="button"
            onClick={handleSave}
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-xs font-semibold cursor-pointer active:scale-95 shadow-md flex items-center gap-1.5 hover:shadow-indigo-500/10 transition-all"
          >
            Apply Trimming
          </button>
        </div>
      </motion.div>
    </div>
  );
}
