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
  Info,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Trash2
} from "lucide-react";
import { AppCard, AppCardContent, AppCardHeader, AppCardTitle } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import {
  DmsFolderNode,
  DmsDocumentSummary,
  fetchFolderTreeAction,
  fetchFolderDocumentsAction,
  createFolderAction,
  updateFolderAction,
  deleteFolderAction,
  type DmsRights
} from "@/lib/actions/dms-core";
import { DmsSplitIndexingWizard } from "./DmsSplitIndexingWizard";
import { DmsDocumentPanel, formatBytes } from "./DmsDocumentPanel";
import { DmsQcQueueView, DmsRecycleBinView } from "./DmsBinAndQcViews";
import { DmsSearchView } from "./DmsSearchView";
import { DmsMastersView } from "./DmsMastersView";
import { DmsFolderPermissionsModal } from "./DmsFolderPermissionsModal";
import { toast } from "react-toastify";

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

  // Folder Permissions Modal State
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [folderForPermissions, setFolderForPermissions] = useState<DmsFolderNode | null>(null);

  // Selected document detail drawer & in-app viewer modal
  const [selectedDoc, setSelectedDoc] = useState<DmsDocumentSummary | null>(null);
  const [docViewerZoom, setDocViewerZoom] = useState<number>(1);

  // Which list the main area shows, and what the person may do in the open folder
  const [view, setView] = useState<"FOLDER" | "SEARCH" | "QC" | "BIN" | "MASTERS">("FOLDER");
  const [folderRights, setFolderRights] = useState<DmsRights | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  // Load Folder Hierarchy on mount
  const loadFolderTree = useCallback(async () => {
    try {
      const res = await fetchFolderTreeAction(workspaceId);
      if (res.success && res.folders) {
        setFolders(res.folders);
        if (res.folders.length > 0 && !selectedFolder) {
          const firstOpen = (nodes: DmsFolderNode[]): DmsFolderNode | null => {
            for (const n of nodes) {
              if (n.canOpen !== false) return n;
              const c = firstOpen(n.children || []);
              if (c) return c;
            }
            return null;
          };
          const first = firstOpen(res.folders);
          if (first) setSelectedFolder(first);
          setExpandedFolderIds(new Set(res.folders.map((f) => f.id)));
        }
      } else if (!res.success) {
        toast.error(res.error || "Could not load folders.");
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
        setFolderRights(res.folderRights || null);
        setDocsError(null);
      } else {
        setDocuments([]);
        setFolderRights(null);
        setDocsError(res.error || "Could not load documents.");
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
      const parentId = selectedFolder?.id;
      const res = await createFolderAction({
        workspaceId,
        parentId,
        name: newFolderName.trim(),
        approvalRequired: newFolderApprovalRequired,
      });

      if (res.success && res.folder) {
        setShowCreateFolderModal(false);
        setNewFolderName("");
        if (parentId) {
          setExpandedFolderIds((prev) => new Set([...prev, parentId, res.folder!.id]));
        }
        await loadFolderTree();
        setSelectedFolder(res.folder);
        toast.success(`Folder "${res.folder.name}" created successfully!`);
      } else {
        toast.error(res.error || "Failed to create folder");
      }
    } catch (err: any) {
      console.error("Create folder error:", err);
      toast.error(err.message || "Failed to create folder");
    } finally {
      setIsCreatingFolder(false);
    }
  };

  const handleRenameFolder = async (folder: DmsFolderNode, name: string) => {
    const res = await updateFolderAction({ folderId: folder.id, name });
    if (!res.success) return toast.error(res.error);
    setRenaming(null);
    setSelectedFolder({ ...folder, name });
    await loadFolderTree();
  };

  const handleToggleFolderQc = async (folder: DmsFolderNode) => {
    const res = await updateFolderAction({ folderId: folder.id, approvalRequired: !folder.approvalRequired });
    if (!res.success) return toast.error(res.error);
    setSelectedFolder({ ...folder, approvalRequired: !folder.approvalRequired });
    toast.success(folder.approvalRequired ? "New uploads here no longer need QC." : "New uploads here now need QC approval.");
    await loadFolderTree();
  };

  const handleDeleteFolder = async (folder: DmsFolderNode) => {
    const res = await deleteFolderAction(folder.id);
    if (!res.success) return toast.error(res.error);
    toast.success(`Folder "${folder.name}" deleted.`);
    setSelectedFolder(null);
    await loadFolderTree();
  };

  // Recursive Tree Renderer
  const renderFolderNode = (node: DmsFolderNode) => {
    const isSelected = selectedFolder?.id === node.id;
    const isExpanded = expandedFolderIds.has(node.id);
    const hasChildren = node.children && node.children.length > 0;

    return (
      <div key={node.id} className="select-none group">
        <div
          onClick={() => {
            if (node.canOpen === false) return;
            setSelectedFolder(node);
            setView("FOLDER");
          }} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
          className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
            isSelected
              ? "bg-accent-soft text-primary font-semibold border border-border-active"
              : "hover:bg-surface text-foreground"
          }`}
          style={{ paddingLeft: `${Math.max(10, node.depth * 18 + 10)}px` }}
        >
          <div className="flex items-center gap-2 min-w-0">
            {hasChildren ? (
              <button type="button"
                onClick={(e) => toggleFolderExpand(node.id, e)}
                aria-label={isExpanded ? "Collapse folder" : "Expand folder"}
                aria-expanded={isExpanded}
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
                isSelected ? "text-primary fill-theme-btn-primary/20" : "text-warning-text fill-warning"
              }`}
            />
            <span className={`truncate ${node.canOpen === false ? "text-muted-foreground italic" : ""}`}>{node.name}</span>
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {node.documentCount !== undefined && node.documentCount > 0 && (
              <span className="text-[11px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-full bg-surface border border-border">
                {node.documentCount}
              </span>
            )}
            {node.rights?.create_folder && (
            <button aria-label="Add subfolder"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setSelectedFolder(node);
                setShowCreateFolderModal(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-soft text-muted-foreground hover:text-warning-text transition-opacity"
              title="Add subfolder"
            >
              <FolderPlus className="h-3.5 w-3.5" />
            </button>
            )}
            {node.canOpen !== false && (
            <button aria-label="Folder access & permissions"
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setFolderForPermissions(node);
                setShowPermissionsModal(true);
              }}
              className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-accent-soft text-muted-foreground hover:text-primary transition-opacity"
              title="Folder access & permissions"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
            </button>
            )}
          </div>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-surface border border-border p-4 rounded-lg shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[20px] sm:text-[22px] font-semibold tracking-[-0.01em] text-heading flex items-center gap-2">
              <FolderTree className="h-5 w-5 text-primary" />
              <span>DMS folders</span>
            </h2>

          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Folders, versions, check-out, QC approval and a recycle bin. You only see the folders and documents your access allows.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button type="button"
            onClick={() => setView(view === "SEARCH" ? "FOLDER" : "SEARCH")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer ${view === "SEARCH" ? "bg-accent-soft text-primary" : "bg-surface text-foreground"}`}
          >
            <Search className="h-3.5 w-3.5 text-primary" />
            <span>Search</span>
          </button>
          <button type="button"
            onClick={() => setView(view === "MASTERS" ? "FOLDER" : "MASTERS")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer ${view === "MASTERS" ? "bg-accent-soft text-primary" : "bg-surface text-foreground"}`}
          >
            <Layers className="h-3.5 w-3.5 text-primary" />
            <span>Master tables</span>
          </button>
          <button type="button"
            onClick={() => setView(view === "QC" ? "FOLDER" : "QC")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer ${view === "QC" ? "bg-accent-soft text-primary" : "bg-surface text-foreground"}`}
          >
            <CheckCircle2 className="h-3.5 w-3.5 text-primary" />
            <span>QC queue</span>
          </button>
          <button type="button"
            onClick={() => setView(view === "BIN" ? "FOLDER" : "BIN")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer ${view === "BIN" ? "bg-accent-soft text-primary" : "bg-surface text-foreground"}`}
          >
            <Trash2 className="h-3.5 w-3.5 text-danger-text" />
            <span>Recycle bin</span>
          </button>
          <button type="button"
            onClick={() => {
              if (selectedFolder) {
                setFolderForPermissions(selectedFolder);
                setShowPermissionsModal(true);
              }
            }}
            disabled={!selectedFolder}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface text-foreground transition-colors disabled:opacity-50 cursor-pointer"
            title="Configure folder access & user permissions"
          >
            <ShieldCheck className="h-3.5 w-3.5 text-primary" />
            <span>Folder access</span>
          </button>
          <button type="button"
            onClick={() => setShowCreateFolderModal(true)}
            disabled={!selectedFolder || !folderRights?.create_folder}
            title={selectedFolder && !folderRights?.create_folder ? "You can't create folders here" : undefined}
            className="disabled:opacity-50 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface text-foreground transition-colors cursor-pointer"
          >
            <FolderPlus className="h-3.5 w-3.5 text-warning-text" />
            <span>New folder</span>
          </button>
          <button type="button"
            onClick={() => setShowIndexingWizard(true)}
            disabled={!selectedFolder || !folderRights?.upload}
            title={selectedFolder && !folderRights?.upload ? "You can't add documents to this folder" : undefined}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-xs transition-all disabled:opacity-50 cursor-pointer"
          >
            <Upload className="h-3.5 w-3.5" />
            <span>Upload & index</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN SPLIT REPOSITORY LAYOUT */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        {/* LEFT PANEL: FOLDER HIERARCHY TREE */}
        <aside className="md:col-span-4 lg:col-span-3 bg-surface border border-border rounded-lg p-3.5 space-y-3 shadow-xs">
          <div className="flex items-center justify-between pb-2 border-b border-border">
            <span className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
              <FolderTree className="h-3.5 w-3.5 text-primary" />
              <span>Folder hierarchy</span>
            </span>
            <button aria-label="Refresh tree" type="button"
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
              placeholder="Search folders…"
              className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-ring"
            />
          </div>

          {/* Folder Tree Scroll Area */}
          <div className="space-y-0.5 max-h-[600px] overflow-y-auto pr-1">
            {folders.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground space-y-1">
                <Folder className="h-6 w-6 mx-auto opacity-40 text-warning-text" />
                <p className="text-xs">No folders created yet.</p>
              </div>
            ) : (
              folders.map((f) => renderFolderNode(f))
            )}
          </div>
        </aside>

        {/* MAIN STAGE: DOCUMENT REGISTER TABLE */}
        <main className="md:col-span-8 lg:col-span-9 bg-surface border border-border rounded-lg p-4 space-y-4 shadow-xs">
          {view !== "FOLDER" ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  {view === "SEARCH" ? "Search documents" : view === "MASTERS" ? "Master tables" : view === "QC" ? "Waiting for your QC decision" : "Recycle bin"}
                </h2>
                <button type="button" onClick={() => setView("FOLDER")} className="text-xs text-primary font-semibold">
                  Back to folders
                </button>
              </div>
              {view === "MASTERS" ? (
                <DmsMastersView workspaceId={workspaceId} />
              ) : view === "SEARCH" ? (
                <DmsSearchView workspaceId={workspaceId} currentFolder={selectedFolder} onOpen={(doc) => setSelectedDoc(doc)} />
              ) : view === "QC" ? (
                <DmsQcQueueView
                  workspaceId={workspaceId}
                  onOpen={(item) =>
                    setSelectedDoc({
                      id: item.documentId,
                      folderId: item.folderId,
                      docTypeId: "",
                      docTypeCode: "",
                      docTypeName: "",
                      title: item.title,
                      originalFileName: "",
                      currentVersionNo: item.versionNo,
                      approvalStatus: "PENDING",
                      fileSizeBytes: 0,
                      mimeType: "",
                      storageKey: "",
                      isLocked: false,
                      createdAt: item.uploadedAt,
                      updatedAt: item.uploadedAt,
                    })
                  }
                />
              ) : (
                <DmsRecycleBinView
                  workspaceId={workspaceId}
                  onRestored={() => {
                    loadFolderTree();
                    loadFolderDocuments();
                  }}
                />
              )}
            </>
          ) : (
          <>
          {/* Active Folder Dossier Header */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-border">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Folder className="h-4 w-4 text-warning-text fill-warning" />
                {selectedFolder && renaming !== null ? (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (renaming.trim()) handleRenameFolder(selectedFolder, renaming.trim());
                    }}
                    className="flex items-center gap-1"
                  >
                    <input
                      autoFocus
                      aria-label="Folder name"
                      value={renaming}
                      onChange={(e) => setRenaming(e.target.value)}
                      className="text-xs rounded-lg bg-surface border border-border px-2 py-1"
                    />
                    <button type="submit" className="text-[11px] font-semibold text-primary">Save</button>
                    <button type="button" onClick={() => setRenaming(null)} className="text-[11px] text-muted-foreground">Cancel</button>
                  </form>
                ) : (
                  <h2 className="text-sm font-semibold text-foreground">
                    {selectedFolder?.name || "Select a folder"}
                  </h2>
                )}
                {selectedFolder?.approvalRequired && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-warning-soft text-warning-text">
                    QC approval required
                  </span>
                )}
              </div>
              {selectedFolder && (folderRights?.admin || folderRights?.manage) && renaming === null && (
                <div className="flex flex-wrap gap-3 mt-1 text-[11px] font-semibold">
                  <button type="button" onClick={() => setRenaming(selectedFolder.name)} className="text-primary">Rename</button>
                  <button type="button" onClick={() => handleToggleFolderQc(selectedFolder)} className="text-primary">
                    {selectedFolder.approvalRequired ? "Stop requiring QC" : "Require QC"}
                  </button>
                  {selectedFolder.parentId && (
                    <button type="button" onClick={() => handleDeleteFolder(selectedFolder)} className="text-danger-text">
                      Delete folder
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Document Search & Filter */}
            <div className="flex items-center gap-2">
              <div className="relative w-48 sm:w-60">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <input
                  type="text"
                  value={docSearchQuery}
                  onChange={(e) => setDocSearchQuery(e.target.value)}
                  placeholder="Search in folder…"
                  className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-ring"
                />
              </div>
            </div>
          </div>

          {/* Document Table */}
          <div className="overflow-x-auto rounded-lg border border-border">
            <table className="w-full text-left text-xs">
              <thead className="bg-surface/50 border-b border-border text-muted-foreground font-semibold text-[11px]">
                <tr>
                  <th className="py-2.5 px-3">Document title</th>
                  <th className="py-2.5 px-3">Doc type</th>
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">QC status</th>
                  <th className="py-2.5 px-3">Lock</th>
                  <th className="py-2.5 px-3">Size</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {docsError ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">{docsError}</td>
                  </tr>
                ) : isLoadingDocuments ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground">
                      Loading folder documents…
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-40" />
                      <p className="font-medium text-xs">No documents in this folder.</p>
                      {folderRights?.upload && (
                        <button type="button"
                          onClick={() => setShowIndexingWizard(true)}
                          className="text-[11px] text-primary font-semibold hover:underline"
                        >
                          Upload and index the first document &rarr;
                        </button>
                      )}
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
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <span className="font-semibold truncate block">{doc.title}</span>
                            <span className="text-[11px] text-muted-foreground font-mono truncate block">
                              {doc.originalFileName}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-primary">
                          {doc.docTypeCode}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        v{doc.currentVersionNo}
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                            doc.approvalStatus === "APPROVED"
                              ? "bg-success-soft text-success-text"
                              : doc.approvalStatus === "REJECTED"
                              ? "bg-danger-soft text-danger-text"
                              : "bg-info-soft text-info-text"
                          }`}
                        >
                          {doc.approvalStatus === "PENDING" ? "Waiting for QC" : doc.approvalStatus === "APPROVED" ? "Approved" : "Rejected"}
                        </span>
                      </td>

                      <td className="py-2.5 px-3">
                        <span
                          className={`inline-flex items-center gap-1 text-[11px] ${doc.isLocked ? "text-warning-text" : "text-muted-foreground"}`}
                          title={doc.isLocked ? `Checked out by ${doc.lockedByMe ? "you" : doc.lockedByName}` : "Available"}
                        >
                          {doc.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          {doc.isLocked ? (doc.lockedByMe ? "You" : doc.lockedByName) : ""}
                        </span>
                      </td>

                      <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground">
                        {formatBytes(doc.fileSizeBytes)}
                      </td>

                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button aria-label="View document preview"
                            type="button"
                            onClick={() => setSelectedDoc(doc)}
                            className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                            title="View document preview"
                          >
                            <Eye className="h-3.5 w-3.5 text-primary" />
                          </button>
                          {doc.rights?.download && (
                            <a
                              href={`/api/proxy-attachment/${doc.id}?download=1`}
                              className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Download document"
                              aria-label="Download document"
                            >
                              <Download className="h-3.5 w-3.5" />
                            </a>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          </>
          )}
        </main>
      </div>

      {/* CREATE SUBFOLDER MODAL */}
      {showCreateFolderModal && (
        <div className="fixed inset-0 z-60 bg-[var(--overlay)] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden animate-in zoom-in-95">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FolderPlus className="h-4 w-4 text-warning-text" />
                <h3 className="text-sm font-semibold text-foreground">Create new subfolder</h3>
              </div>
              <button aria-label="Close" type="button"
                onClick={() => setShowCreateFolderModal(false)}
                className="p-1 hover:bg-surface rounded-md text-muted-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubfolder} className="p-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Target parent folder
                </label>
                <p className="text-xs font-medium text-foreground mt-0.5">
                  {selectedFolder ? `${selectedFolder.name} (${selectedFolder.path})` : "Chandak Master Archive (Root)"}
                </p>
              </div>

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Folder name *
                </label>
                <input
                  type="text"
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Structural calculations"
                  className="w-full mt-1 text-xs rounded-lg bg-surface border border-border p-2.5 text-foreground focus:ring-1 focus:ring-ring"
                  autoFocus
                />
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-border">
                <div>
                  <span className="text-xs font-semibold text-foreground">Require QC verification</span>
                  <p className="text-[11px] text-muted-foreground">New documents will require QC sign-off.</p>
                </div>
                <input
                  type="checkbox"
                  checked={newFolderApprovalRequired}
                  onChange={(e) => setNewFolderApprovalRequired(e.target.checked)}
                  className="h-4 w-4 rounded-sm border-border text-primary focus:ring-ring"
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
                  className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:brightness-110 shadow-xs disabled:opacity-50"
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

      {/* FOLDER PERMISSIONS & ACCESS CONTROL MODAL */}
      {showPermissionsModal && folderForPermissions && (
        <DmsFolderPermissionsModal
          folder={folderForPermissions}
          isOpen={showPermissionsModal}
          onClose={() => {
            setShowPermissionsModal(false);
            setFolderForPermissions(null);
          }}
          onPermissionsUpdated={() => {
            loadFolderTree();
          }}
          currentUser={currentUser}
        />
      )}

      {/* IN-APP UPLOADED DOCUMENT VIEWER MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-60 bg-[var(--overlay)] flex flex-col overflow-hidden animate-in fade-in duration-150">
          {/* Header */}
          <header className="h-14 border-b border-border bg-surface px-6 flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="h-8 w-8 rounded-lg bg-accent-soft border border-border-active flex items-center justify-center text-primary shrink-0">
                <FileText className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-foreground truncate">{selectedDoc.title}</h3>
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-primary shrink-0">
                    {selectedDoc.docTypeCode}
                  </span>
                  <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-surface border border-border text-muted-foreground shrink-0">
                    v{selectedDoc.currentVersionNo}
                  </span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[11px] font-semibold shrink-0 ${
                      selectedDoc.approvalStatus === "APPROVED"
                        ? "bg-success-soft text-success-text"
                        : selectedDoc.approvalStatus === "REJECTED"
                        ? "bg-danger-soft text-danger-text"
                        : "bg-info-soft text-info-text"
                    }`}
                  >
                    {selectedDoc.approvalStatus}
                  </span>
                </div>
                <p className="text-[11px] font-mono text-muted-foreground truncate">
                  {selectedDoc.originalFileName} &bull; {formatBytes(selectedDoc.fileSizeBytes)}
                </p>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 shrink-0">
              <div className="flex items-center gap-1 bg-surface border border-border rounded-lg px-2 py-1 mr-2">
                <button aria-label="Zoom out" type="button"
                  onClick={() => setDocViewerZoom((z) => Math.max(0.4, Number((z - 0.15).toFixed(2))))}
                  className="p-1 hover:bg-surface rounded-sm text-muted-foreground cursor-pointer"
                  title="Zoom out"
                >
                  <ZoomOut className="h-3.5 w-3.5" />
                </button>
                <span className="text-[11px] font-mono font-medium px-1 text-foreground min-w-[36px] text-center">
                  {Math.round(docViewerZoom * 100)}%
                </span>
                <button aria-label="Zoom in" type="button"
                  onClick={() => setDocViewerZoom((z) => Math.min(2.5, Number((z + 0.15).toFixed(2))))}
                  className="p-1 hover:bg-surface rounded-sm text-muted-foreground cursor-pointer"
                  title="Zoom in"
                >
                  <ZoomIn className="h-3.5 w-3.5" />
                </button>
                <button aria-label="Reset (100%)" type="button"
                  onClick={() => setDocViewerZoom(1)}
                  className="p-1 hover:bg-surface rounded-sm text-muted-foreground cursor-pointer"
                  title="Reset (100%)"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                </button>
              </div>

              <a
                href={`/api/proxy-attachment/${selectedDoc.id}`}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface/80 text-foreground inline-flex items-center gap-1.5 cursor-pointer"
                title="Open in new browser tab"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>Open in tab</span>
              </a>



              <button aria-label="Close viewer" type="button"
                onClick={() => setSelectedDoc(null)}
                className="p-1.5 hover:bg-surface text-muted-foreground hover:text-foreground rounded-lg ml-2 cursor-pointer"
                title="Close viewer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Viewer Stage */}
          <div className="flex-1 overflow-auto p-4 flex items-center justify-center bg-muted/10 relative">
            {(() => {
              const fileSrc = `/api/proxy-attachment/${selectedDoc.id}`;
              const isImage =
                (selectedDoc.mimeType && selectedDoc.mimeType.startsWith("image/")) ||
                /\.(jpe?g|png|webp|gif|svg|bmp)$/i.test(selectedDoc.originalFileName);
              const isPdf =
                selectedDoc.mimeType === "application/pdf" ||
                /\.pdf$/i.test(selectedDoc.originalFileName);

              if (isImage) {
                return (
                  <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                    <img
                      src={fileSrc}
                      alt={selectedDoc.title}
                      style={{ transform: `scale(${docViewerZoom})` }}
                      className="max-h-full max-w-full object-contain rounded-lg shadow-lg border border-border bg-surface transition-transform duration-100 origin-center"
                    />
                  </div>
                );
              }

              if (isPdf) {
                return (
                  <div
                    className="w-full h-full max-w-6xl bg-surface rounded-lg shadow-lg border border-border overflow-hidden transition-transform duration-100 origin-center flex flex-col"
                    style={{ transform: `scale(${docViewerZoom})` }}
                  >
                    <object
                      data={fileSrc}
                      type="application/pdf"
                      className="w-full h-full flex-1"
                    >
                      <iframe
                        src={fileSrc}
                        className="w-full h-full border-none"
                        title={selectedDoc.title}
                      >
                        <div className="flex flex-col items-center justify-center h-full p-8 text-center space-y-4">
                          <FileText className="h-16 w-16 text-muted-foreground stroke-1" />
                          <div>
                            <p className="text-sm font-semibold text-foreground">
                              Inline PDF preview unavailable in this browser.
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              You can securely open the PDF directly or download it.
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={fileSrc}
                              target="_blank"
                              rel="noreferrer"
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-1.5"
                            >
                              <ExternalLink className="h-4 w-4" />
                              <span>Open in browser</span>
                            </a>
                            <a
                              href={`${fileSrc}?download=1`}
                              download={selectedDoc.originalFileName}
                              className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface/80 text-foreground inline-flex items-center gap-1.5"
                            >
                              <Download className="h-4 w-4" />
                              <span>Download file</span>
                            </a>
                          </div>
                        </div>
                      </iframe>
                    </object>
                  </div>
                );
              }

              // Office and other documents
              return (
                <div className="max-w-lg w-full bg-surface border border-border rounded-lg p-8 text-center space-y-5 shadow-lg animate-in zoom-in-95">
                  <div className="h-20 w-20 mx-auto rounded-full bg-accent-soft border border-border-active flex items-center justify-center text-primary">
                    <FileText className="h-10 w-10 stroke-[1.5]" />
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-foreground truncate">{selectedDoc.title}</h3>
                    <p className="text-xs font-mono text-muted-foreground mt-1">
                      {selectedDoc.originalFileName} &bull; {formatBytes(selectedDoc.fileSizeBytes)}
                    </p>
                  </div>
                  <div className="p-3 bg-surface/50 border border-border rounded-lg text-left text-xs space-y-1.5">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Document Type:</span>
                      <span className="font-semibold text-foreground">{selectedDoc.docTypeName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Version:</span>
                      <span className="font-mono text-foreground">v{selectedDoc.currentVersionNo}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Approval Status:</span>
                      <span className="font-semibold text-foreground">{selectedDoc.approvalStatus}</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <a
                      href={fileSrc}
                      target="_blank"
                      rel="noreferrer"
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-surface/80 text-foreground inline-flex items-center gap-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open document</span>
                    </a>
                    <a
                      href={`${fileSrc}?download=1`}
                      download={selectedDoc.originalFileName}
                      className="px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground inline-flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      <span>Download file</span>
                    </a>
                  </div>
                </div>
              );
            })()}
          </div>
          <aside className="w-full lg:w-[360px] shrink-0 border-t lg:border-t-0 lg:border-l border-border bg-surface overflow-y-auto">
            <DmsDocumentPanel
              documentId={selectedDoc.id}
              onChanged={(updated) => {
                loadFolderDocuments();
                loadFolderTree();
                if (updated) setSelectedDoc(updated);
                else setSelectedDoc(null);
              }}
            />
          </aside>
          </div>
        </div>
      )}
    </div>
  );
};
