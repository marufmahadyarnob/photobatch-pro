import React, { useState } from 'react';
import { Sun, Sparkles, Sliders, Palette, RefreshCw, Eye, Percent, Check, HelpCircle } from 'lucide-react';
import { BatchSettings, PhotoPreset } from '../types';
import { PHOTO_PRESETS, formatDimensions } from '../utils/presets';
import { motion } from 'motion/react';

interface BatchToolbarProps {
  settings: BatchSettings;
  presets: PhotoPreset[];
  onSettingsChange: (settings: Partial<BatchSettings>) => void;
  onApplyToAll: () => void;
  totalImages: number;
}

export default function BatchToolbar({
  settings,
  presets,
  onSettingsChange,
  onApplyToAll,
  totalImages,
}: BatchToolbarProps) {
  const [showTooltip, setShowTooltip] = useState<string | null>(null);

  const resetBatchSettings = () => {
    onSettingsChange({
      brightness: 0,
      contrast: 0,
      skinSmooth: 0,
      saturation: 0,
      backgroundMode: 'original',
      customBackgroundColor: '#4f46e5',
      edgeSmooth: 8,
      softShadow: true,
    });
  };

  const currentPreset = presets.find(p => p.id === settings.presetId) || presets[0];

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-slate-800">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 border-b border-slate-800/80 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Sliders className="h-5 w-5 text-indigo-400" />
            <h2 className="font-display font-bold text-lg text-white">Batch Adjustments Dashboard</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Apply automated enhancements, skin corrections, and backdrop swaps on all <span className="text-indigo-400 font-semibold">{totalImages}</span> loaded portraits.
          </p>
        </div>
        <div className="flex items-center gap-3 self-end md:self-auto">
          <button
            id="btn-reset-all"
            type="button"
            onClick={resetBatchSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-300 hover:text-white bg-slate-800/60 hover:bg-slate-800 rounded-lg border border-slate-700/60 transition-all cursor-pointer active:scale-95"
            title="Reset batch sliders to defaults"
          >
            <RefreshCw className="h-3 w-3" />
            Reset Sliders
          </button>
          
          <div className="flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 rounded-xl text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse mr-0.5" />
            Auto-Applied Live
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Core Sliders */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-semibold uppercase text-indigo-300 tracking-wider flex items-center gap-2">
            <Sliders className="h-3.5 w-3.5" />
            Lighting &amp; Skin corrections
          </h3>

          {/* Brightness Slider */}
          <div 
            className="space-y-1.5 relative group"
            onMouseEnter={() => setShowTooltip('brightness')}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <label htmlFor="brightness-slider" className="flex items-center gap-1">
                <Sun className="h-3.5 w-3.5 text-amber-400" />
                Brightness Correction
              </label>
              <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-mono text-indigo-300">
                <span>{settings.brightness > 0 ? `+${settings.brightness}` : settings.brightness}</span>
                <span className="text-[10px] text-slate-500">px</span>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                id="brightness-slider"
                type="range"
                min="-100"
                max="100"
                value={settings.brightness}
                onChange={(e) => onSettingsChange({ brightness: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>
            {showTooltip === 'brightness' && (
              <span className="absolute -top-6 right-0 text-[10px] bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 pointer-events-none">
                Hover to slide &bull; Adjust light
              </span>
            )}
          </div>

          {/* Contrast Slider */}
          <div 
            className="space-y-1.5 relative group"
            onMouseEnter={() => setShowTooltip('contrast')}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <label htmlFor="contrast-slider" className="flex items-center gap-1">
                <Sliders className="h-3.5 w-3.5 text-blue-400" />
                Contrast
              </label>
              <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-mono text-indigo-300">
                <span>{settings.contrast > 0 ? `+${settings.contrast}` : settings.contrast}</span>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                id="contrast-slider"
                type="range"
                min="-100"
                max="100"
                value={settings.contrast}
                onChange={(e) => onSettingsChange({ contrast: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-indigo-500 focus:outline-none"
              />
            </div>
            {showTooltip === 'contrast' && (
              <span className="absolute -top-6 right-0 text-[10px] bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 pointer-events-none">
                Hover to slide &bull; Adjust pop
              </span>
            )}
          </div>

          {/* Skin Smooth Beautifier */}
          <div 
            className="space-y-1.5 relative group"
            onMouseEnter={() => setShowTooltip('skinSmooth')}
            onMouseLeave={() => setShowTooltip(null)}
          >
            <div className="flex items-center justify-between text-xs font-medium text-slate-300">
              <label htmlFor="skin-smooth-slider" className="flex items-center gap-1">
                <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                Skin Smooth Beautifier
              </label>
              <div className="flex items-center gap-1 bg-slate-800 px-1.5 py-0.5 rounded text-mono text-emerald-300 font-semibold">
                <span>{settings.skinSmooth}%</span>
              </div>
            </div>
            <div className="relative flex items-center">
              <input
                id="skin-smooth-slider"
                type="range"
                min="0"
                max="100"
                value={settings.skinSmooth}
                onChange={(e) => onSettingsChange({ skinSmooth: parseInt(e.target.value) })}
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-500 focus:outline-none"
              />
            </div>
            {showTooltip === 'skinSmooth' && (
              <span className="absolute -top-6 right-0 text-[10px] bg-slate-900 border border-slate-700 text-slate-300 rounded px-1.5 py-0.5 pointer-events-none">
                Hover to slide &bull; Removes blemishes
              </span>
            )}
          </div>
        </div>

        {/* AI Background Removal Settings */}
        <div className="space-y-4">
          <h3 className="text-xs font-display font-semibold uppercase text-indigo-300 tracking-wider flex items-center gap-2">
            <Palette className="h-3.5 w-3.5" />
            AI Background Replacement
          </h3>

          <div className="space-y-2">
            <span className="text-xs font-medium text-slate-300 block">Replace Backdrop Hues:</span>
            <div className="grid grid-cols-5 gap-1.5">
              {[
                { mode: 'original', label: 'Original', color: 'bg-slate-800 border-slate-700' },
                { mode: 'transparent', label: 'Alpha', color: 'bg-slate-900/40 divide-y divide-slate-700/50 [background-image:linear-gradient(45deg,#2e2e2e_25%,transparent_25%),linear-gradient(-45deg,#2e2e2e_25%,transparent_25%),linear-gradient(45deg,transparent_75%,#2e2e2e_75%),linear-gradient(-45deg,transparent_75%,#2e2e2e_75%)] [background-size:8px_8px] [background-position:0_0,0_4px,4px_-4px,-4px_0px]' },
                { mode: 'white', label: 'White', color: 'bg-white border-white' },
                { mode: 'blue', label: 'Blue', color: 'bg-blue-600 border-blue-600' },
                { mode: 'custom', label: 'Custom', color: 'bg-gradient-to-r from-pink-500 to-indigo-500' }
              ].map((bgItem) => (
                <button
                  key={bgItem.mode}
                  type="button"
                  onClick={() => onSettingsChange({ backgroundMode: bgItem.mode as any })}
                  className={`flex flex-col items-center justify-center p-1 rounded-xl border text-[10px] transition-all min-h-[50px] cursor-pointer ${
                    settings.backgroundMode === bgItem.mode
                      ? 'border-indigo-400 bg-indigo-500/10 text-white font-semibold ring-2 ring-indigo-500/30'
                      : 'border-slate-800 bg-slate-900/40 text-slate-400 hover:border-slate-700 hover:text-slate-300'
                  }`}
                >
                  <span className={`w-5 h-5 rounded-full mb-1 border ${bgItem.color}`} />
                  {bgItem.label}
                </button>
              ))}
            </div>
          </div>

          {settings.backgroundMode === 'custom' && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex items-center gap-2 mt-2"
            >
              <label htmlFor="custom-bg-picker" className="text-xs text-slate-400">Custom Hex Color:</label>
              <input
                id="custom-bg-picker"
                type="color"
                value={settings.customBackgroundColor}
                onChange={(e) => onSettingsChange({ customBackgroundColor: e.target.value })}
                className="w-10 h-6 p-0 rounded-md border border-slate-700 bg-slate-900 cursor-pointer"
              />
              <input
                type="text"
                value={settings.customBackgroundColor}
                onChange={(e) => {
                  if (e.target.value.startsWith('#') && e.target.value.length <= 7) {
                    onSettingsChange({ customBackgroundColor: e.target.value });
                  }
                }}
                className="w-20 px-1.5 py-0.5 text-xs text-mono text-center text-slate-200 border border-slate-700 rounded bg-slate-900/60"
              />
            </motion.div>
          )}

          <div className="flex items-center justify-between text-xs pt-1">
            <span className="text-slate-300 font-medium">Soft shadow overlay</span>
            <div className="flex items-center">
              <input
                id="chk-soft-shadow"
                type="checkbox"
                checked={settings.softShadow}
                onChange={(e) => onSettingsChange({ softShadow: e.target.checked })}
                disabled={settings.backgroundMode === 'original'}
                className="h-4 w-4 bg-slate-900 border-slate-700 text-indigo-600 focus:ring-0 rounded-md cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
              />
            </div>
          </div>
        </div>

        {/* Global Preset Selection */}
        <div className="space-y-4 bg-slate-900/30 p-4 rounded-xl border border-slate-800/60">
          <h3 className="text-xs font-display font-semibold uppercase text-indigo-300 tracking-wider flex items-center gap-2">
            <Eye className="h-3.5 w-3.5" />
            Official Size Template
          </h3>

          <div className="space-y-3">
            <div>
              <label htmlFor="preset-select" className="text-[11px] text-slate-400 block mb-1">Standard Cutouts Preset</label>
              <select
                id="preset-select"
                value={settings.presetId}
                onChange={(e) => onSettingsChange({ presetId: e.target.value })}
                className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white focus:ring-1 focus:ring-indigo-500 focus:outline-none"
              >
                {presets.map((preset) => (
                  <option key={preset.id} value={preset.id}>
                    {preset.name} ({formatDimensions(preset)})
                  </option>
                ))}
                <option value="custom">-- Custom Customization Size --</option>
              </select>
            </div>

            {settings.presetId === 'custom' && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="grid grid-cols-3 gap-2 pt-1"
              >
                <div>
                  <label htmlFor="custom-width" className="text-[9px] text-slate-500 block">Width</label>
                  <input
                    id="custom-width"
                    type="number"
                    value={settings.customWidth}
                    onChange={(e) => onSettingsChange({ customWidth: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-center text-white"
                  />
                </div>
                <div>
                  <label htmlFor="custom-height" className="text-[9px] text-slate-500 block">Height</label>
                  <input
                    id="custom-height"
                    type="number"
                    value={settings.customHeight}
                    onChange={(e) => onSettingsChange({ customHeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-center text-white"
                  />
                </div>
                <div>
                  <label htmlFor="custom-unit-select" className="text-[9px] text-slate-500 block">Unit</label>
                  <select
                    id="custom-unit-select"
                    value={settings.customUnit}
                    onChange={(e) => onSettingsChange({ customUnit: e.target.value as any })}
                    className="w-full px-1.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-[10px] text-white focus:outline-none"
                  >
                    <option value="px">px</option>
                    <option value="mm">mm</option>
                    <option value="inch">inch</option>
                    <option value="ratio">ratio</option>
                  </select>
                </div>
              </motion.div>
            )}

            <div className="flex items-center gap-1 bg-slate-800/40 p-2 rounded-lg text-[10px] text-slate-400">
              <HelpCircle className="h-3 w-3 text-indigo-400 shrink-0" />
              <span>DPI resolution is automatically calculated in 300 DPI for premium professional prints.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
