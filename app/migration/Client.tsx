"use client";

import React, { useState, useEffect } from 'react';
import { Database, Download, FileSpreadsheet, Settings, Upload, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { AppButton } from '@/components/ui/AppButton';
import { fetchWorkspaceStakeholders } from '@/lib/actions/workspaces';
import { fetchMigrationMetadata } from '@/lib/actions/migration';
import * as ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { useRouter } from 'next/navigation';

export default function MigrationClient() {
  const router = useRouter();
  const [selectedModule, setSelectedModule] = useState('TASK');
  const [workspaces, setWorkspaces] = useState<any[]>([]);
  const [targetWorkspaceId, setTargetWorkspaceId] = useState('');
  const [targetSubworkspaceId, setTargetSubworkspaceId] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<{ success: boolean; message: string } | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (selectedModule === 'TASK' && !targetWorkspaceId) {
      alert('Please select a Target Workspace before uploading tasks.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    setIsUploading(true);
    setUploadResult(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('moduleType', selectedModule);
    formData.append('targetWorkspaceId', targetWorkspaceId);
    formData.append('targetSubworkspaceId', targetSubworkspaceId);

    try {
      const res = await fetch('/api/migration/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Upload failed');
      
      setUploadResult({ success: true, message: data.message || `Successfully processed ${data.rowsProcessed || 0} rows. Redirecting...` });
      
      setTimeout(() => {
        if (selectedModule === 'TASK' && targetWorkspaceId) {
          router.push(`/workspaces/tasks?workspaceId=${targetWorkspaceId}`);
        } else if (selectedModule === 'WORKSPACE') {
          router.push(`/workspaces`);
        } else if (selectedModule === 'SUBWORKSPACE' && targetWorkspaceId) {
          router.push(`/workspaces?workspaceId=${targetWorkspaceId}`);
        }
      }, 1500);
    } catch (err: any) {
      setUploadResult({ success: false, message: err.message });
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  useEffect(() => {
    // Fetch available workspaces for context selection
    import('@/lib/actions/workspaces').then(m => {
      m.fetchWorkspaces().then((res: any) => setWorkspaces(res || []));
    }).catch(console.error);
  }, []);

  const rootWorkspaces = workspaces.filter(w => !w.parent_workspace_id);
  const subWorkspaces = workspaces.filter(w => w.parent_workspace_id === targetWorkspaceId);

  const generateTemplate = async () => {
    if (selectedModule === 'TASK' && !targetWorkspaceId) {
      alert("Please select a Target Workspace context first.");
      return;
    }

    setIsGenerating(true);
    try {
      const finalWorkspaceId = targetSubworkspaceId || targetWorkspaceId;
      const metadata = await fetchMigrationMetadata(finalWorkspaceId);

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet(`${selectedModule} Import`);

      if (selectedModule === 'TASK') {
        generateTaskTemplate(worksheet, metadata);
      } else if (selectedModule === 'WORKSPACE') {
        generateWorkspaceTemplate(worksheet);
      } else if (selectedModule === 'SUBWORKSPACE') {
        generateSubworkspaceTemplate(worksheet, workspaces);
      }

      // Write and save
      const buffer = await workbook.xlsx.writeBuffer();
      saveAs(new Blob([buffer]), `${selectedModule}_Migration_Template.xlsx`);

    } catch (e: any) {
      alert("Error generating template: " + e.message);
    } finally {
      setIsGenerating(false);
    }
  };

  const generateTaskTemplate = (worksheet: ExcelJS.Worksheet, metadata: any) => {
    const columns = [
      { header: 'Subject (Required)', key: 'subject', width: 40 },
      { header: 'Description (Required)', key: 'desc', width: 40 },
      { header: 'Status (Required)', key: 'status', width: 20 },
      { header: 'Priority (Required)', key: 'priority', width: 20 },
      { header: 'Department (Required)', key: 'department', width: 20 },
      { header: 'Start Date (YYYY-MM-DD) (Required)', key: 'start', width: 25 },
      { header: 'End Date (YYYY-MM-DD) (Required)', key: 'end', width: 25 },
      { header: 'Primary Assignee/Owner (Required)', key: 'owner', width: 30 },
      { header: 'Executor 1 (Required)', key: 'executor1', width: 25 },
      { header: 'Executor 2 (Optional)', key: 'executor2', width: 25 },
      { header: 'Executor 3 (Optional)', key: 'executor3', width: 25 }
    ];

    worksheet.columns = columns;

    // Style Header
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    // Format Lists (Add a hidden worksheet for lists if they are long, but exceljs supports up to 255 chars in formula)
    // We will use a hidden sheet for data validations to avoid the 255 char limit
    const listSheet = worksheet.workbook.addWorksheet('ReferenceData', { state: 'hidden' });
    
    const statuses = metadata.statuses.map((s: any) => s.status_name);
    const priorities = metadata.priorities.map((p: any) => p.priority_name);
    const departments = metadata.departments.map((d: any) => d.name);
    const users = metadata.stakeholders.map((u: any) => u.full_name);

    listSheet.getColumn('A').values = ['Statuses', ...statuses];
    listSheet.getColumn('B').values = ['Priorities', ...priorities];
    listSheet.getColumn('C').values = ['Departments', ...departments];
    listSheet.getColumn('D').values = ['Users', ...users];

    // Add validations to 1000 rows
    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`C${i}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`ReferenceData!$A$2:$A$${statuses.length + 1}`]
      };
      worksheet.getCell(`D${i}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`ReferenceData!$B$2:$B$${priorities.length + 1}`]
      };
      worksheet.getCell(`E${i}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`ReferenceData!$C$2:$C$${departments.length + 1}`]
      };
      worksheet.getCell(`F${i}`).dataValidation = {
        type: 'date', operator: 'greaterThanOrEqual', formulae: [new Date(new Date().setHours(0,0,0,0))],
        allowBlank: false, showErrorMessage: true, errorTitle: 'Invalid Date', error: 'Start Date cannot be in the past.'
      };
      worksheet.getCell(`G${i}`).dataValidation = {
        type: 'date', operator: 'greaterThanOrEqual', formulae: [`F${i}`],
        allowBlank: false, showErrorMessage: true, errorTitle: 'Invalid Date', error: 'End Date cannot be before Start Date.'
      };
      worksheet.getCell(`H${i}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`ReferenceData!$D$2:$D$${users.length + 1}`]
      };
      worksheet.getCell(`I${i}`).dataValidation = {
        type: 'list', allowBlank: false, showErrorMessage: true,
        formulae: [`ReferenceData!$D$2:$D$${users.length + 1}`]
      };
      worksheet.getCell(`J${i}`).dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: true,
        formulae: [`ReferenceData!$D$2:$D$${users.length + 1}`]
      };
      worksheet.getCell(`K${i}`).dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: true,
        formulae: [`ReferenceData!$D$2:$D$${users.length + 1}`]
      };
    }
  };

  const generateWorkspaceTemplate = (worksheet: ExcelJS.Worksheet) => {
    worksheet.columns = [
      { header: 'Workspace Name (Required)', key: 'name', width: 30 },
      { header: 'Description', key: 'desc', width: 40 },
    ];
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
  };

  const generateSubworkspaceTemplate = (worksheet: ExcelJS.Worksheet, allWorkspaces: any[]) => {
    worksheet.columns = [
      { header: 'Parent Workspace (Required)', key: 'parent', width: 30 },
      { header: 'Subworkspace Name (Required)', key: 'name', width: 30 },
      { header: 'Description', key: 'desc', width: 40 },
    ];
    worksheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
    worksheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };

    const roots = allWorkspaces.filter(w => !w.parent_workspace_id).map(w => w.workspace_name || w.name);
    const listSheet = worksheet.workbook.addWorksheet('ReferenceData', { state: 'hidden' });
    listSheet.getColumn('A').values = ['Roots', ...roots];

    for (let i = 2; i <= 1000; i++) {
      worksheet.getCell(`A${i}`).dataValidation = {
        type: 'list', allowBlank: true, showErrorMessage: true,
        formulae: [`ReferenceData!$A$2:$A$${roots.length + 1}`]
      };
    }
  };

  return (
    <div className="space-y-6">
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Step 1: Configuration */}
        <div className="bg-[#121827] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity pointer-events-none">
            <FileSpreadsheet className="w-32 h-32" />
          </div>
          
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent text-xs">1</span>
            Configure Template
          </h2>
          
          <div className="space-y-5 relative z-10">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-1.5">Module Type</label>
              <select 
                value={selectedModule}
                onChange={e => {
                  setSelectedModule(e.target.value);
                  setTargetWorkspaceId('');
                  setTargetSubworkspaceId('');
                }}
                className="w-full bg-[#1C1C21] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-accent transition-colors"
              >
                <option value="WORKSPACE">Root Workspace</option>
                <option value="SUBWORKSPACE">Subworkspace</option>
                <option value="TASK">Tasks</option>
              </select>
            </div>

            {selectedModule === 'TASK' && (
              <div className="p-4 bg-accent/5 border border-accent/20 rounded-xl space-y-4 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-start gap-2 mb-2">
                  <Database className="w-4 h-4 text-accent mt-0.5" />
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    Task imports require a destination context. The template will automatically restrict the 'Assignee' and 'Watchers' fields to the users who have access to this context.
                  </p>
                </div>
                
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Target Workspace (Root) <span className="text-red-400">*</span></label>
                  <select
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent"
                    value={targetWorkspaceId}
                    onChange={(e) => {
                      setTargetWorkspaceId(e.target.value);
                      setTargetSubworkspaceId('');
                    }}
                  >
                    <option value="">Select a workspace...</option>
                    {rootWorkspaces.map((ws: any) => (
                      <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">Target Subworkspace (Optional)</label>
                  <select
                    className="w-full bg-[#0B0F19] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-accent disabled:opacity-50"
                    value={targetSubworkspaceId}
                    onChange={(e) => setTargetSubworkspaceId(e.target.value)}
                    disabled={!targetWorkspaceId}
                  >
                    <option value="">-- Root Level (No Subworkspace) --</option>
                    {subWorkspaces.map((ws: any) => (
                      <option key={ws.id} value={ws.id}>{ws.workspace_name || ws.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            )}

            <div className="pt-4 mt-4 border-t border-white/5">
              <AppButton 
                variant="primary" 
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-medium shadow-lg shadow-indigo-900/20"
                onClick={generateTemplate}
                disabled={isGenerating}
              >
                {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Download className="w-4 h-4 mr-2" />}
                {isGenerating ? "Building Excel File..." : "Download Smart Template"}
              </AppButton>
            </div>
          </div>
        </div>
        
        {/* Step 2: Upload */}
        <div className={`bg-[#121827] border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-opacity ${selectedModule === 'TASK' && !targetWorkspaceId ? 'opacity-50 pointer-events-none' : ''}`}>
          
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 mb-6">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-accent/20 text-accent text-xs">2</span>
            Upload Data
          </h2>
          
          <div className="space-y-4">
             <input 
               type="file" 
               accept=".xlsx" 
               className="hidden" 
               ref={fileInputRef} 
               onChange={handleFileUpload} 
             />
             
             {uploadResult && (
               <div className={`p-4 rounded-xl flex items-start gap-3 ${uploadResult.success ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border border-rose-500/20 text-rose-400'}`}>
                 {uploadResult.success ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" /> : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />}
                 <p className="text-sm">{uploadResult.message}</p>
               </div>
             )}

             <div 
               className={`border-2 border-dashed ${isUploading ? 'border-accent/50 bg-accent/5' : 'border-white/10 hover:border-accent/50 hover:bg-surface/5 cursor-pointer transition-all'} rounded-xl p-8 flex flex-col items-center justify-center text-center`}
               onClick={() => !isUploading && fileInputRef.current?.click()}
               onDragOver={(e) => { e.preventDefault(); e.stopPropagation(); }}
               onDrop={(e) => {
                 e.preventDefault();
                 e.stopPropagation();
                 if (isUploading) return;
                 const file = e.dataTransfer.files?.[0];
                 if (file && fileInputRef.current) {
                   // Create a mock event to pass to handleFileUpload
                   const dataTransfer = new DataTransfer();
                   dataTransfer.items.add(file);
                   fileInputRef.current.files = dataTransfer.files;
                   handleFileUpload({ target: { files: dataTransfer.files } } as any);
                 }
               }}
             >
               {isUploading ? (
                 <>
                   <Loader2 className="w-10 h-10 text-accent mb-3 animate-spin" />
                   <h3 className="text-sm font-semibold text-indigo-300 mb-1">Processing Excel File...</h3>
                   <p className="text-xs text-accent/70">Please do not close this page.</p>
                 </>
               ) : (
                 <>
                   <Upload className="w-10 h-10 text-gray-500 mb-3 group-hover:text-accent transition-colors" />
                   <h3 className="text-sm font-semibold text-gray-300 mb-1">Click to browse or drag file here</h3>
                   <p className="text-xs text-gray-500">Only .xlsx files are supported</p>
                   <AppButton 
                     variant="secondary" 
                     size="sm" 
                     className="mt-4 pointer-events-none" 
                   >
                     Select File
                   </AppButton>
                 </>
               )}
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}
