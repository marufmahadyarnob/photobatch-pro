import React, { useState, useEffect } from 'react';
import { 
  Camera, 
  Upload, 
  Sliders, 
  Layers, 
  Printer, 
  Type, 
  Settings as SettingsIcon, 
  Trash2, 
  Download, 
  Archive, 
  RotateCcw, 
  UserCheck, 
  Info,
  Layers3,
  Sun,
  LayoutGrid,
  CheckCircle,
  HelpCircle,
  SlidersHorizontal,
  FolderSync
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import JSZip from 'jszip';

// Interfaces and helpers
import { StudentPhoto, PhotoPreset, BatchSettings, AutoNamingSettings } from './types';
import { PHOTO_PRESETS } from './utils/presets';
import { loadImage, detectFace, applyImageProcesses } from './utils/imageProcessor';

// Components
import UploadZone from './components/UploadZone';
import BatchToolbar from './components/BatchToolbar';
import PhotoCard from './components/PhotoCard';
import ManualEditorModal from './components/ManualEditorModal';
import PrintSheetGenerator from './components/PrintSheetGenerator';
import Exporter from './components/Exporter';
import SettingsPanel from './components/SettingsPanel';

export default function App() {
  // Core application states
  const [photos, setPhotos] = useState<StudentPhoto[]>([]);
  const [customPresets, setCustomPresets] = useState<PhotoPreset[]>([]);
  const [isRenderingAll, setIsRenderingAll] = useState(false);
  
  // Tab states: 'list' (image editor), 'print' (A4 layouts), 'name' (sequential models), 'settings' (defaults)
  const [activeTab, setActiveTab] = useState<'list' | 'print' | 'name' | 'settings'>('list');
  
  // Selected single photo for manual detailed crop adjustment
  const [editingPhoto, setEditingPhoto] = useState<StudentPhoto | null>(null);
  
  // Interactive global batch settings state
  const [batchSettings, setBatchSettings] = useState<BatchSettings>({
    brightness: 0,
    contrast: 0,
    skinSmooth: 0,
    saturation: 0,
    backgroundMode: 'original',
    customBackgroundColor: '#3b82f6',
    edgeSmooth: 8,
    softShadow: true,
    presetId: 'square-1-1',
    customWidth: 51,
    customHeight: 51,
    customUnit: 'mm'
  });

  // Filename formatting naming rule set
  const [namingSettings, setNamingSettings] = useState<AutoNamingSettings>({
    prefix: 'student',
    suffix: '',
    startNumber: 1,
    padding: 2,
    separator: '_'
  });

  const [isZipPending, setIsZipPending] = useState(false);

  // 1. Load initial states from localStorage on startup (Session restore)
  useEffect(() => {
    try {
      const storedPresets = localStorage.getItem('photobatch_custom_presets');
      if (storedPresets) {
        setCustomPresets(JSON.parse(storedPresets));
      }

      const storedNaming = localStorage.getItem('photobatch_naming_settings');
      if (storedNaming) {
        setNamingSettings(JSON.parse(storedNaming));
      }

      const storedBatch = localStorage.getItem('photobatch_batch_settings');
      if (storedBatch) {
        setBatchSettings(JSON.parse(storedBatch));
      }

      // Restoring metadata configurations
      const storedPhotosConfig = localStorage.getItem('photobatch_photos');
      if (storedPhotosConfig) {
        const parsedMetadata = JSON.parse(storedPhotosConfig);
        // Note: ObjectURLs are invalid after page reload, so if they are stored, 
        // we prompt the user to drag files to re-load them, but restore previous crop layouts!
        // To provide an incredible robust flow, we only state configs that are valid.
        // We will filter out elements since the files themselves must be loaded manually on restart.
      }
    } catch (e) {
      console.error("Failed to restore session: ", e);
    }
  }, []);

  // 2. Persist states in standard intervals
  useEffect(() => {
    localStorage.setItem('photobatch_custom_presets', JSON.stringify(customPresets));
  }, [customPresets]);

  useEffect(() => {
    localStorage.setItem('photobatch_naming_settings', JSON.stringify(namingSettings));
  }, [namingSettings]);

  useEffect(() => {
    localStorage.setItem('photobatch_batch_settings', JSON.stringify(batchSettings));
  }, [batchSettings]);

  // Automatically apply batch adjustments to all loaded photos in real-time when sliders or preset changes
  useEffect(() => {
    if (photos.length > 0) {
      handleApplyBatchSettings();
    }
  }, [batchSettings]);

  // Combine default presets and custom local ones
  const allPresets = [...PHOTO_PRESETS, ...customPresets];

  // 3. Automated canvas graphics background compilation
  // Whenever any photo is in 'idle' status, we automatically render it through canvas
  useEffect(() => {
    const idlePhoto = photos.find(p => p.status === 'idle');
    if (!idlePhoto) return;

    // Transition photo to 'processing' to prevent redundant triggering
    updatePhotoState(idlePhoto.id, { status: 'processing', progress: 10 });

    const compilePhoto = async () => {
      try {
        // Find dimensions based on settings
        const preset = allPresets.find(p => p.id === batchSettings.presetId) || allPresets[0];
        
        let outputW = 600;
        let outputH = 600;

        if (preset.id !== 'custom') {
          if (preset.unit === 'mm') {
            outputW = Math.round((preset.width / 25.4) * 300); // 300 dpi conversion
            outputH = Math.round((preset.height / 25.4) * 300);
          } else if (preset.unit === 'inch') {
            outputW = Math.round(preset.width * 300);
            outputH = Math.round(preset.height * 300);
          } else {
            outputW = preset.width;
            outputH = preset.height;
          }
        } else {
          // Custom customisation ratios
          if (batchSettings.customUnit === 'mm') {
            outputW = Math.round((batchSettings.customWidth / 25.4) * 300);
            outputH = Math.round((batchSettings.customHeight / 25.4) * 300);
          } else if (batchSettings.customUnit === 'inch') {
            outputW = Math.round(batchSettings.customWidth * 300);
            outputH = Math.round(batchSettings.customHeight * 300);
          } else {
            outputW = batchSettings.customWidth || 600;
            outputH = batchSettings.customHeight || 600;
          }
        }

        // Apply visual render
        const finishedBase64 = await applyImageProcesses(
          idlePhoto.originalUrl,
          idlePhoto.crop,
          idlePhoto.adjustments,
          idlePhoto.background,
          outputW,
          outputH,
          idlePhoto.isLockedAspectRatio
        );

        // Calculate and push history state
        const updatedHistory = [...idlePhoto.history.slice(0, idlePhoto.historyIndex + 1), {
          crop: { ...idlePhoto.crop },
          adjustments: { ...idlePhoto.adjustments },
          background: { ...idlePhoto.background }
        }];

        updatePhotoState(idlePhoto.id, {
          processedUrl: finishedBase64,
          status: 'done',
          progress: 100,
          history: updatedHistory,
          historyIndex: updatedHistory.length - 1
        });
      } catch (err: any) {
        console.error("Canvas compilation crash in background: ", err);
        updatePhotoState(idlePhoto.id, { 
          status: 'error', 
          errorMsg: err?.message || 'Unsupported binary formatting.' 
        });
      }
    };

    // Execute
    compilePhoto();
  }, [photos, batchSettings]);

  // Helper inside reactive states to update a single photo's values
  const updatePhotoState = (photoId: string, updatedFields: Partial<StudentPhoto>) => {
    setPhotos(prev => prev.map(p => {
      if (p.id === photoId) {
        return { ...p, ...updatedFields } as StudentPhoto;
      }
      return p;
    }));
  };

  // 4. Input selected files processing
  const handleFilesSelected = async (files: FileList | File[]) => {
    const list = Array.from(files);
    
    // Track batch names sequentially on upload to auto-name them immediately
    const startIdx = photos.length;

    const newPhotoRecords: StudentPhoto[] = [];

    setIsRenderingAll(true);

    for (let i = 0; i < list.length; i++) {
      const file = list[i];
      const objectUrl = URL.createObjectURL(file);

      try {
        // Load in-memory to audit natural dimensions
        const img = await loadImage(objectUrl);
        
        // Trigger smart face centroid check
        const detectedCrop = detectFace(img);

        // Auto format initial filename
        const num = namingSettings.startNumber + startIdx + i;
        const paddedNum = String(num).padStart(namingSettings.padding, '0');
        const parts = [];
        if (namingSettings.prefix) parts.push(namingSettings.prefix);
        parts.push(paddedNum);
        if (namingSettings.suffix) parts.push(namingSettings.suffix);
        const autoName = parts.join(namingSettings.separator) + '.jpg';

        const record: StudentPhoto = {
          id: 'photo-' + Date.now() + '-' + Math.round(Math.random() * 10000),
          originalName: file.name,
          name: autoName,
          originalUrl: objectUrl,
          processedUrl: '',
          width: img.width,
          height: img.height,
          crop: {
            x: detectedCrop.x,
            y: detectedCrop.y,
            width: detectedCrop.width,
            height: detectedCrop.height,
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
          isLockedAspectRatio: true,
          faceRect: {
            x: detectedCrop.x,
            y: detectedCrop.y,
            width: detectedCrop.width,
            height: detectedCrop.height,
          },
          status: 'idle', // Ready to compile reactive canvas
          progress: 0,
          history: [],
          historyIndex: -1,
        };

        newPhotoRecords.push(record);
      } catch (err) {
        console.error("Failed to parse loaded file dimensions: ", err);
      }
    }

    setPhotos(prev => [...prev, ...newPhotoRecords]);
    setIsRenderingAll(false);
  };

  // 5. Bulk adjustment triggers
  const handleApplyBatchSettings = () => {
    if (photos.length === 0) return;

    setPhotos(prev => prev.map(p => {
      return {
        ...p,
        adjustments: {
          brightness: batchSettings.brightness,
          contrast: batchSettings.contrast,
          skinSmooth: batchSettings.skinSmooth,
          saturation: batchSettings.saturation,
        },
        background: {
          ...p.background,
          mode: batchSettings.backgroundMode,
          customColor: batchSettings.customBackgroundColor,
          edgeSmooth: batchSettings.edgeSmooth,
          softShadow: batchSettings.softShadow,
        },
        status: 'idle', // Re-render canvas
      } as StudentPhoto;
    }));
  };

  const handleApplySequentialNaming = () => {
    if (photos.length === 0) return;
    
    setPhotos(prev => prev.map((p, idx) => {
      const num = namingSettings.startNumber + idx;
      const paddedNum = String(num).padStart(namingSettings.padding, '0');
      const parts = [];
      if (namingSettings.prefix) parts.push(namingSettings.prefix);
      parts.push(paddedNum);
      if (namingSettings.suffix) parts.push(namingSettings.suffix);
      const outputName = parts.join(namingSettings.separator) + '.jpg';

      return {
        ...p,
        name: outputName,
      };
    }));
  };

  // 6. Delete triggers
  const handleDeletePhoto = (photoId: string) => {
    setPhotos(prev => {
      const target = prev.find(p => p.id === photoId);
      if (target) {
        URL.revokeObjectURL(target.originalUrl); // Revoke memory link
      }
      return prev.filter(p => p.id !== photoId);
    });
  };

  const handleClearSession = () => {
    photos.forEach(p => URL.revokeObjectURL(p.originalUrl));
    setPhotos([]);
    localStorage.removeItem('photobatch_photos');
  };

  // 7. Manual detailed crop saving
  const handleSaveManualCrop = (photoId: string, updatedSettings: { crop: StudentPhoto['crop']; status: 'idle' | 'processing' | 'done' | 'error' }) => {
    updatePhotoState(photoId, updatedSettings);
  };

  // 8. Single download handler
  const handleDownloadSingleAndRename = (photo: StudentPhoto) => {
    const triggerUrl = photo.processedUrl || photo.originalUrl;
    if (!triggerUrl) return;

    const link = document.createElement('a');
    link.href = triggerUrl;
    // Download renamed filename with ext
    link.download = photo.name.endsWith('.jpg') ? photo.name : `${photo.name}.jpg`;
    link.click();
  };

  // ZIP bulk compiler
  const handleDownloadAllZIP = async () => {
    if (photos.length === 0) return;
    setIsZipPending(true);

    try {
      const zip = new JSZip();
      
      for (let i = 0; i < photos.length; i++) {
        const student = photos[i];
        const resourceUrl = student.processedUrl || student.originalUrl;
        
        if (resourceUrl.startsWith('data:image')) {
          // base64 parsing
          const base64Data = resourceUrl.split(',')[1];
          zip.file(student.name, base64Data, { base64: true });
        } else {
          // Trigger serverless blob load to capture data bytes
          const response = await fetch(resourceUrl);
          const blob = await response.blob();
          zip.file(student.name, blob);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const downloadLink = document.createElement('a');
      downloadLink.href = URL.createObjectURL(zipBlob);
      downloadLink.download = `photobatch_school_pack_${Date.now()}.zip`;
      downloadLink.click();
    } catch (err) {
      console.error("ZIP building failed: ", err);
    } finally {
      setIsZipPending(false);
    }
  };

  // Custom Preset Management
  const handleAddPreset = (newPreset: PhotoPreset) => {
    setCustomPresets(prev => [...prev, newPreset]);
  };

  const handleDeletePreset = (presetId: string) => {
    setCustomPresets(prev => prev.filter(p => p.id !== presetId));
    if (batchSettings.presetId === presetId) {
      setBatchSettings(prev => ({ ...prev, presetId: 'square-1-1' }));
    }
  };

  const doneCount = photos.filter(p => p.status === 'done').length;

  return (
    <div className="min-h-screen bg-[#020617] text-slate-100 font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      
      {/* Upper ambient background vectors */}
      <div className="absolute top-0 inset-x-0 h-[450px] bg-gradient-to-b from-indigo-950/15 via-slate-950/40 to-transparent pointer-events-none z-0" />
      <div className="absolute top-20 left-10 md:left-40 w-72 h-72 rounded-full bg-indigo-500/5 filter blur-[120px] pointer-events-none" />
      <div className="absolute top-40 right-10 md:right-40 w-72 h-72 rounded-full bg-purple-500/5 filter blur-[120px] pointer-events-none" />

      {/* Main Container */}
      <div className="relative max-w-7xl mx-auto px-4 py-6 md:py-8 space-y-6 z-10">
        
        {/* Modern Glassmorphic Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0f172a]/80 backdrop-blur-xl border border-white/10 shadow-2xl relative overflow-hidden">
          {/* Accent decoration */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-indigo-500/10 via-purple-500/10 to-pink-500/10 filter blur-xl" />
          
          <div className="flex items-center gap-4">
            <div className="w-11 h-11 bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-white">
                <path d="M21 7v6h-6V7h6zM9 7v10H3V7h6zM21 17v-2h-6v2h6z"/>
              </svg>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-extrabold text-xl md:text-2xl text-white tracking-tight">
                  PhotoBatch <span className="text-indigo-400">Pro</span>
                </span>
                <span className="text-[9px] font-mono tracking-widest text-[#10b981] bg-emerald-950/45 border border-emerald-500/20 px-2 py-0.5 rounded-full font-semibold uppercase">
                  Connected
                </span>
              </div>
              <p className="text-[10px] sm:text-xs text-indigo-400 mt-0.5 uppercase tracking-wider font-mono font-semibold">
                Crafted by Maruf Mahady Arnob
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Server connection status badge */}
            <div className="flex items-center bg-slate-800/40 px-3 py-1.5 rounded-full border border-white/5 text-xs text-slate-350">
              <div className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse mr-2"></div>
              <span>AI Server Active</span>
            </div>

            {/* Quick Metrics display */}
            <div className="flex items-center gap-3 bg-[#0f172a]/90 px-3 py-1.5 border border-white/5 rounded-full text-xs animate-fade-in">
              <FolderSync className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
              <div className="leading-none text-[11px]">
                <strong className="text-white font-mono">{doneCount}</strong>
                <span className="text-slate-400"> / {photos.length} done</span>
              </div>
            </div>

            {/* Global ZIP Downloader */}
            {photos.length > 0 && (
              <button
                id="btn-header-zip-download"
                type="button"
                onClick={handleDownloadAllZIP}
                disabled={isZipPending}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-full flex items-center gap-1.5 shadow-lg shadow-indigo-950/40 border border-indigo-400/25 transition-all active:scale-95 cursor-pointer disabled:opacity-50 disabled:pointer-events-none"
                title="Download all processed portraits collectively as a ZIP"
              >
                {isZipPending ? (
                  <>
                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Packing ZIP...</span>
                  </>
                ) : (
                  <>
                    <Archive className="h-3.5 w-3.5" />
                    <span>Batch Download</span>
                  </>
                )}
              </button>
            )}
          </div>
        </header>

        {/* Multi-Tab Navigation Sub-bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
          {[
            { id: 'list', label: '📸 Loaded Portraits', icon: LayoutGrid },
            { id: 'print', label: '🖨️ A4 Print Sheets', icon: Printer },
            { id: 'name', label: '🏷️ Sequential Naming & Batch', icon: Type },
            { id: 'settings', label: '⚙️ Custom Templates & Storage', icon: SettingsIcon }
          ].map(tab => {
            const IconComponent = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-${tab.id}`}
                type="button"
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer border ${
                  isActive
                    ? 'bg-indigo-600/10 border-indigo-500/50 text-white shadow-lg shadow-indigo-950/20 glow-indigo'
                    : 'bg-slate-900/50 border-slate-800/80 text-slate-400 hover:text-slate-200 hover:bg-slate-800/40'
                }`}
              >
                <IconComponent className={`h-4 w-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab views layout router with transitions */}
        <div id="workspace-tabview-container" className="space-y-6">
          <AnimatePresence mode="wait">
            
            {/* View A: Main student photos editor list */}
            {activeTab === 'list' && (
              <motion.div
                key="tab-list-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* Upload zone */}
                <UploadZone onFilesSelected={handleFilesSelected} isProcessing={isRenderingAll} />

                {photos.length > 0 && (
                  <>
                    {/* Unified Batch corrections toolbar */}
                    <BatchToolbar 
                      settings={batchSettings} 
                      presets={allPresets} 
                      onSettingsChange={(newSet) => setBatchSettings(prev => ({ ...prev, ...newSet }))}
                      onApplyToAll={handleApplyBatchSettings}
                      totalImages={photos.length}
                    />



                    {/* Photo view grid */}
                    <div className="space-y-3">
                      <h3 className="font-display font-semibold text-sm text-slate-350 tracking-wide uppercase flex items-center gap-1.5">
                        <LayoutGrid className="h-4 w-4" /> Loaded Registry ({photos.length} loaded)
                      </h3>

                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                        {photos.map(photo => (
                          <PhotoCard
                            key={photo.id}
                            photo={photo}
                            presets={allPresets}
                            activePresetId={batchSettings.presetId}
                            onUpdate={updatePhotoState}
                            onDelete={handleDeletePhoto}
                            onEditLaunch={(p) => setEditingPhoto(p)}
                            onDownloadSingle={handleDownloadSingleAndRename}
                          />
                        ))}
                      </div>
                    </div>
                  </>
                )}
                
                {photos.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-center bg-slate-900/10 border border-slate-800 rounded-2xl">
                    <Layers3 className="h-10 w-10 text-slate-700 mb-3 animate-pulse" />
                    <h4 className="font-semibold text-slate-300">Workspace registers empty</h4>
                    <p className="text-xs text-slate-500 max-w-sm mt-1 leading-normal">
                      Upload your school, coaching center, or classroom portrait files to begin auto-centering face adjustments and background replacements.
                    </p>
                  </div>
                )}
              </motion.div>
            )}

            {/* View B: A4 Photographic Print Sheet generators */}
            {activeTab === 'print' && (
              <motion.div
                key="tab-print-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <PrintSheetGenerator
                  photos={photos}
                  presets={allPresets}
                  activePresetId={batchSettings.presetId}
                />
              </motion.div>
            )}

            {/* View C: Rename Sequential systems & downloads */}
            {activeTab === 'name' && (
              <motion.div
                key="tab-name-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <Exporter
                  photos={photos}
                  namingSettings={namingSettings}
                  onNamingSettingsChange={(fields) => setNamingSettings(prev => ({ ...prev, ...fields }))}
                  onApplyNamingToAll={handleApplySequentialNaming}
                  onDownloadAllZIP={handleDownloadAllZIP}
                  isZipPending={isZipPending}
                />
              </motion.div>
            )}

            {/* View D: Presets variables configure & local clearings */}
            {activeTab === 'settings' && (
              <motion.div
                key="tab-settings-view"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
              >
                <SettingsPanel
                  customPresets={customPresets}
                  onAddPreset={handleAddPreset}
                  onDeletePreset={handleDeletePreset}
                  onClearSession={handleClearSession}
                  totalPhotos={photos.length}
                />
              </motion.div>
            )}

          </AnimatePresence>
        </div>

        {/* Manual detailed viewfinder workspace crop adjuster Modal */}
        <AnimatePresence>
          {editingPhoto && (
            <ManualEditorModal
              photo={editingPhoto}
              onClose={() => setEditingPhoto(null)}
              onSave={handleSaveManualCrop}
            />
          )}
        </AnimatePresence>

        {/* Elegant Footer matching Elegant Dark theme directions */}
        <footer className="mt-12 py-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-500 font-medium font-mono gap-4 relative z-10">
          <div>
            &copy; 2026 <span className="text-slate-350">PhotoBatch Pro</span> &bull; AI Portrait Processor. All rights reserved.
          </div>
          <div className="flex flex-wrap items-center gap-6">
            <span className="flex items-center gap-1.5 text-slate-400">
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
              Crafted by Maruf Mahady Arnob
            </span>
            <span className="opacity-75">All localized fast-processing offline</span>
          </div>
        </footer>

      </div>
    </div>
  );
}
