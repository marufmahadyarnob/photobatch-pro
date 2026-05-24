import React, { useState } from 'react';
import { Download, Archive, Type, Hash, ShieldAlert, ArrowRight, Play, RefreshCw, CheckCircle } from 'lucide-react';
import { StudentPhoto, AutoNamingSettings } from '../types';
import JSZip from 'jszip';
import { motion } from 'motion/react';

interface ExporterProps {
  photos: StudentPhoto[];
  namingSettings: AutoNamingSettings;
  onNamingSettingsChange: (settings: Partial<AutoNamingSettings>) => void;
  onApplyNamingToAll: () => void;
  onDownloadAllZIP: () => void;
  isZipPending: boolean;
}

export default function Exporter({
  photos,
  namingSettings,
  onNamingSettingsChange,
  onApplyNamingToAll,
  onDownloadAllZIP,
  isZipPending,
}: ExporterProps) {
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const doneCount = photos.filter((p) => p.status === 'done').length;

  const handleApplySequentialNaming = () => {
    onApplyNamingToAll();
  };

  const previewFormattedName = (index: number) => {
    const num = namingSettings.startNumber + index;
    const paddedNum = String(num).padStart(namingSettings.padding, '0');
    const parts = [];
    if (namingSettings.prefix) parts.push(namingSettings.prefix);
    parts.push(paddedNum);
    if (namingSettings.suffix) parts.push(namingSettings.suffix);
    return parts.join(namingSettings.separator) + '.jpg';
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      
      {/* Header Info */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Type className="h-5 w-5 text-indigo-400" />
        <div>
          <h2 className="font-display font-bold text-lg text-white">Smart Auto-File Naming &amp; Batch Exporter</h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure custom school prefix schemes to align image filenames with student roll numbers, database IDs, or classroom registers automatically.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Sequential Renaming Configuration Grid */}
        <div className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800/80">
          <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Hash className="h-4 w-4" /> Sequential Formula Editor
          </h3>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="input-prefix" className="text-[11px] text-slate-400">Filename Prefix</label>
              <input
                id="input-prefix"
                type="text"
                value={namingSettings.prefix}
                placeholder="e.g. roll"
                onChange={(e) => onNamingSettingsChange({ prefix: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="input-suffix" className="text-[11px] text-slate-400">Filename Suffix (Optional)</label>
              <input
                id="input-suffix"
                type="text"
                value={namingSettings.suffix}
                placeholder="e.g. sectionA"
                onChange={(e) => onNamingSettingsChange({ suffix: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="input-start-num" className="text-[11px] text-slate-400">Start Sequence Index</label>
              <input
                id="input-start-num"
                type="number"
                min="0"
                value={namingSettings.startNumber}
                onChange={(e) => onNamingSettingsChange({ startNumber: Math.max(0, parseInt(e.target.value) || 0) })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="input-padding" className="text-[11px] text-slate-400">Digit Padding</label>
              <select
                id="input-padding"
                value={namingSettings.padding}
                onChange={(e) => onNamingSettingsChange({ padding: parseInt(e.target.value) })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center focus:outline-none"
              >
                <option value={1}>1 (e.g. 1, 2)</option>
                <option value={2}>2 (e.g. 01, 02)</option>
                <option value={3}>3 (e.g. 001, 002)</option>
                <option value={4}>4 (e.g. 0001, 0002)</option>
              </select>
            </div>

            <div className="space-y-1">
              <label htmlFor="input-separator" className="text-[11px] text-slate-400">Separator glyph</label>
              <select
                id="input-separator"
                value={namingSettings.separator}
                onChange={(e) => onNamingSettingsChange({ separator: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center focus:outline-none"
              >
                <option value="">None ("")</option>
                <option value="_">Under_score ("_")</option>
                <option value="-">Hyphen-dash ("-")</option>
                <option value=".">Dot-period (".")</option>
              </select>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800">
            <div className="flex justify-between items-center bg-slate-950/60 p-3 rounded-lg border border-slate-800">
              <div className="text-xs">
                <span className="text-slate-400 block text-[10px] uppercase">Example output:</span>
                <strong className="text-emerald-400 font-mono tracking-tight mt-0.5 block">{previewFormattedName(0)}</strong>
                <strong className="text-slate-400 font-mono tracking-tight text-[11px] block">{previewFormattedName(1)}</strong>
              </div>

              <button
                id="btn-apply-renaming"
                type="button"
                onClick={handleApplySequentialNaming}
                disabled={photos.length === 0}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 hover:scale-[1.02] text-white rounded-lg text-xs font-semibold cursor-pointer active:scale-95 transition-all text-center self-center"
              >
                <Play className="h-3 w-3 shadow-inner" />
                Rename List
              </button>
            </div>
          </div>
        </div>

        {/* Right: ZIP Exporter block */}
        <div className="flex flex-col justify-between bg-slate-900/45 p-5 border border-slate-800 rounded-2xl">
          <div className="space-y-3">
            <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5 pb-2 border-b border-slate-800/80">
              <Archive className="h-4 w-4" /> Output compilation
            </h3>

            <div className="space-y-2 text-xs text-slate-350">
              <div className="flex items-center justify-between">
                <span>Total images selected:</span>
                <strong className="text-slate-200">{photos.length} files</strong>
              </div>
              <div className="flex items-center justify-between">
                <span>Optimized &amp; processed successfully:</span>
                <strong className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" /> {doneCount} / {photos.length}
                </strong>
              </div>
            </div>

            {photos.length > 0 && doneCount < photos.length && (
              <div className="bg-amber-950/20 border border-amber-900/40 p-2.5 rounded-lg text-[10px] text-amber-300 flex gap-1.5 items-start">
                <ShieldAlert className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                <span>Some images in the list are currently rendering or have errored. They will be exported with the fallback original values if downloaded now. Keep processing!</span>
              </div>
            )}
          </div>

          <div className="pt-4 mt-4 border-t border-slate-800/85">
            <button
              id="btn-zip-download"
              type="button"
              disabled={photos.length === 0 || isZipPending}
              onClick={onDownloadAllZIP}
              className="w-full flex items-center justify-center gap-2 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-40 disabled:from-slate-800 disabled:to-slate-800 text-white rounded-xl text-xs font-bold transition-all active:scale-[0.98] shadow-lg shadow-emerald-950/10 cursor-pointer"
            >
              {isZipPending ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent animate-spin rounded-full" />
                  Generating high-res ZIP library...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4" />
                  Compile &amp; Download Batch images as ZIP
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
