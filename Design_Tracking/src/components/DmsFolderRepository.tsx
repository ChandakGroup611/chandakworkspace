"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  FolderTree,
  Folder,
  FolderPlus,
  FileText,
  Search,
  Plus,
  Upload,
  Download,
  Eye,
  Lock,
  Unlock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  ChevronDown,
  Filter,
  RefreshCw,
  MoreVertical,
  X,
  Layers,
  Sparkles,
  Info
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import {
  DmsFolderNode,
  DmsDocumentSummary,
  fetchFolderTreeAction,
  fetchFolderDocumentsAction,
  createFolderAction,
  lockUnlockDocumentAction,
  submitQcDecisionAction
} from "@/lib/actions/dms-core";
import { DmsSplitIndexingWizard } from "./DmsSplitIndexingWizard";

interface DmsFolderRepositoryProps {
  workspaceId?: string;
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    roleCode: string;
    isAdmin: boolean;
  };
}

export const DmsFolderRepository: React.FC<DmsFolderRepositoryProps> = ({
  workspaceId = "CHANDAK_CORP",
  currentUser,
}) => {
  const [folders, setFolders] = useState<DmsFolderNode[]>([]);
  const [selectedFolder, setSelectedFolder] = useState<DmsFolderNode | null>(null);
  const [expandedFolderIds, setExpandedFolderIds] = useState<Set<string>>(new Set());
  const [folderSearchQuery, setFolderSearchQuery] = useState<string>("");

  const [documents, setDocuments] = useState<DmsDocumentSummary[]>([]);
  const [isLoadingDocuments, setIsLoadingDocuments] = useState<boolean>(false);
  const [docSearchQuery, setDocSearchQuery] = useState<string>("");
  const [docTypeFilter, setDocTypeFilter] = useState<string>("ALL");

  // Subfolder creation modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [newFolderApprovalRequired, setNewFolderApprovalRequired] = useState<boolean>(true);
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);

  // Split Indexing Wizard Modal State
  const [showIndexingWizard, setShowIndexingWizard] = useState<boolean>(false);

  // Selected document detail drawer
  const [selectedDoc, setSelectedDoc] = useState<DmsDocumentSummary | null>(null);

  // Load Folder Hierarchy on mount
  const loadFolderTree = useCallback(async () => {
    try {
      const res = await fetchFolderTreeAction(workspaceId);
      if (res.success && res.folders) {
        setFolders(res.folders);
        if (res.folders.length > 0 && !selectedFolder) {
          setSelectedFolder(res.folders[0]);
          setExpandedFolderIds(new Set([res.folders[0].id]));
        }
      }
    } catch (err) {
      console.error("Failed to load folder tree:", err);
    }
  }, [workspaceId, selectedFolder]);

  useEffect(() => {
    loadFolderTree();
  }, [loadFolderTree]);

  // Load Documents whenever selectedFolder changes or search triggers
  const loadFolderDocuments = useCallback(async () => {
    if (!selectedFolder) return;
    setIsLoadingDocuments(true);
    try {
      const res = await fetchFolderDocumentsAction({
        folderId: selectedFolder.id,
        searchQuery: docSearchQuery,
        docTypeId: docTypeFilter === "ALL" ? undefined : docTypeFilter,
      });
      if (res.success && res.documents) {
        setDocuments(res.documents);
      }
    } catch (err) {
      console.error("Failed to load folder documents:", err);
    } finally {
      setIsLoadingDocuments(false);
    }
  }, [selectedFolder, docSearchQuery, docTypeFilter]);

  useEffect(() => {
    loadFolderDocuments();
  }, [loadFolderDocuments]);

  const toggleFolderExpand = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolderIds((prev) => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  // Create Subfolder
  const handleCreateSubfolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;
    setIsCreatingFolder(true);
    try {
      const res = await createFolderAction({
        workspaceId,
        parentId: selectedFolder?.id,
        name: newFolderName.trim(),
        approvalRequired: newFolderApprovalRequired,
      });

      if (res.success && res.folder) {
        setShowCreateFolderModal(false);
        setNewFolderName("");
        await loadFolderTree();
      } else {
        alert(res.error || "Failed to create folder");
      }
    } catch (err: any) {
      console.error("Create folder error:", err);
    } finally {
      setIsCreatingFolder(false);
    }
  };

  // Toggle Document Lock
  const handleToggleLock = async (doc: DmsDocumentSummary) => {
    try {
      const action = doc.isLocked ? "UNLOCK" : "LOCK";
      const res = await lockUnlockDocumentAction({
        documentId: doc.id,
        action,
      });
      if (res.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, isLocked: !d.isLocked } : d))
        );
      }
    } catch (err) {
      console.error("Toggle lock error:", err);
    }
  };

  // Submit QC Decision
  const handleQcDecision = async (doc: DmsDocumentSummary, status: "APPROVED" | "REJECTED") => {
    try {
      const res = await submitQcDecisionAction({
        documentId: doc.id,
        versionNo: doc.currentVersionNo,
        status,
      });
      if (res.success) {
        setDocuments((prev) =>
          prev.map((d) => (d.id === doc.id ? { ...d, approvalStatus: status } : d))
        );
      }
    } catch (err) {
      console.error("QC decision error:", err);
    }
  };

  // Recursive Tree Renderer
  const renderFolderNode = (node: DmsFolderNode) => {
    const isSelected = selectedFolder?.id === node.id;
    const isExpanded = expandedFolderIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none">
        <div
          onClick={() => setSelectedFolder(node)}
          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            isSelected
              ? "bg-theme-btn-primary/10 text-theme-btn-primary font-bold border border-theme-btn-primary/20"
              : "hover:bg-surface text-foreground"
          }`}
          style={{ paddingLeft: `${Math.max(10, node.depth * 18 + 10)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button
                onClick={(e) => toggleFolderExpand(node.id, e)}
                className="p-0.5 hover:bg-surface rounded-sm text-muted-foreground"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3.5 w-3.5" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5" />
                )}
              </button>
            ) : (
              <span className="w-3.5 h-3.5" />
            )}
            <Folder
              className={`h-4 w-4 shrink-0 ${
                isSelected ? "text-theme-btn-primary fill-theme-btn-primary/20" : "text-amber-500 fill-amber-500/20"
              }`}
            />
            <span className="truncate">{node.name}</span>
          </div>

          {node.documentCount !== undefined && node.documentCount > 0 && (
            <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-full bg-surface border border-border">
              {node.documentCount}
            </span>
          )}
        </div>

        {hasChildren && isExpanded && (
          <div className="space-y-0.5 mt-0.5">
            {node.children!.map((child) => renderFolderNode(child))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      {/* 1. TOP HEADER & METRIC STRIP */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border p-4 rounded-xl shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold text-foreground flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-theme-btn-primary" />
              <span>Enterprise DMS Folder Repository</span>
            </h1>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/10 text-theme-btn-primary">
              6-Layer RBAC
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Hierarchical folder architecture with dynamic doc-type EAV metadata, split-screen indexing & QC gate controls.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowCreateFolderModal(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface text-foreground transition-colors"
          >
            <FolderPlus className="h-3.5 w-3.5 text-amber-500" />
            <span>New Folder</span>
          </button>
          <button
            onClick={() => setShowIndexingWizard(true)}
            disabled={!selectedFolder}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs transition-all disabled:opacity-50"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload & Index</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT REPOSITORY LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT PANEL: FOLDER HIERARCHY TREE */}
        <aside className="md:col-span-4 lg:col-span-3 bg-surface border border-border rounded-xl p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FolderTree className="h-3.5 w-3.5 text-theme-btn-primary" />
              <span>Folder Hierarchy</span>
            </span>
            <button
              onClick={loadFolderTree}
              className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground"
              title="Refresh tree"
            >
              <RefreshCw className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Folder Search */}
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={folderSearchQuery}
              onChange={(e) => setFolderSearchQuery(e.target.value)}
              placeholder="Search folders..."
              className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
            />
          </div>

          {/* Folder Tree Scroll Area */}
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
            {folders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1">
                <Folder className="h-6 w-6 mx-auto opacity-40 text-amber-500" />
                <p className="text-xs">No folders created yet.</p>
              </div>
            ) : (
              folders.map((f) => renderFolderNode(f))
            )}
          </div>
        </aside>

        {/* MAIN STAGE: DOCUMENT REGISTER TABLE */}
        <main className="md:col-span-8 lg:col-span-9 bg-surface border border-border rounded-xl p-4 space-y-4 shadow-xs">
          {/* Active Folder Dossier Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex items-center gap-2">
                <Folder className="h-4 w-4 text-amber-500 fill-amber-500/20" />
                <h2 className="text-sm font-bold text-foreground">
                  {selectedFolder?.name || "Select a Folder"}
                </h2>
                {selectedFolder?.approvalRequired && (
                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400">
                    QC Approval Required
                  </span>
                )}
              </div>
              <p className="text-[11px] font-mono text-muted-foreground mt-0.5">
                Path: {selectedFolder?.path || "chandak.root"}
              </p>
            </div>

            {/* Document Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search in folder..."
                  className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                />
              </div>
            </div>
          </div>

          {/* Document Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-3">Document Title</th>
                  <th className="py-2.5 px-3">Doc Type</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">QC Status</th>
                  <th className="py-2.5 px-3">Lock</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {isLoadingDocuments ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Loading folder documents...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-40" />
                      <p className="font-medium text-xs">No documents in this folder.</p>
                      <button
                        onClick={() => setShowIndexingWizard(true)}
                        className="text-[11px] text-theme-btn-primary font-bold hover:underline"
                      >
                        Upload and Index the first document &rarr;
                      </button>
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-surface/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-theme-btn-primary shrink-0" />
                          <div className="min-w-0">
                            <span className="font-bold truncate block">{doc.title}</span>
                            <span className="text-[10px] text-muted-foreground font-mono truncate block">
                              {doc.originalFileName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-theme-btn-primary/10 text-theme-btn-primary">
                          {doc.docTypeCode}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        v{doc.currentVersionNo}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            doc.approvalStatus === "APPROVED"
                              ? "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400"
                              : doc.approvalStatus === "REJECTED"
                              ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                              : "bg-blue-500/15 text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {doc.approvalStatus}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleToggleLock(doc);
                          }}
                          className={`p-1 rounded-md transition-colors ${
                            doc.isLocked
                              ? "bg-amber-500/15 text-amber-600 dark:text-amber-400"
                              : "hover:bg-surface text-muted-foreground"
                          }`}
                          title={doc.isLocked ? "Locked / Checked Out" : "Unlocked (Available)"}
                        >
                          {doc.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {(doc.fileSizeBytes / 1024).toFixed(1)} KB
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <a
                            href={`/api/proxy-attachment/${doc.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground"
                            title="View Document"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </a>
                          <a
                            href={`/api/proxy-attachment/${doc.id}`}
                            download
                            className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground"
                            title="Download"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </main>
      </div>

      {/* CREATE SUBFOLDER MODAL */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-60 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-amber-500" />
                <h3 className="text-sm font-bold text-foreground">Create New Subfolder</h3>
              </div>
              <button
                onClick={() => setShowCreateFolderModal(false)}
                className="p-1 hover:bg-surface rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubfolder} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Parent Folder
                </label>
                <p className="text-xs font-mono font-medium text-foreground mt-0.5">
                  {selectedFolder?.path || "chandak.root"}
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                  Folder Name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Structural Calculations"
                  className="w-full mt-1 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-theme-btn-primary"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <span className="text-xs font-bold text-foreground">Require QC Verification</span>
                  <p className="text-[11px] text-muted-foreground">New documents will require QC sign-off.</p>
                </div>
                <input
                  type="checkbox"
                  checked={newFolderApprovalRequired}
                  onChange={(e) => setNewFolderApprovalRequired(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-theme-btn-primary focus:ring-theme-btn-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowCreateFolderModal(false)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border hover:bg-surface text-muted-foreground"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingFolder || !newFolderName.trim()}
                  className="px-4 py-1.5 text-xs font-bold rounded-lg bg-theme-btn-primary text-theme-btn-primary-text hover:brightness-110 shadow-xs disabled:opacity-50"
                >
                  {isCreatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SPLIT INDEXING WIZARD MODAL */}
      <DmsSplitIndexingWizard
        isOpen={showIndexingWizard}
        onClose={() => setShowIndexingWizard(false)}
        workspaceId={workspaceId}
        targetFolder={selectedFolder}
        onDocumentIndexed={() => {
          loadFolderDocuments();
          loadFolderTree();
        }}
      />
    </div>
  );
};
