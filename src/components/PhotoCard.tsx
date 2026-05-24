import React, { useState } from 'react';
import { Pencil, Trash2, Edit3, ZoomIn, ZoomOut, RotateCw, Undo, Redo, Download, RefreshCw, Layers, CheckCircle2, AlertCircle } from 'lucide-react';
import { StudentPhoto, PhotoPreset } from '../types';
import { formatDimensions } from '../utils/presets';
import { motion } from 'motion/react';

interface PhotoCardProps {
  key?: string;
  photo: StudentPhoto;
  presets: PhotoPreset[];
  activePresetId: string;
  onUpdate: (photoId: string, updatedFields: Partial<StudentPhoto>) => void;
  onDelete: (photoId: string) => void;
  onEditLaunch: (photo: StudentPhoto) => void;
  onDownloadSingle: (photo: StudentPhoto) => void;
}

export default function PhotoCard({
  photo,
  presets,
  activePresetId,
  onUpdate,
  onDelete,
  onEditLaunch,
  onDownloadSingle,
}: PhotoCardProps) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [tempName, setTempName] = useState(photo.name);
  const [dragStart, setDragStart] = useState<{ x: number; y: number; cropX: number; cropY: number } | null>(null);
  const [isCurrentlyDragging, setIsCurrentlyDragging] = useState(false);

  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return; // Only left mouse button drag
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('select') || target.closest('input')) {
      return;
    }
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragStart({
      x: e.clientX,
      y: e.clientY,
      cropX: photo.crop.x,
      cropY: photo.crop.y,
    });
    setIsCurrentlyDragging(false);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    const dx = e.clientX - dragStart.x;
    const dy = e.clientY - dragStart.y;

    if (!isCurrentlyDragging && Math.sqrt(dx * dx + dy * dy) > 3) {
      setIsCurrentlyDragging(true);
    }

    if (isCurrentlyDragging || Math.sqrt(dx * dx + dy * dy) > 3) {
      const rect = e.currentTarget.getBoundingClientRect();
      const containerW = rect.width || 250;
      const containerH = rect.height || 250;

      // Sensitivity factor to match real-time finger/screen motion
      const sensitiveScale = 1.0 / (photo.crop.zoom || 1.0);
      const deltaX = (dx / containerW) * photo.crop.width * sensitiveScale;
      const deltaY = (dy / containerH) * photo.crop.height * sensitiveScale;

      const newCropX = Math.max(-0.5, Math.min(1.5, dragStart.cropX - deltaX));
      const newCropY = Math.max(-0.5, Math.min(1.5, dragStart.cropY - deltaY));

      onUpdate(photo.id, {
        crop: {
          ...photo.crop,
          x: newCropX,
          y: newCropY,
        },
        status: 'idle',
      });
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragStart) return;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch (_) {}
    setDragStart(null);
    setIsCurrentlyDragging(false);
  };

  const handleSaveName = () => {
    if (tempName.trim()) {
      onUpdate(photo.id, { name: tempName.trim() });
    }
    setIsEditingName(false);
  };

  const handleRotation90 = () => {
    const nextRotation = (photo.crop.rotation + 90) % 360;
    onUpdate(photo.id, {
      crop: { ...photo.crop, rotation: nextRotation },
      status: 'idle', // Recalculate
    });
  };

  const handleZoomChange = (delta: number) => {
    const nextZoom = Math.max(0.5, Math.min(3.0, photo.crop.zoom + delta));
    onUpdate(photo.id, {
      crop: { ...photo.crop, zoom: nextZoom },
      status: 'idle',
    });
  };

  const handleSelectLocalBg = (mode: StudentPhoto['background']['mode']) => {
    onUpdate(photo.id, {
      background: { ...photo.background, mode },
      status: 'idle',
    });
  };

  const handleUndo = () => {
    if (photo.historyIndex > 0) {
      const prevIdx = photo.historyIndex - 1;
      const historyState = photo.history[prevIdx];
      onUpdate(photo.id, {
        crop: historyState.crop,
        adjustments: historyState.adjustments,
        background: historyState.background,
        historyIndex: prevIdx,
        status: 'idle',
      });
    }
  };

  const handleRedo = () => {
    if (photo.historyIndex < photo.history.length - 1) {
      const nextIdx = photo.historyIndex + 1;
      const historyState = photo.history[nextIdx];
      onUpdate(photo.id, {
        crop: historyState.crop,
        adjustments: historyState.adjustments,
        background: historyState.background,
        historyIndex: nextIdx,
        status: 'idle',
      });
    }
  };

  const handleIndividualReset = () => {
    onUpdate(photo.id, {
      crop: {
        x: 0.2,
        y: 0.15,
        width: 0.6,
        height: 0.6,
        zoom: 1.0,
        rotation: 0,
        flipH: false,
        flipV: false,
      },
      adjustments: {
        brightness: 0,
        contrast: 0,
        skinSmooth: 0,
        saturation: 0,
      },
      background: {
        mode: 'original',
        edgeSmooth: 8,
        softShadow: true,
      },
      status: 'idle',
    });
  };

  return (
    <motion.div
      layout
      id={`photo-card-${photo.id}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.3 }}
      className="glass-panel rounded-xl overflow-hidden border border-slate-800/80 hover:border-slate-700/80 flex flex-col h-full bg-slate-900/40 relative group"
    >
      {/* Visual compare preview container with mouse/touch drag pan capability */}
      <div 
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{ cursor: isCurrentlyDragging ? 'grabbing' : 'grab' }}
        className="relative aspect-square w-full bg-slate-950 overflow-hidden flex items-center justify-center select-none touch-none"
      >
        {photo.status === 'processing' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/80 z-20 gap-3">
            <div className="h-8 w-8 rounded-full border-2 border-indigo-500 border-t-transparent animate-spin" />
            <span className="text-[10px] text-indigo-400 font-semibold tracking-wider uppercase">Auto Tuning Face...</span>
          </div>
        ) : photo.status === 'error' ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-rose-950/40 z-20 p-4 text-center">
            <AlertCircle className="h-8 w-8 text-rose-500 mb-2" />
            <span className="text-xs text-rose-300 font-semibold mb-1">Processing Failed</span>
            <span className="text-[10px] text-slate-400 leading-tight">{photo.errorMsg || 'Corrupted canvas load.'}</span>
          </div>
        ) : null}

        {/* Swipe comparison: we display processed result. */}
        <img
          src={photo.processedUrl || photo.originalUrl}
          alt={photo.name}
          className="w-full h-full object-contain pointer-events-none"
          referrerPolicy="no-referrer"
        />

        {/* Subtle grab-pan prompt overlay */}
        <div className="absolute inset-0 bg-slate-950/10 opacity-0 group-hover:opacity-100 transition-opacity duration-350 pointer-events-none flex items-center justify-center z-5">
          <div className="bg-slate-950/90 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-800 text-[10px] text-slate-200 font-semibold flex items-center gap-1.5 shadow-xl">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-indigo-400">
              <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
            </svg>
            Drag to pan portrait
          </div>
        </div>

        {/* Quick aspect badge overlay */}
        <div className="absolute top-2.5 left-2.5 flex flex-col gap-1.5 z-10">
          <span className="text-[9px] font-mono font-semibold uppercase tracking-wider bg-slate-950/75 border border-slate-700 text-slate-200 px-2 py-0.5 rounded-md backdrop-blur-md">
            {formatDimensions(currentPreset)}
          </span>
        </div>

        {/* Quick action bar overlay hovering on image card */}
        <div className="absolute bottom-2.5 inset-x-2.5 flex items-center justify-between opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity duration-350 z-10 gap-1">
          <div className="flex items-center gap-1.5 bg-slate-950/90 p-1.5 rounded-lg border border-slate-800 backdrop-blur-md">
            <button
              id={`card-zoom-in-${photo.id}`}
              type="button"
              onClick={() => handleZoomChange(0.15)}
              className="p-1 px-1.5 rounded text-slate-200 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
              title="Zoom student face up"
            >
              <ZoomIn className="h-4.5 w-4.5" />
            </button>
            <button
              id={`card-zoom-out-${photo.id}`}
              type="button"
              onClick={() => handleZoomChange(-0.15)}
              className="p-1 px-1.5 rounded text-slate-200 hover:text-indigo-400 hover:bg-slate-800 transition-colors"
              title="Zoom student face down"
            >
              <ZoomOut className="h-4.5 w-4.5" />
            </button>
            <button
              id={`card-rotate-cw-${photo.id}`}
              type="button"
              onClick={handleRotation90}
              className="p-1 px-1.5 rounded text-slate-200 hover:text-indigo-450 hover:bg-slate-800 transition-colors"
              title="Rotate portrait 90 deg"
            >
              <RotateCw className="h-4 w-4" />
            </button>
          </div>

          <button
            id={`card-edit-${photo.id}`}
            type="button"
            onClick={() => onEditLaunch(photo)}
            className="flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-[10px] font-semibold shadow-md cursor-pointer active:scale-95 transition-all"
          >
            <Edit3 className="h-3 w-3" />
            Manual Trim
          </button>
        </div>
      </div>

      {/* Primary specs panel */}
      <div className="p-4 flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          {/* Filename editor input */}
          <div className="flex items-start justify-between gap-1">
            {isEditingName ? (
              <div className="flex items-center gap-1.5 w-full">
                <input
                  id={`input-rename-${photo.id}`}
                  type="text"
                  value={tempName}
                  onChange={(e) => setTempName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  onBlur={handleSaveName}
                  className="w-full text-xs px-2 py-1 bg-slate-950 border border-slate-700 rounded text-slate-200 outline-none focus:ring-1 focus:ring-indigo-500"
                  autoFocus
                />
              </div>
            ) : (
              <div 
                id={`btn-edit-name-${photo.id}`}
                onClick={() => setIsEditingName(true)}
                className="group/name w-full max-w-[85%] cursor-pointer hover:bg-slate-800/50 p-1 rounded-md transition-all flex items-center justify-between gap-1"
                title="Click name to rename student"
              >
                <h4 className="text-xs font-semibold text-slate-100 truncate pr-1" title={photo.name}>
                  {photo.name}
                </h4>
                <Pencil className="h-2.5 w-2.5 text-indigo-400 shrink-0 opacity-0 group-hover/name:opacity-100 transition-opacity" />
              </div>
            )}

            <button
              id={`btn-delete-${photo.id}`}
              type="button"
              onClick={() => onDelete(photo.id)}
              className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-slate-800/40 transition-colors cursor-pointer"
              title="Delete photo record"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Quick single background replacements bar */}
          <div className="space-y-1">
            <span className="text-[10px] text-slate-500 flex items-center gap-1.5">
              <Layers className="h-3 w-3" /> Quick Backdrop swap
            </span>
            <div className="flex gap-1.5">
              {[
                { mode: 'original', label: 'Orig', color: 'bg-slate-800' },
                { mode: 'transparent', label: 'Clear', color: 'bg-slate-900 border border-slate-700 border-dashed' },
                { mode: 'white', label: 'White', color: 'bg-white border text-slate-950 border-slate-300' },
                { mode: 'blue', label: 'Blue', color: 'bg-blue-600' },
              ].map((bgItem) => (
                <button
                  key={bgItem.mode}
                  type="button"
                  onClick={() => handleSelectLocalBg(bgItem.mode as any)}
                  className={`flex-1 py-1 rounded-[5px] text-[8px] font-medium text-center transition-all cursor-pointer ${
                    photo.background.mode === bgItem.mode
                      ? 'bg-indigo-600 border border-indigo-400 text-white font-bold'
                      : 'bg-slate-950/60 border border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-300'
                  }`}
                >
                  {bgItem.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer controls: Undo/Redo/Download */}
        <div className="pt-3 mt-3 border-t border-slate-800/80 flex items-center justify-between text-slate-400 text-xs gap-2">
          <div className="flex items-center gap-2">
            <button
              id={`btn-undo-${photo.id}`}
              type="button"
              disabled={photo.historyIndex <= 0}
              onClick={handleUndo}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Undo adjustment"
            >
              <Undo className="h-3.5 w-3.5" />
            </button>
            <button
              id={`btn-redo-${photo.id}`}
              type="button"
              disabled={photo.historyIndex >= photo.history.length - 1}
              onClick={handleRedo}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white disabled:opacity-30 disabled:hover:bg-transparent"
              title="Redo adjustment"
            >
              <Redo className="h-3.5 w-3.5" />
            </button>
            <button
              id={`btn-reset-card-${photo.id}`}
              type="button"
              onClick={handleIndividualReset}
              className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white"
              title="Reset values to defaults"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          <button
            id={`btn-download-one-${photo.id}`}
            type="button"
            onClick={() => onDownloadSingle(photo)}
            className="flex items-center gap-1 px-2 py-1 text-[10px] font-semibold text-emerald-400 bg-emerald-950/50 hover:bg-emerald-900/30 rounded border border-emerald-500/20 active:scale-95 transition-all cursor-pointer"
            title="Download single student processed photo"
          >
            <Download className="h-3 w-3" />
            Download
          </button>
        </div>
      </div>
    </motion.div>
  );
}
