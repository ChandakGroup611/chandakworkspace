"use client";

import { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { AppButton } from "@/components/ui/AppButton";
import { toast } from 'react-toastify';
import { Paperclip, Trash2, Download, Plus, Loader2, FileText, CheckCircle2 } from "lucide-react";
import { AppTable, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";

interface Attachment {
  id: string;
  file_name: string;
  file_url: string;
  file_type: string;
  uploaded_at: string;
  uploaded_by: string;
  user_master?: {
    full_name: string;
  };
}

export function AMCAttachmentsTab({ amcId, isLightMode }: { amcId: string, isLightMode: boolean }) {
  const supabase = createClient();
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [fileType, setFileType] = useState("MSA");
  const [fileToUpload, setFileToUpload] = useState<File | null>(null);

  useEffect(() => {
    fetchAttachments();
  }, [amcId]);

  const fetchAttachments = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("amc_attachments")
        .select(`
          *,
          user_master:uploaded_by(full_name)
        `)
        .eq("amc_id", amcId)
        .order("uploaded_at", { ascending: false });

      if (error) throw error;
      setAttachments(data || []);
    } catch (err: any) {
      toast.error("Failed to fetch attachments: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFileToUpload(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!fileToUpload) {
      toast.error("Please select a file to upload.");
      return;
    }

    setUploading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const safeName = fileToUpload.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const filePath = `${amcId}/${Date.now()}_${safeName}`;

      // Upload to Storage
      const { error: storageError } = await supabase.storage
        .from("amc-attachments")
        .upload(filePath, fileToUpload);

      if (storageError) throw storageError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("amc-attachments")
        .getPublicUrl(filePath);

      // Save to database
      const { error: dbError } = await supabase.from("amc_attachments").insert([{
        amc_id: amcId,
        file_name: fileToUpload.name,
        file_url: publicUrl,
        file_type: fileType,
        uploaded_by: user.id
      }]);

      if (dbError) throw dbError;

      toast.success("File uploaded successfully");
      setFileToUpload(null);
      setFileType("MSA");
      
      // Clear file input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
      
      fetchAttachments();
    } catch (err: any) {
      toast.error("Upload failed: " + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, fileUrl: string) => {
    if (!confirm("Are you sure you want to delete this attachment?")) return;
    
    try {
      // Delete from DB
      const { error: dbError } = await supabase.from("amc_attachments").delete().eq("id", id);
      if (dbError) throw dbError;

      toast.success("Attachment deleted");
      fetchAttachments();
      
      // Note: In a robust production environment, you might also want to delete from storage, 
      // but deleting from DB is sufficient for removing it from the UI.
    } catch (err: any) {
      toast.error("Delete failed: " + err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row gap-6">
        {/* Upload Form */}
        <div className="w-full md:w-1/3 p-5 rounded-2xl border bg-surface/50 border-border">
          <h3 className="font-bold text-foreground mb-4 flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-theme-icon" />
            Upload Document
          </h3>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase">Document Type</label>
              <select 
                value={fileType}
                onChange={(e) => setFileType(e.target.value)}
                className="w-full h-10 px-3 rounded-lg text-sm bg-elevated border border-border text-foreground focus:outline-none focus:border-theme-btn-primary"
              >
                <option value="MSA">Master Service Agreement (MSA)</option>
                <option value="NDA">Non-Disclosure Agreement (NDA)</option>
                <option value="DPA">Data Processing Agreement (DPA)</option>
                <option value="Invoice">Invoice / PO</option>
                <option value="SOW">Statement of Work (SOW)</option>
                <option value="Other">Other</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-muted uppercase">Select File</label>
              <input 
                id="file-upload"
                type="file" 
                onChange={handleFileChange}
                className="w-full text-sm text-foreground file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-theme-btn-primary/10 file:text-theme-btn-primary hover:file:bg-theme-btn-primary/20"
              />
            </div>
            
            <AppButton 
              onClick={handleUpload} 
              disabled={!fileToUpload || uploading}
              className="w-full justify-center mt-2"
              leftIcon={uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            >
              {uploading ? "Uploading..." : "Upload Document"}
            </AppButton>
          </div>
        </div>

        {/* Attachments List */}
        <div className="w-full md:w-2/3 border border-border rounded-2xl overflow-hidden bg-surface">
          <AppTable className="w-full text-left border-collapse text-sm">
            <AppTableHeader className="bg-surface/50">
              <AppTableRow>
                <AppTableHead className="p-3 font-medium text-muted">File Name</AppTableHead>
                <AppTableHead className="p-3 font-medium text-muted">Type</AppTableHead>
                <AppTableHead className="p-3 font-medium text-muted">Uploaded By</AppTableHead>
                <AppTableHead className="p-3 font-medium text-muted">Date</AppTableHead>
                <AppTableHead className="p-3 font-medium text-muted text-right">Actions</AppTableHead>
              </AppTableRow>
            </AppTableHeader>
            <AppTableBody>
              {loading ? (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="p-8 text-center text-muted">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-theme-icon" />
                  </AppTableCell>
                </AppTableRow>
              ) : attachments.length === 0 ? (
                <AppTableRow>
                  <AppTableCell colSpan={5} className="p-8 text-center text-muted">
                    <FileText className="h-10 w-10 mx-auto opacity-20 mb-2" />
                    No documents attached yet.
                  </AppTableCell>
                </AppTableRow>
              ) : (
                attachments.map((file) => (
                  <AppTableRow key={file.id} className="border-t border-border hover:bg-elevated/50 transition-colors">
                    <AppTableCell className="p-3 font-medium">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-theme-icon/70 shrink-0" />
                        <span className="truncate max-w-[200px] block" title={file.file_name}>{file.file_name}</span>
                      </div>
                    </AppTableCell>
                    <AppTableCell className="p-3 text-xs">
                      <span className="px-2 py-1 rounded bg-surface/50 border border-border">
                        {file.file_type}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="p-3 text-muted text-xs">
                      {file.user_master?.full_name || 'System'}
                    </AppTableCell>
                    <AppTableCell className="p-3 text-muted text-xs whitespace-nowrap">
                      {new Date(file.uploaded_at).toLocaleDateString()}
                    </AppTableCell>
                    <AppTableCell className="p-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => window.open(file.file_url, '_blank')}
                          title="Download/View"
                        >
                          <Download className="h-4 w-4" />
                        </AppButton>
                        <AppButton 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => handleDelete(file.id, file.file_url)}
                          className="text-danger hover:text-danger hover:bg-danger/10"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </AppButton>
                      </div>
                    </AppTableCell>
                  </AppTableRow>
                ))
              )}
            </AppTableBody>
          </AppTable>
        </div>
      </div>
    </div>
  );
}
