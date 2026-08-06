"use client";

import React, { useState, useRef, useEffect } from "react";
import { AppButton } from '@/components/ui/AppButton';
import { UploadCloud, X, File, FileText, FileArchive, Image as ImageIcon, Loader2, CheckCircle2, AlertCircle, Eye, Download, FileSpreadsheet } from "lucide-react";
import { initializeAttachmentUpload, fetchAttachments } from "@/lib/actions/attachments";
import { createClient } from "@/utils/supabase/client";

interface EnterpriseUploaderProps {
  moduleType: 'ticket' | 'chat' | 'resolution' | 'requirement' | 'task';
  recordId: string;
  onUploadComplete?: () => void;
  isLightMode?: boolean;
}

interface UploadQueueItem {
  id: string;
  file: File;
  status: 'pending' | 'uploading' | 'success' | 'error';
  progress: number;
  errorMsg?: string;
}

export function EnterpriseUploader({ moduleType, recordId, onUploadComplete, isLightMode = false }: EnterpriseUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadQueueItem[]>([]);
  const [existingAttachments, setExistingAttachments] = useState<any[]>([]);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadExisting = async () => {
    if (!recordId) return;
    setLoadingExisting(true);
    try {
      const atts = await fetchAttachments(moduleType, recordId);
      setExistingAttachments(atts || []);
    } catch (e) {
      console.error("Failed to load attachments:", e);
    } finally {
      setLoadingExisting(false);
    }
  };

  useEffect(() => {
    loadExisting();
  }, [moduleType, recordId]);

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
      addAndUploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addAndUploadFiles(Array.from(e.target.files));
      e.target.value = ''; // Reset input to allow re-selecting same file
    }
  };

  const addAndUploadFiles = async (newFiles: File[]) => {
    const safeFiles = newFiles.filter(f => {
      const ext = f.name.split('.').pop()?.toLowerCase();
      return !['exe', 'bat', 'cmd', 'sh', 'js', 'vbs', 'scr', 'msi', 'dll', 'com'].includes(ext || '');
    });
    
    if (safeFiles.length < newFiles.length) {
      alert("Some files were rejected because executable scripts are not permitted.");
    }

    if (safeFiles.length === 0) return;

    const newQueueItems: UploadQueueItem[] = safeFiles.map(f => ({
      id: `${Date.now()}_${Math.random().toString(36).substring(2, 7)}_${f.name}`,
      file: f,
      status: 'pending',
      progress: 0
    }));

    setFiles(prev => [...prev, ...newQueueItems]);

    // Automatically trigger upload for these newly queued items
    for (const item of newQueueItems) {
      await processSingleUpload(item);
    }

    loadExisting();
    if (onUploadComplete) onUploadComplete();
  };

  const processSingleUpload = async (item: UploadQueueItem) => {
    const supabase = createClient();

    setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'uploading', progress: 20 } : f));

    try {
      const file = item.file;
      const uploadRes = await initializeAttachmentUpload({
        module_type: moduleType,
        record_id: recordId,
        file_name: file.name,
        mime_type: file.type || 'application/octet-stream',
        file_size: file.size
      });

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, progress: 60 } : f));

      const bucketName = moduleType === 'chat' ? 'chat-attachments' 
                       : moduleType === 'resolution' ? 'resolution-files' 
                       : moduleType === 'requirement' ? 'requirement-files'
                       : 'ticket-attachments';

      const { error } = await supabase.storage
        .from(bucketName)
        .uploadToSignedUrl(uploadRes.path, uploadRes.token, file);

      if (error) throw new Error(error.message);

      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'success', progress: 100 } : f));
    } catch (err: any) {
      console.error("Upload error:", err);
      setFiles(prev => prev.map(f => f.id === item.id ? { ...f, status: 'error', errorMsg: err.message || "Upload failed." } : f));
    }
  };

  const retryUpload = async (item: UploadQueueItem) => {
    await processSingleUpload(item);
    loadExisting();
    if (onUploadComplete) onUploadComplete();
  };

  const removeFile = (id: string) => {
    setFiles(prev => prev.filter(f => f.id !== id));
  };

  const getFileIcon = (mime: string, fileName: string = '') => {
    const ext = fileName.split('.').pop()?.toLowerCase() || '';
    if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg'].includes(ext)) {
      return <ImageIcon className="h-4 w-4 text-emerald-500 shrink-0" />;
    }
    if (mime.includes('pdf') || ext === 'pdf') {
      return <FileText className="h-4 w-4 text-rose-500 shrink-0" />;
    }
    if (mime.includes('sheet') || mime.includes('excel') || ['xls', 'xlsx', 'csv'].includes(ext)) {
      return <FileSpreadsheet className="h-4 w-4 text-emerald-600 shrink-0" />;
    }
    if (mime.includes('word') || ['doc', 'docx'].includes(ext)) {
      return <FileText className="h-4 w-4 text-blue-500 shrink-0" />;
    }
    if (mime.includes('zip') || mime.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) {
      return <FileArchive className="h-4 w-4 text-amber-500 shrink-0" />;
    }
    return <File className="h-4 w-4 text-muted shrink-0" />;
  };

  return (
    <div className="w-full space-y-4">
      {/* Dropzone */}
      <div 
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
          isDragging 
            ? "border-accent bg-accent/10 scale-[0.99]" 
            : "border-border hover:border-accent bg-elevated/40 hover:bg-elevated/80"
        }`}
      >
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          className="hidden" 
          onChange={handleFileSelect} 
        />
        <div className={`p-3 rounded-2xl mb-2 bg-surface shadow-xs text-accent`}>
          <UploadCloud className="h-6 w-6" />
        </div>
        <h4 className="text-xs font-bold mb-1 text-foreground">
          Click or drag files here to upload
        </h4>
        <p className="text-[11px] text-muted">
          Supports Word, Excel, PDF, Images, Text & Archives (up to 100MB)
        </p>
      </div>

      {/* Live Uploading / Queued Files */}
      {files.length > 0 && (
        <div className="space-y-2">
          {files.map((fileObj) => (
            <div key={fileObj.id} className="flex items-center gap-3 p-3 rounded-xl theme-card-structural border border-border/50">
              <div className="flex-shrink-0">
                {getFileIcon(fileObj.file.type, fileObj.file.name)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold truncate text-foreground">
                  {fileObj.file.name}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[11px] text-muted">
                    {(fileObj.file.size / (1024 * 1024)).toFixed(2)} MB
                  </span>
                  {fileObj.status === 'uploading' && (
                    <span className="text-[11px] text-accent flex items-center gap-1 font-medium">
                      <Loader2 className="h-3 w-3 animate-spin" /> Uploading...
                    </span>
                  )}
                  {fileObj.status === 'error' && (
                    <span className="text-[11px] text-red-500 flex items-center gap-1 font-medium">
                      <AlertCircle className="h-3 w-3" /> {fileObj.errorMsg}
                    </span>
                  )}
                  {fileObj.status === 'success' && (
                    <span className="text-[11px] text-emerald-500 flex items-center gap-1 font-medium">
                      <CheckCircle2 className="h-3 w-3" /> Uploaded successfully
                    </span>
                  )}
                </div>
                {/* Progress bar */}
                {fileObj.status === 'uploading' && (
                  <div className="w-full h-1 bg-surface rounded-full mt-1.5 overflow-hidden">
                    <div className="h-full bg-accent transition-all duration-300" style={{ width: `${fileObj.progress}%` }} />
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-1">
                {fileObj.status === 'error' && (
                  <AppButton 
                    variant="ghost"
                    size="sm"
                    onClick={() => retryUpload(fileObj)}
                    className="text-xs text-accent hover:underline px-2"
                  >
                    Retry
                  </AppButton>
                )}
                {fileObj.status !== 'uploading' && (
                  <AppButton 
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(fileObj.id)}
                    className="p-1.5 rounded-lg text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <X className="h-3.5 w-3.5" />
                  </AppButton>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Existing Attachments Listing */}
      <div className="space-y-2 pt-2 border-t border-border/50">
        <div className="flex items-center justify-between">
          <h5 className="text-[11px] font-bold text-muted uppercase tracking-wider">
            Attachments {existingAttachments.length > 0 ? `(${existingAttachments.length})` : ''}
          </h5>
          {loadingExisting && <Loader2 className="h-3 w-3 animate-spin text-muted" />}
        </div>

        {existingAttachments.length === 0 && !loadingExisting ? (
          <p className="text-xs text-muted/70 italic py-2">No attachments uploaded yet.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {existingAttachments.map((att) => {
              const fileName = att.original_file_name || att.file_name;
              const viewUrl = `/api/proxy-attachment/${att.id}`;
              const downloadUrl = `/api/proxy-attachment/${att.id}?download=1`;
              return (
                <div key={att.id} className="flex items-center justify-between p-2.5 rounded-xl theme-card-structural border border-border/50 text-xs hover:border-accent/40 transition-all">
                  <div className="flex items-center gap-2 min-w-0 pr-2">
                    {getFileIcon(att.mime_type || '', fileName)}
                    <span className="truncate font-medium text-foreground text-xs" title={fileName}>{fileName}</span>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <a 
                      href={viewUrl} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="px-2 py-1 rounded-lg text-blue-500 hover:bg-blue-500/10 transition-colors flex items-center gap-1" 
                      title="View Attachment"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">View</span>
                    </a>
                    <a 
                      href={downloadUrl} 
                      download={fileName} 
                      className="px-2 py-1 rounded-lg text-accent hover:bg-accent/10 transition-colors flex items-center gap-1" 
                      title="Download Attachment"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="text-[10px] font-bold">Download</span>
                    </a>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
