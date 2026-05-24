import React, { useRef, useState } from 'react';
import { Upload, FolderOpen, Image as ImageIcon, AlertCircle } from 'lucide-react';
import { motion } from 'motion/react';

interface UploadZoneProps {
  onFilesSelected: (files: FileList | File[]) => void;
  isProcessing: boolean;
}

export default function UploadZone({ onFilesSelected, isProcessing }: UploadZoneProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setIsDragActive(true);
    } else if (e.type === "dragleave") {
      setIsDragActive(false);
    }
  };

  const validateAndProcessFiles = (files: FileList | File[]) => {
    const list = Array.from(files);
    const validImageTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const validFiles = list.filter(file => validImageTypes.includes(file.type));

    if (validFiles.length === 0) {
      setErrorMsg("Please upload valid student images (JPEG, PNG or WEBP format only).");
      return;
    }

    setErrorMsg(null);
    onFilesSelected(validFiles);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndProcessFiles(e.dataTransfer.files);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndProcessFiles(e.target.files);
    }
  };

  const triggerFileSelect = () => {
    fileInputRef.current?.click();
  };

  const triggerFolderSelect = () => {
    folderInputRef.current?.click();
  };

  return (
    <div className="w-full">
      <motion.div
        id="uploader-container"
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        onDragEnter={handleDrag}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
        className={`relative overflow-hidden w-full rounded-2xl border-2 border-dashed transition-all duration-300 flex flex-col items-center justify-center p-8 md:p-12 text-center cursor-pointer ${
          isDragActive 
            ? 'border-indigo-500 bg-indigo-500/10 shadow-[0_0_25px_rgba(99,102,241,0.2)] scale-[0.99]' 
            : 'border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800/20'
        } glass-panel`}
        onClick={triggerFileSelect}
      >
        {/* Glow effect at background */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-80" />
        
        {/* Transparent inputs */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          multiple
          accept="image/jpeg,image/png,image/webp"
          onChange={onFileChange}
        />
        <input
          ref={folderInputRef}
          type="file"
          className="hidden"
          {...({ webkitdirectory: "", directory: "" } as any)}
          multiple
          onChange={onFileChange}
        />

        <div className="p-4 rounded-full bg-slate-800/85 mb-4 border border-slate-700/60 shadow-lg group-hover:scale-110 transition-transform duration-300">
          <Upload className={`h-8 w-8 ${isDragActive ? 'text-indigo-400 rotate-12' : 'text-slate-300'} transition-all`} />
        </div>

        <h3 className="font-display font-semibold text-lg md:text-xl text-white tracking-tight mb-2">
          Drag &amp; Drop Student Photos Here
        </h3>
        
        <p className="text-sm text-slate-400 max-w-md mb-6 leading-relaxed">
          Supports PNG, JPG, JPEG, and WEBP. You can also import folders directly for high-volume school classrooms.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3" onClick={(e) => e.stopPropagation()}>
          <button
            id="btn-upload-files"
            type="button"
            onClick={triggerFileSelect}
            className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white rounded-xl text-sm font-medium transition-all shadow-md active:scale-95 border border-indigo-400/20"
          >
            <ImageIcon className="h-4 w-4" />
            Select Files
          </button>
          
          <button
            id="btn-upload-folder"
            type="button"
            onClick={triggerFolderSelect}
            className="flex items-center gap-2 px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-all shadow-md border border-slate-700 active:scale-95"
            title="Import an entire directory of student pictures"
          >
            <FolderOpen className="h-4 w-4 text-amber-400" />
            Upload Folder
          </button>
        </div>

        {errorMsg && (
          <motion.div 
            initial={{ opacity: 0, y: 5 }} 
            animate={{ opacity: 1, y: 0 }}
            className="mt-4 flex items-center gap-2 text-rose-400 text-xs bg-rose-950/40 px-4 py-2 rounded-lg border border-rose-900/50"
          >
            <AlertCircle className="h-4 w-4 shrink-0" />
            {errorMsg}
          </motion.div>
        )}
      </motion.div>
    </div>
  );
}
