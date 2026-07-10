"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, X, File, FileText, FileArchive, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { initializeAttachmentUpload } from "@/lib/actions/attachments";
import { createClient } from "@/utils/supabase/client";

interface EnterpriseUploaderProps {
  moduleType: 'ticket' | 'chat' | 'resolution' | 'requirement';
  recordId: string;
  onUploadComplete?: () => void;
  isLightMode?: boolean;
}

export function EnterpriseUploader({ moduleType, recordId, onUploadComplete, isLightMode = false }: EnterpriseUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<{ file: File; status: 'pending' | 'uploading' | 'success' | 'error'; progress: number; errorMsg?: string }[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    const safeFiles = newFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return !['exe', 'bat', 'cmd', 'sh', 'js', 'vbs'].includes(ext || '');
    });
    
    if (safeFiles.length < newFiles.length) {
      alert("Some files were rejected because they are not permitted (e.g. executable scripts).");
    }

    const fileStates = safeFiles.map(f => ({ file: f, status: 'pending' as const, progress: 0 }));
    setFiles(prev => [...prev, ...fileStates]);
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const startUploads = async () => {
    const supabase = createClient();

    for (let i = 0; i < files.length; i++) {
      if (files[i].status === 'success') continue;
      
      setFiles(prev => {
        const updated = [...prev];
        updated[i].status = 'uploading';
        return updated;
      });

      try {
        const file = files[i].file;
        const uploadRes = await initializeAttachmentUpload({
          module_type: moduleType,
          record_id: recordId,
          file_name: file.name,
          mime_type: file.type || 'application/octet-stream',
          file_size: file.size
        });

        // Simulating upload progress
        setFiles(prev => {
          const updated = [...prev];
          updated[i].progress = 50;
          return updated;
        });

        const bucketName = moduleType === 'chat' ? 'chat-attachments' 
                         : moduleType === 'resolution' ? 'resolution-files' 
                         : moduleType === 'requirement' ? 'requirement-files'
                         : 'ticket-attachments';

        const { error } = await supabase.storage
          .from(bucketName)
          .uploadToSignedUrl(uploadRes.path, uploadRes.token, file);

        if (error) throw new Error(error.message);

        setFiles(prev => {
          const updated = [...prev];
          updated[i].status = 'success';
          updated[i].progress = 100;
          return updated;
        });

      } catch (err: any) {
        setFiles(prev => {
          const updated = [...prev];
          updated[i].status = 'error';
          updated[i].errorMsg = err.message || "Upload failed.";
          return updated;
        });
      }
    }
    
    if (onUploadComplete) onUploadComplete();
  };

  const getFileIcon = (mime: string) => {
    if (mime.startsWith('image/')) return <ImageIcon className="h-5 w-5 text-accent" />;
    if (mime.includes('pdf')) return <FileText className="h-5 w-5 text-red-500" />;
    if (mime.includes('zip') || mime.includes('compressed')) return <FileArchive className="h-5 w-5 text-yellow-500" />;
    return <File className="h-5 w-5 text-gray-500" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging 
            ? isLightMode ? "border-accent bg-accent/10" : "border-accent bg-accent/10"
            : isLightMode ? "border-gray-300 hover:border-accent bg-gray-50" : "border-white/10 hover:border-white/30 bg-white/5"
        }`}
      >
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        <div className={`p-3 rounded-xl mb-3 ${isLightMode ? "bg-white shadow-sm" : "bg-white/10"}`}>
          <UploadCloud className={`h-6 w-6 ${isLightMode ? "text-accent" : "text-gray-300"}`} />
        </div>
        <h4 className={`text-sm font-bold mb-1 ${"text-foreground"}`}>
          Click or drag files to upload
        </h4>
        <p className={`text-xs ${"text-muted"}`}>
          Max 50MB per file. Prohibited: .exe, .bat, .cmd, .sh
        </p>
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileObj, index) => (
            <div key={index} className={`flex items-center gap-3 p-3 rounded-xl border ${
              "bg-surface border-border"
            }`}>
              <div className="flex-shrink-0">
                {getFileIcon(fileObj.file.type)}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-semibold truncate ${"text-foreground"}`}>
                  {fileObj.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-xs ${"text-muted"}`}>
                    {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  {fileObj.status === 'error' && (
                    <span className="text-xs text-red-500 flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" /> {fileObj.errorMsg}
                    </span>
                  )}
                  {fileObj.status === 'success' && (
                    <span className="text-xs text-green-500 flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Uploaded
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {fileObj.status === 'uploading' && (
                  <div className="w-full h-1 bg-gray-200 rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${fileObj.progress}%` }} />
                  </div>
                )}
              </div>
              
              <div className="flex items-center">
                {fileObj.status === 'uploading' ? (
                  <Loader2 className="h-4 w-4 animate-spin text-accent" />
                ) : (
                  <button 
                    onClick={() => removeFile(index)}
                    className={`p-1.5 rounded-lg hover:bg-red-500/10 text-red-500 transition-colors`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          ))}
          
          <div className="flex justify-end pt-2">
            <button 
              onClick={startUploads}
              disabled={files.every(f => f.status === 'success') || files.some(f => f.status === 'uploading')}
              className="px-4 py-2 text-xs font-semibold rounded-xl bg-accent text-white hover:bg-accent-secondary disabled:opacity-50 transition-all"
            >
              Upload Pending Files
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
