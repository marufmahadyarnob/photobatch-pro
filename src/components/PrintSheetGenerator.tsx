import React, { useState, useEffect } from 'react';
import { Printer, Grid, RefreshCw, FileText, Download, Check, Settings, Scissors } from 'lucide-react';
import { StudentPhoto, PhotoPreset, PrintLayoutSettings } from '../types';
import { convertToPixels, formatDimensions } from '../utils/presets';
import { jsPDF } from 'jspdf';
import { motion } from 'motion/react';

interface PrintSheetGeneratorProps {
  photos: StudentPhoto[];
  presets: PhotoPreset[];
  activePresetId: string;
}

export default function PrintSheetGenerator({ photos, presets, activePresetId }: PrintSheetGeneratorProps) {
  const currentPreset = presets.find(p => p.id === activePresetId) || presets[0];

  // Printable sheet setup state
  const [pageSize, setPageSize] = useState<'A4' | 'Letter'>('A4');
  const [orientation, setOrientation] = useState<'portrait' | 'landscape'>('portrait');
  const [columns, setColumns] = useState(6);
  const [rows, setRows] = useState(6);
  const [spacing, setSpacing] = useState(4); // mm margin spacing
  const [showCutLines, setShowCutLines] = useState(true);
  const [showBorder, setShowBorder] = useState(true);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  // Auto layout recommendation depending on the active preset
  useEffect(() => {
    if (currentPreset.id === 'us-passport') {
      // 2x2 inches standard
      setColumns(4);
      setRows(4);
      setSpacing(5);
    } else if (currentPreset.id === 'schengen-passport' || currentPreset.id === 'indian-passport') {
      // 35x45 mm size
      setColumns(5);
      setRows(6);
      setSpacing(4);
    } else if (currentPreset.id === 'stamp-size') {
      setColumns(8);
      setRows(10);
      setSpacing(3);
    } else {
      setColumns(4);
      setRows(4);
      setSpacing(4);
    }
  }, [currentPreset]);

  // Compute calculated values
  const totalSlots = columns * rows;
  const loadedPhotosCount = photos.filter(p => p.status === 'done').length;

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    if (loadedPhotosCount === 0) return;
    setIsExportingPdf(true);

    try {
      // Dimensions in mm
      // A4 portrait is 210 x 297 mm
      // Letter portrait is 215.9 x 279.4 mm
      const pw = pageSize === 'A4' ? 210 : 215.9;
      const ph = pageSize === 'A4' ? 297 : 279.4;

      const docW = orientation === 'portrait' ? pw : ph;
      const docH = orientation === 'portrait' ? ph : pw;

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: pageSize.toLowerCase()
      });

      // Layout maths
      // Let's compute individual passport portrait specs
      let itemW = 35; // default mm
      let itemH = 45; // default mm

      if (currentPreset.unit === 'mm') {
        itemW = currentPreset.width;
        itemH = currentPreset.height;
      } else if (currentPreset.unit === 'inch') {
        itemW = currentPreset.width * 25.4;
        itemH = currentPreset.height * 25.4;
      } else if (currentPreset.unit === 'px') {
        // approximate px at 300dpi: 1inch = 25.4mm = 300px
        itemW = (currentPreset.width / 300) * 25.4;
        itemH = (currentPreset.height / 300) * 25.4;
      } else {
        // ratios fallback
        itemW = 35;
        itemH = 35 / currentPreset.aspectRatio;
      }

      // Check grid margins
      const gridTotalW = (columns * itemW) + ((columns - 1) * spacing);
      const gridTotalH = (rows * itemH) + ((rows - 1) * spacing);

      // Centered alignment offset
      const startX = (docW - gridTotalW) / 2;
      const startY = (docH - gridTotalH) / 2;

      // Filter only finished photos
      const activePhotos = photos.filter(p => p.status === 'done');

      let photoIndex = 0;

      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < columns; c++) {
          if (photoIndex >= activePhotos.length) break;

          const student = activePhotos[photoIndex];
          const x = startX + (c * (itemW + spacing));
          const y = startY + (r * (itemH + spacing));

          // Draw passport outline border if enabled
          if (showBorder) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.15);
            pdf.rect(x, y, itemW, itemH);
          }

          // Add little grey dashed scissor cut tick markers if enabled
          if (showCutLines) {
            pdf.setDrawColor(180, 180, 180);
            pdf.setLineWidth(0.1);
            // vertical tick
            pdf.line(x - 1, y, x - 3, y);
            pdf.line(x + itemW + 1, y, x + itemW + 3, y);
            // horizontal tick
            pdf.line(x, y - 1, x, y - 3);
            pdf.line(x, y + itemH + 1, x, y + itemH + 3);
          }

          // Fetch visual content and draw base64 jpeg
          try {
            pdf.addImage(student.processedUrl, 'JPEG', x, y, itemW, itemH);
          } catch (err) {
            console.error('Pdf render image error: ', err);
          }

          photoIndex++;
        }
      }

      pdf.save(`photobatch_print_sheet_${pageSize.toLowerCase()}.pdf`);
    } catch (error) {
      console.error(error);
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Build grid preview array based on grid columns and rows
  const gridCells = [];
  const activePhotos = photos.filter(p => p.status === 'done');
  for (let i = 0; i < totalSlots; i++) {
    gridCells.push(activePhotos[i % activePhotos.length] || null);
  }

  return (
    <div className="w-full glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
      
      {/* Header Info */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Printer className="h-5 w-5 text-indigo-400" />
            <h2 className="font-display font-bold text-lg text-white">Interactive Print Sheet Generator</h2>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build high-density grids to print directly on <strong className="text-slate-200">A4 or Letter photographic sheets</strong>. Reduces photo paper waist.
          </p>
        </div>

        <div className="flex items-center gap-2 self-end md:self-auto">
          <button
            id="btn-trigger-pdf"
            type="button"
            disabled={loadedPhotosCount === 0 || isExportingPdf}
            onClick={handleDownloadPDF}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white rounded-xl font-semibold transition-all active:scale-95 shadow-md shadow-indigo-950/20 cursor-pointer"
          >
            {isExportingPdf ? (
              <>
                <div className="h-3 w-3 border border-white border-t-transparent animate-spin rounded-full" />
                Dumping PDF...
              </>
            ) : (
              <>
                <FileText className="h-3.5 w-3.5" />
                Download Print PDF
              </>
            )}
          </button>

          <button
            id="btn-print-native"
            type="button"
            disabled={loadedPhotosCount === 0}
            onClick={handlePrint}
            className="flex items-center gap-1.5 px-4 py-2 text-xs bg-slate-800 hover:bg-slate-705 border border-slate-700 disabled:opacity-40 text-slate-200 rounded-xl font-medium transition-all cursor-pointer active:scale-95"
          >
            <Printer className="h-3.5 w-3.5 text-slate-350" />
            System Print
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Left column: Layout controllers */}
        <div className="lg:col-span-4 space-y-5 bg-slate-900/35 p-5 rounded-2xl border border-slate-800">
          <h3 className="text-xs font-display font-bold uppercase tracking-widest text-indigo-400 flex items-center gap-1.5 border-b border-slate-800 pb-2">
            <Settings className="h-3.5 w-3.5" /> Grid Print Specs
          </h3>

          {/* Paper Type Toggle */}
          <div className="space-y-1.5 text-xs">
            <span className="font-medium text-slate-300 block">Print Media Dimensions:</span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setPageSize('A4')}
                className={`py-1.5 rounded-lg border text-xs cursor-pointer ${
                  pageSize === 'A4'
                    ? 'bg-indigo-600/10 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                A4 Cover (210x297mm)
              </button>
              <button
                type="button"
                onClick={() => setPageSize('Letter')}
                className={`py-1.5 rounded-lg border text-xs cursor-pointer ${
                  pageSize === 'Letter'
                    ? 'bg-indigo-600/10 border-indigo-500 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-300'
                }`}
              >
                Letter Cover (8.5x11")
              </button>
            </div>
          </div>

          {/* Grid Layout Toggles */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <label htmlFor="input-columns" className="text-[11px] text-slate-400">Grid Columns</label>
              <input
                id="input-columns"
                type="number"
                min="1"
                max="10"
                value={columns}
                onChange={(e) => setColumns(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="input-rows" className="text-[11px] text-slate-400">Grid Rows</label>
              <input
                id="input-rows"
                type="number"
                min="1"
                max="12"
                value={rows}
                onChange={(e) => setRows(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-white"
              />
            </div>
          </div>

          {/* Spacing gap slider */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span>Photo Spacing (Gap)</span>
              <span className="font-mono text-indigo-300">{spacing} mm</span>
            </div>
            <input
              id="spacing-slider"
              type="range"
              min="0"
              max="15"
              value={spacing}
              onChange={(e) => setSpacing(parseInt(e.target.value))}
              className="w-full h-1 bg-slate-800 rounded accent-indigo-500 cursor-pointer"
            />
          </div>

          {/* Toggles */}
          <div className="space-y-2.5 pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-300 flex items-center gap-1.5">
                <Scissors className="h-3.5 w-3.5 text-slate-400" /> Print trimming guidelines
              </span>
              <input
                id="chk-cutlines"
                type="checkbox"
                checked={showCutLines}
                onChange={(e) => setShowCutLines(e.target.checked)}
                className="h-4 w-4 rounded border-slate-850 accent-indigo-500 bg-slate-950"
              />
            </div>

            <div className="flex items-center justify-between">
              <span className="text-slate-300">Framing pixel border outline</span>
              <input
                id="chk-borders"
                type="checkbox"
                checked={showBorder}
                onChange={(e) => setShowBorder(e.target.checked)}
                className="h-4 w-4 rounded border-slate-850 accent-indigo-500 bg-slate-950"
              />
            </div>
          </div>

          {/* Stats read-only briefing panel */}
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Single portrait target:</span>
              <strong className="text-slate-200">{currentPreset.name}</strong>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Paper capacity:</span>
              <span className="text-slate-200 font-bold">{totalSlots} printouts</span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>Loaded student photos:</span>
              <span className="text-indigo-400 font-bold">{loadedPhotosCount} ready</span>
            </div>
          </div>
        </div>

        {/* Right column: Interactive paper mockup view */}
        <div className="lg:col-span-8 flex flex-col items-center justify-center p-3 bg-slate-950/80 border border-slate-800/80 rounded-2xl relative overflow-hidden">
          <div className="text-[10px] uppercase font-mono tracking-widest text-slate-500 mb-4 font-bold flex items-center gap-1">
            <Grid className="h-3 w-3" /> Live preview mockup (300 DPI Canvas scaled down)
          </div>

          {loadedPhotosCount === 0 ? (
            <div className="w-[180px] h-[254px] md:w-[240px] md:h-[340px] flex flex-col items-center justify-center text-center p-6 border-2 border-dashed border-slate-800 rounded bg-slate-900/10">
              <Printer className="h-8 w-8 text-slate-600 mb-2 animate-bounce" />
              <span className="text-xs font-semibold text-slate-400">No photos processed</span>
              <p className="text-[10px] text-slate-500 mt-1">Upload and auto-adjust photos to populate grid sheets.</p>
            </div>
          ) : (
            /* Scaled-down paper bounding ratio */
            <div 
              className="relative w-[280px] h-[396px] md:w-[320px] md:h-[452px] bg-white text-slate-900 p-3 shadow-2xl transition-all overflow-hidden flex flex-col justify-center items-center rounded-sm"
              style={{
                borderRadius: '2px',
                border: '1px solid #ddd',
              }}
            >
              {/* Render cells */}
              <div 
                className="grid gap-1 w-full h-full max-w-full max-h-full p-2 place-content-center justify-items-center justify-center items-center"
                style={{
                  gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
                  gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                  gap: `${spacing / 2.5}px`
                }}
              >
                {gridCells.map((student, idx) => (
                  <div
                    key={`sheet-cell-${idx}`}
                    className="relative aspect-square bg-slate-100 border border-slate-300 overflow-hidden shadow-[0_1px_3px_rgba(0,0,0,0.08)] flex items-center justify-center"
                    style={{
                      borderWidth: showBorder ? '1px' : '0px',
                      borderColor: '#d1d5db',
                      aspectRatio: `${currentPreset.aspectRatio}`
                    }}
                  >
                    {student ? (
                      <img
                        src={student.processedUrl}
                        alt="Thumbnail"
                        className="w-full h-full object-cover"
                        referrerPolicy="no-referrer"
                      />
                    ) : (
                      <div className="text-[8px] text-slate-350 select-none font-bold">Empty</div>
                    )}

                    {showCutLines && (
                      <div className="absolute inset-0 border border-dashed border-red-500/20 pointer-events-none" />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {loadedPhotosCount > 0 && (
            <span className="text-[10px] text-slate-400 mt-4 text-center">
              The layout loops available portraits to fully pack the sheet of size {pageSize}.
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
