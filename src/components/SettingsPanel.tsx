import React, { useState } from 'react';
import { Settings, Save, ShieldAlert, Trash2, Check, RotateCcw, Sparkles } from 'lucide-react';
import { PhotoPreset } from '../types';
import { formatDimensions } from '../utils/presets';
import { motion } from 'motion/react';

interface SettingsPanelProps {
  customPresets: PhotoPreset[];
  onAddPreset: (preset: PhotoPreset) => void;
  onDeletePreset: (id: string) => void;
  onClearSession: () => void;
  totalPhotos: number;
}

export default function SettingsPanel({
  customPresets,
  onAddPreset,
  onDeletePreset,
  onClearSession,
  totalPhotos,
}: SettingsPanelProps) {
  // New preset state creator
  const [name, setName] = useState('');
  const [width, setWidth] = useState<number>(35);
  const [height, setHeight] = useState<number>(45);
  const [unit, setUnit] = useState<PhotoPreset['unit']>('mm');
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState(false);

  const handleSavePreset = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg(false);

    if (!name.trim()) {
      setErrorMsg('Please specify a recognizable template template name.');
      return;
    }

    if (width <= 0 || height <= 0) {
      setErrorMsg('Width and height values must be positive integers.');
      return;
    }

    const ratio = width / height;

    const newPreset: PhotoPreset = {
      id: 'custom-' + Date.now(),
      name: name.trim(),
      width,
      height,
      unit,
      aspectRatio: ratio,
    };

    onAddPreset(newPreset);
    setName('');
    setSuccessMsg(true);
    setTimeout(() => setSuccessMsg(false), 2500);
  };

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      <div className="flex items-center gap-2 border-b border-slate-800 pb-4">
        <Settings className="h-5 w-5 text-indigo-400" />
        <div>
          <h2 className="font-display font-bold text-lg text-white">System Config &amp; Custom Presets</h2>
          <p className="text-xs text-slate-400 mt-1">
            Store localized workspace defaults, define proprietary school dimension ratios, and manage active browser caches.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left: Custom Preset builder form */}
        <form onSubmit={handleSavePreset} className="space-y-4 bg-slate-900/40 p-4 rounded-xl border border-slate-800">
          <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-indigo-300 flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-indigo-400" /> Save Custom Dimensions Preset
          </h3>

          <div className="space-y-1 text-xs">
            <label htmlFor="preset-name-input" className="text-[11px] text-slate-400">Template Target Name</label>
            <input
              id="preset-name-input"
              type="text"
              placeholder="e.g. Model High ID 40x50"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white outline-none focus:border-indigo-500"
            />
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="preset-width-input" className="text-[11px] text-slate-400">Width Spec</label>
              <input
                id="preset-width-input"
                type="number"
                min="1"
                value={width}
                onChange={(e) => setWidth(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="preset-height-input" className="text-[11px] text-slate-400">Height Spec</label>
              <input
                id="preset-height-input"
                type="number"
                min="1"
                value={height}
                onChange={(e) => setHeight(Math.max(1, parseFloat(e.target.value) || 1))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center"
              />
            </div>

            <div className="space-y-1">
              <label htmlFor="preset-unit-select" className="text-[11px] text-slate-400">Dimension Unit</label>
              <select
                id="preset-unit-select"
                value={unit}
                onChange={(e) => setUnit(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white text-center focus:outline-none"
              >
                <option value="px">px</option>
                <option value="mm">mm</option>
                <option value="inch">inch</option>
                <option value="ratio">ratio</option>
              </select>
            </div>
          </div>

          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}
          {successMsg && (
            <p className="text-xs text-emerald-400 flex items-center gap-1">
              <Check className="h-3.5 w-3.5" /> Template custom variables saved locally to lists!
            </p>
          )}

          <button
            id="btn-save-custom-preset"
            type="submit"
            className="w-full flex items-center justify-center gap-1.5 py-2 BG-transparent border border-indigo-500 hover:bg-indigo-600/10 text-indigo-300 hover:text-white rounded-lg text-xs font-semibold cursor-pointer transition-all"
          >
            <Save className="h-3.5 w-3.5" />
            Save Preset Locally
          </button>
        </form>

        {/* Right: Reset session & list of saved presets */}
        <div className="flex flex-col justify-between bg-slate-900/40 p-4 rounded-xl border border-slate-800 overflow-hidden">
          <div className="space-y-3">
            <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-indigo-300">
              Active Presets and Workspace Cache
            </h3>

            {/* Custom Presets view list */}
            {customPresets.length === 0 ? (
              <p className="text-xs text-slate-500 leading-normal">
                No user precompiled sizing definitions defined. Define custom ratios on the left to show list records here.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                {customPresets.map((preset) => (
                  <div
                    key={preset.id}
                    className="flex justify-between items-center text-xs bg-slate-950/60 border border-slate-805/60 p-2 rounded-lg text-slate-350"
                  >
                    <div>
                      <strong className="text-slate-200">{preset.name}</strong>
                      <span className="text-[10px] text-slate-500 ml-2">({formatDimensions(preset)})</span>
                    </div>
                    <button
                      id={`btn-del-preset-${preset.id}`}
                      type="button"
                      onClick={() => onDeletePreset(preset.id)}
                      className="p-1 rounded text-slate-500 hover:text-rose-450 hover:bg-slate-800"
                    >
                      <Trash2 className="h-3.5 w-3.5 text-rose-500" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="pt-4 border-t border-slate-800/80 space-y-3">
            <div className="flex items-start gap-2 bg-rose-950/20 border border-rose-900/40 p-3 rounded-xl text-[10px] text-slate-400">
              <ShieldAlert className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
              <span>
                To clear loaded photos, free up device memory, or reset the local storage environment for a new student division, trigger the purge cycle below.
              </span>
            </div>

            <button
              id="btn-purge-session"
              type="button"
              disabled={totalPhotos === 0}
              onClick={onClearSession}
              className="w-full flex items-center justify-center gap-1.5 py-2.5 bg-rose-950/40 hover:bg-rose-900/40 disabled:opacity-40 border border-rose-900/40 text-rose-350 hover:text-rose-200 text-xs rounded-xl font-semibold transition-all cursor-pointer active:scale-95"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Purge Active Session Cache ({totalPhotos} files)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
