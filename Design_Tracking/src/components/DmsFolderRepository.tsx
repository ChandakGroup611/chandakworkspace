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
  Trash2,
  Link2,
  Star,
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
  deleteDocumentAction,
  bulkDeleteDocumentsAction,
  uploadDocumentVersionAction,
  type DmsRights
} from "@/lib/actions/dms-core";
import { isUploadedWithin24Hours } from "@/lib/dms/filename-rules";
import {
  bulkApproveQcAction,
  exportFolderIndexCsvAction,
  fetchFavouriteIdsAction,
  importFolderIndexCsvAction,
  toggleFavouriteAction,
} from "@/lib/actions/dms-extras";
import { DmsSplitIndexingWizard } from "./DmsSplitIndexingWizard";
import { DmsDocumentPanel, formatBytes } from "./DmsDocumentPanel";
import { DmsQcQueueView, DmsRecycleBinView } from "./DmsBinAndQcViews";
import { DmsSearchView } from "./DmsSearchView";
import { DmsMastersView } from "./DmsMastersView";
import { DmsShareDialog, DmsSharesView } from "./DmsShares";
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
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [favouriteIds, setFavouriteIds] = useState<Set<string>>(new Set());
  const [favouritesOnly, setFavouritesOnly] = useState<boolean>(false);
  const [bulkSharing, setBulkSharing] = useState<boolean>(false);
  const [shareSingleDoc, setShareSingleDoc] = useState<DmsDocumentSummary | null>(null);
  const [showFieldsMenu, setShowFieldsMenu] = useState<boolean>(false);
  const [visibleCols, setVisibleCols] = useState({
    docId: true,
    uploadedDate: true,
    uploadedBy: true,
    docType: true,
    version: true,
    qc: true,
    lock: true,
    size: true,
  });

  // Subfolder creation modal state
  const [showCreateFolderModal, setShowCreateFolderModal] = useState<boolean>(false);
  const [newFolderName, setNewFolderName] = useState<string>("");
  const [newFolderApprovalRequired, setNewFolderApprovalRequired] = useState<boolean>(true);
  const [replicateFromFolderId, setReplicateFromFolderId] = useState<string>("");
  const [isCreatingFolder, setIsCreatingFolder] = useState<boolean>(false);
  const [editingRenamePattern, setEditingRenamePattern] = useState<boolean>(false);
  const [renameSep, setRenameSep] = useState<"_" | "-" | ".">("_");
  const [renameParts, setRenameParts] = useState<string>("docType,title,version");
  const [versionUploadDoc, setVersionUploadDoc] = useState<DmsDocumentSummary | null>(null);
  const [versionFile, setVersionFile] = useState<File | null>(null);
  const [versionWhatChanged, setVersionWhatChanged] = useState<string>("");
  const [versionRemark, setVersionRemark] = useState<string>("");
  const [isUploadingVersion, setIsUploadingVersion] = useState<boolean>(false);

  // Split Indexing Wizard Modal State
  const [showIndexingWizard, setShowIndexingWizard] = useState<boolean>(false);

  // Folder Permissions Modal State
  const [showPermissionsModal, setShowPermissionsModal] = useState<boolean>(false);
  const [folderForPermissions, setFolderForPermissions] = useState<DmsFolderNode | null>(null);

  // Selected document detail drawer & in-app viewer modal
  const [selectedDoc, setSelectedDoc] = useState<DmsDocumentSummary | null>(null);
  const [docModalMode, setDocModalMode] = useState<"PREVIEW" | "DETAILS">("PREVIEW");
  const [panelInitialTab, setPanelInitialTab] = useState<"details" | "versions" | "activity">("details");
  const [panelInitialEditing, setPanelInitialEditing] = useState<boolean>(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [actionMenuPos, setActionMenuPos] = useState<{ top: number; right: number } | null>(null);
  const [docViewerZoom, setDocViewerZoom] = useState<number>(1);

  // Which list the main area shows, and what the person may do in the open folder
  const [view, setView] = useState<"FOLDER" | "SEARCH" | "QC" | "BIN" | "MASTERS" | "SHARES">("FOLDER");
  const [folderRights, setFolderRights] = useState<DmsRights | null>(null);
  const [docsError, setDocsError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState<string | null>(null);

  const flatFolders = useMemo(() => {
    const out: { id: string; name: string }[] = [];
    const walk = (nodes: DmsFolderNode[], prefix = "") => {
      for (const n of nodes) {
        const label = prefix ? `${prefix} / ${n.name}` : n.name;
        out.push({ id: n.id, name: label });
        if (n.children?.length) walk(n.children, label);
      }
    };
    walk(folders);
    return out;
  }, [folders]);

  const folderBreadcrumb = useMemo(() => {
    if (!selectedFolder) return [] as DmsFolderNode[];
    const pathNodes: DmsFolderNode[] = [];
    const findPath = (nodes: DmsFolderNode[], targetId: string): boolean => {
      for (const n of nodes) {
        pathNodes.push(n);
        if (n.id === targetId) return true;
        if (n.children?.length && findPath(n.children, targetId)) return true;
        pathNodes.pop();
      }
      return false;
    };
    findPath(folders, selectedFolder.id);
    return pathNodes;
  }, [folders, selectedFolder]);

  const currentSubfolders = useMemo(() => {
    const list = selectedFolder ? selectedFolder.children || [] : folders;
    const q = folderSearchQuery.trim().toLowerCase();
    return q ? list.filter((f) => f.name.toLowerCase().includes(q)) : list;
  }, [folders, selectedFolder, folderSearchQuery]);

  const displayedDocuments = useMemo(
    () => (favouritesOnly ? documents.filter((d) => favouriteIds.has(d.id)) : documents),
    [documents, favouritesOnly, favouriteIds]
  );

  useEffect(() => {
    fetchFavouriteIdsAction().then((res) => {
      if (res.success) setFavouriteIds(new Set(res.ids));
    });
  }, []);

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
        replicateFromFolderId: replicateFromFolderId || undefined,
      });

      if (res.success && res.folder) {
        setShowCreateFolderModal(false);
        setNewFolderName("");
        setReplicateFromFolderId("");
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
            onClick={() => setView(view === "SHARES" ? "FOLDER" : "SHARES")}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border border-border transition-colors cursor-pointer ${view === "SHARES" ? "bg-accent-soft text-primary" : "bg-surface text-foreground"}`}
          >
            <Link2 className="h-3.5 w-3.5 text-primary" />
            <span>Shared links</span>
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

      {/* 2. FULL-WIDTH FOLDER NAVIGATOR (BREADCRUMB + SUBFOLDERS) & DOCUMENT REGISTER / DEDICATED DOCUMENT PAGE */}
      <div className="space-y-4">
        {selectedDoc && docModalMode === "DETAILS" ? (
          <section className="w-full bg-surface border border-border rounded-lg shadow-xs overflow-hidden">
            <div className="px-4 py-3 border-b border-border bg-sunken flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setSelectedDoc(null)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-sunken text-foreground cursor-pointer"
                >
                  &larr; Back to folder
                </button>
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-sm font-semibold text-foreground truncate">{selectedDoc.title}</h2>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-primary">
                      {selectedDoc.docTypeCode}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[11px] font-mono bg-surface border border-border text-muted-foreground">
                      v{selectedDoc.currentVersionNo} Live
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    {selectedDoc.originalFileName} &bull; {formatBytes(selectedDoc.fileSizeBytes)}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => setDocModalMode("PREVIEW")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-sunken text-foreground inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Eye className="h-3.5 w-3.5 text-primary" />
                  <span>Preview Document</span>
                </button>
                <a
                  href={`/api/proxy-attachment/${selectedDoc.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-sunken text-foreground inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                  <span>Open in tab</span>
                </a>
              </div>
            </div>
            <div className="p-4 sm:p-6">
              <DmsDocumentPanel
                documentId={selectedDoc.id}
                folders={flatFolders}
                folderDocs={documents.filter((d) => d.id !== selectedDoc.id).map((d) => ({ id: d.id, title: d.title }))}
                initialTab={panelInitialTab}
                initialEditing={panelInitialEditing}
                onChanged={(updated) => {
                  loadFolderDocuments();
                  loadFolderTree();
                  if (updated) setSelectedDoc(updated);
                  else setSelectedDoc(null);
                }}
              />
            </div>
          </section>
        ) : (
        <>
        {view === "FOLDER" && (
          <section className="bg-surface border border-border rounded-lg p-3.5 space-y-3 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-border">
              <div className="flex flex-wrap items-center gap-1 text-xs">
                <FolderTree className="h-3.5 w-3.5 text-primary mr-1" />
                {folderBreadcrumb.length === 0 ? (
                  <span className="font-semibold text-foreground">All Folders</span>
                ) : (
                  folderBreadcrumb.map((node, idx) => (
                    <React.Fragment key={node.id}>
                      {idx > 0 && <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                      <button
                        type="button"
                        onClick={() => {
                          if (node.canOpen !== false) setSelectedFolder(node);
                        }}
                        className={`px-1.5 py-0.5 rounded hover:bg-sunken transition-colors ${
                          idx === folderBreadcrumb.length - 1 ? "font-semibold text-primary bg-accent-soft" : "text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {node.name}
                      </button>
                    </React.Fragment>
                  ))
                )}
              </div>
              <div className="flex items-center gap-2">
                <select
                  aria-label="Jump to folder"
                  value={selectedFolder?.id || ""}
                  onChange={(e) => {
                    const targetId = e.target.value;
                    const findNode = (nodes: DmsFolderNode[]): DmsFolderNode | null => {
                      for (const n of nodes) {
                        if (n.id === targetId) return n;
                        const c = n.children?.length ? findNode(n.children) : null;
                        if (c) return c;
                      }
                      return null;
                    };
                    const found = findNode(folders);
                    if (found && found.canOpen !== false) setSelectedFolder(found);
                  }}
                  className="text-xs rounded-lg bg-surface border border-border px-2.5 py-1 text-foreground"
                >
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
                <div className="relative w-40 sm:w-48">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={folderSearchQuery}
                    onChange={(e) => setFolderSearchQuery(e.target.value)}
                    placeholder="Filter subfolders…"
                    className="w-full text-xs rounded-lg bg-surface border border-border pl-8 pr-2.5 py-1 text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>
                <button
                  aria-label="Refresh folders"
                  type="button"
                  onClick={loadFolderTree}
                  className="p-1.5 hover:bg-sunken rounded-md text-muted-foreground hover:text-foreground border border-border"
                  title="Refresh folders"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {currentSubfolders.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-2">
                {currentSubfolders.map((sub) => (
                  <div
                    key={sub.id}
                    onClick={() => {
                      if (sub.canOpen !== false) setSelectedFolder(sub);
                    }}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) {
                        e.preventDefault();
                        (e.currentTarget as HTMLElement).click();
                      }
                    }}
                    className="group flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border border-border bg-surface hover:bg-sunken hover:border-primary/40 cursor-pointer transition-all text-xs"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Folder className="h-4 w-4 shrink-0 text-warning-text fill-warning" />
                      <span className="font-medium truncate text-foreground">{sub.name}</span>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {sub.documentCount !== undefined && sub.documentCount > 0 && (
                        <span className="text-[10px] font-mono text-muted-foreground px-1.5 py-0.5 rounded-full bg-sunken border border-border">
                          {sub.documentCount}
                        </span>
                      )}
                      {sub.canOpen !== false && (
                        <button
                          aria-label="Folder access & permissions"
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setFolderForPermissions(sub);
                            setShowPermissionsModal(true);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-accent-soft text-muted-foreground hover:text-primary transition-opacity"
                          title="Folder access & permissions"
                        >
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        )}

        {/* MAIN STAGE: FULL-WIDTH DOCUMENT REGISTER TABLE */}
        <main className="w-full bg-surface border border-border rounded-lg p-4 space-y-4 shadow-xs">
          {view !== "FOLDER" ? (
            <>
              <div className="flex items-center justify-between pb-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">
                  {view === "SEARCH" ? "Search documents" : view === "MASTERS" ? "Master tables" : view === "SHARES" ? "Shared outside the company" : view === "QC" ? "Waiting for your QC decision" : "Recycle bin"}
                </h2>
                <button
                  type="button"
                  onClick={() => setView("FOLDER")}
                  className="px-3 py-1.5 rounded-lg border border-border bg-surface hover:bg-sunken text-xs font-semibold text-foreground cursor-pointer"
                >
                  &larr; Back to folders
                </button>
              </div>
              {view === "SHARES" ? (
                <DmsSharesView />
              ) : view === "MASTERS" ? (
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
                    <button type="submit" className="px-2.5 py-1 rounded-md bg-primary text-primary-foreground text-[11px] font-semibold">Save</button>
                    <button type="button" onClick={() => setRenaming(null)} className="px-2.5 py-1 rounded-md border border-border bg-surface text-[11px] font-medium text-muted-foreground hover:bg-sunken">Cancel</button>
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
                <div className="flex flex-wrap gap-2 mt-2">
                  <button
                    type="button"
                    onClick={() => setRenaming(selectedFolder.name)}
                    className="px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-sunken text-[11px] font-medium text-foreground cursor-pointer"
                  >
                    Rename
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleFolderQc(selectedFolder)}
                    className="px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-sunken text-[11px] font-medium text-foreground cursor-pointer"
                  >
                    {selectedFolder.approvalRequired ? "Stop requiring QC" : "Require QC"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setRenameSep(selectedFolder.renamePattern?.separator || "_");
                      setRenameParts((selectedFolder.renamePattern?.parts || ["docType", "title", "version"]).join(","));
                      setEditingRenamePattern((v) => !v);
                    }}
                    className="px-2.5 py-1 rounded-md border border-border bg-surface hover:bg-sunken text-[11px] font-medium text-foreground cursor-pointer"
                  >
                    Download rename
                  </button>
                  {selectedFolder.parentId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteFolder(selectedFolder)}
                      className="px-2.5 py-1 rounded-md border border-danger-border/60 bg-surface hover:bg-danger-soft/40 text-[11px] font-medium text-danger-text cursor-pointer"
                    >
                      Delete folder
                    </button>
                  )}
                </div>
              )}
              {selectedFolder && editingRenamePattern && (
                <div className="mt-2 p-2 rounded-lg border border-border bg-surface/60 flex flex-wrap items-center gap-1.5 text-[11px]">
                  <span className="font-semibold text-muted-foreground">Auto-rename on download:</span>
                  <select
                    aria-label="Download rename separator"
                    value={renameSep}
                    onChange={(e) => setRenameSep(e.target.value as "_" | "-" | ".")}
                    className="rounded border border-border bg-background px-1.5 py-0.5"
                  >
                    <option value="_">_</option>
                    <option value="-">-</option>
                    <option value=".">.</option>
                  </select>
                  <input
                    value={renameParts}
                    onChange={(e) => setRenameParts(e.target.value)}
                    placeholder="docType,title,version,date"
                    className="flex-1 min-w-[160px] rounded border border-border bg-background px-2 py-0.5"
                    title="Up to 5 tokens: docType, title, version, date, or field UUID"
                  />
                  <button
                    type="button"
                    onClick={async () => {
                      const parts = renameParts.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 5);
                      const res = await updateFolderAction({
                        folderId: selectedFolder.id,
                        renamePattern: parts.length ? { separator: renameSep, parts } : null,
                      });
                      if (res.success) {
                        toast.success(parts.length ? "Download rename pattern saved" : "Download rename cleared");
                        setEditingRenamePattern(false);
                        await loadFolderTree();
                      } else toast.error(res.error);
                    }}
                    className="px-2 py-0.5 rounded bg-primary text-primary-foreground font-semibold"
                  >
                    Save
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await updateFolderAction({ folderId: selectedFolder.id, renamePattern: null });
                      if (res.success) {
                        toast.success("Download rename cleared");
                        setEditingRenamePattern(false);
                        await loadFolderTree();
                      }
                    }}
                    className="px-2 py-0.5 rounded border border-border text-muted-foreground"
                  >
                    Clear
                  </button>
                </div>
              )}
            </div>

            {/* Document Search, Show Fields & Bulk Actions */}
            <div className="flex flex-wrap items-center gap-2 relative">
              {selectedDocIds.size > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-primary/30 bg-accent-soft/50 px-2.5 py-1 text-[11px]">
                  <span className="font-semibold text-foreground">{selectedDocIds.size} selected</span>
                  <button
                    type="button"
                    onClick={() => {
                      const rows = documents.filter((d) => selectedDocIds.has(d.id));
                      const csv = [
                        ["Title", "File Name", "Doc Type", "Version", "QC Status", "Size (Bytes)"].join(","),
                        ...rows.map((d) =>
                          [d.title, d.originalFileName, d.docTypeCode, `v${d.currentVersionNo}`, d.approvalStatus, d.fileSizeBytes]
                            .map((v) => `"${String(v ?? "").replace(/"/g, '""')}"`)
                            .join(",")
                        ),
                      ].join("\n");
                      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = `${selectedFolder?.name || "dms"}-documents.csv`;
                      a.click();
                      URL.revokeObjectURL(url);
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-border font-medium hover:bg-surface/80"
                  >
                    Export CSV
                  </button>
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-2 py-0.5 rounded bg-surface border border-border font-medium hover:bg-surface/80"
                  >
                    Print
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const approved = documents.filter((d) => selectedDocIds.has(d.id) && d.approvalStatus === "APPROVED" && d.rights?.email);
                      if (approved.length === 0) return toast.info("Select at least one QC-approved document you can share.");
                      setBulkSharing(true);
                    }}
                    className="px-2 py-0.5 rounded bg-surface border border-border font-medium hover:bg-surface/80"
                  >
                    Share
                  </button>
                  {folderRights?.qc && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await bulkApproveQcAction(Array.from(selectedDocIds), "Bulk approved from folder");
                        if (res.success) {
                          toast.success(`Approved ${res.approved} document(s)${res.skipped ? ` (${res.skipped} skipped)` : ""}`);
                          setSelectedDocIds(new Set());
                          loadFolderDocuments();
                        } else toast.error(res.error || "Bulk QC approval failed");
                      }}
                      className="px-2 py-0.5 rounded bg-success-solid text-white font-medium hover:brightness-95"
                    >
                      Approve QC
                    </button>
                  )}
                  {folderRights?.delete && (
                    <button
                      type="button"
                      onClick={async () => {
                        const res = await bulkDeleteDocumentsAction(Array.from(selectedDocIds));
                        if (res.success) {
                          toast.success(`Moved ${res.deleted} document(s) to recycle bin`);
                          setSelectedDocIds(new Set());
                          loadFolderDocuments();
                          loadFolderTree();
                        } else {
                          toast.error(res.error || "Bulk delete failed");
                        }
                      }}
                      className="px-2 py-0.5 rounded bg-danger-solid text-white font-medium hover:brightness-95"
                    >
                      Delete
                    </button>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={() => setFavouritesOnly((v) => !v)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium ${
                  favouritesOnly
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-600"
                    : "border-border bg-surface text-foreground hover:bg-surface/80"
                }`}
                title="Show only favourite documents"
              >
                <Star className={`h-3.5 w-3.5 ${favouritesOnly ? "fill-amber-500 text-amber-500" : "text-muted-foreground"}`} />
                <span>Favourites</span>
              </button>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowFieldsMenu((v) => !v)}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80"
                >
                  <Filter className="h-3.5 w-3.5 text-muted-foreground" />
                  <span>Show Fields</span>
                </button>
                {showFieldsMenu && (
                  <div className="absolute right-0 top-full mt-1 z-30 w-44 rounded-lg border border-border bg-elevated p-2 shadow-lg space-y-1 text-xs">
                    {([
                      ["docId", "ID"],
                      ["uploadedDate", "Uploaded Date"],
                      ["uploadedBy", "Uploaded By"],
                      ["size", "File size"],
                      ["docType", "Doc-Set Type"],
                      ["version", "Version"],
                      ["qc", "Status"],
                      ["lock", "Lock"],
                    ] as const).map(([key, label]) => (
                      <label key={key} className="flex items-center gap-2 px-1.5 py-1 rounded hover:bg-surface cursor-pointer">
                        <input
                          type="checkbox"
                          checked={visibleCols[key]}
                          onChange={(e) => setVisibleCols((prev) => ({ ...prev, [key]: e.target.checked }))}
                        />
                        <span>{label}</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>

              {selectedFolder && (
                <>
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await exportFolderIndexCsvAction(selectedFolder.id);
                      if (!res.success) return toast.error(res.error);
                      const blob = new Blob([res.csv], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = res.fileName;
                      a.click();
                      URL.revokeObjectURL(url);
                      toast.success("Folder index template exported");
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80"
                    title="Export folder document index CSV (Bulk Indexing template)"
                  >
                    <Download className="h-3.5 w-3.5 text-muted-foreground" />
                    <span>Index CSV</span>
                  </button>
                  {folderRights?.edit && (
                    <label
                      className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-surface/80 cursor-pointer"
                      title="Import edited folder index CSV to bulk-update titles & doc types"
                    >
                      <Upload className="h-3.5 w-3.5 text-muted-foreground" />
                      <span>Import CSV</span>
                      <input
                        type="file"
                        accept=".csv"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          const text = await file.text();
                          const lines = text.split(/\r?\n/).filter((l) => l.trim());
                          if (lines.length < 2) return toast.info("CSV needs a header row and at least 1 data row.");
                          const parseRow = (line: string) => {
                            const out: string[] = [];
                            let cur = "";
                            let inQ = false;
                            for (let i = 0; i < line.length; i++) {
                              const ch = line[i];
                              if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                              else if (ch === '"') inQ = !inQ;
                              else if (ch === "," && !inQ) { out.push(cur); cur = ""; }
                              else cur += ch;
                            }
                            out.push(cur);
                            return out.map((c) => c.trim());
                          };
                          const rows = lines.slice(1).map((l) => {
                            const cols = parseRow(l);
                            return { documentId: cols[0] || "", title: cols[1] || "", docTypeCode: cols[3] || "" };
                          });
                          const res = await importFolderIndexCsvAction({ folderId: selectedFolder.id, rows });
                          if (res.success) {
                            toast.success(`Updated ${res.updated} document(s)${res.skipped ? ` (${res.skipped} skipped)` : ""}`);
                            loadFolderDocuments();
                          } else toast.error(res.error);
                        }}
                      />
                    </label>
                  )}
                </>
              )}

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
                  <th className="py-2.5 px-3 w-8">
                    <input
                      type="checkbox"
                      aria-label="Select all documents"
                      checked={documents.length > 0 && selectedDocIds.size === documents.length}
                      onChange={(e) => {
                        if (e.target.checked) setSelectedDocIds(new Set(documents.map((d) => d.id)));
                        else setSelectedDocIds(new Set());
                      }}
                    />
                  </th>
                  <th className="py-2.5 px-2 w-12 text-center">#</th>
                  {visibleCols.docId && <th className="py-2.5 px-3">ID</th>}
                  <th className="py-2.5 px-3">Doc Name</th>
                  {visibleCols.uploadedDate && <th className="py-2.5 px-3">Uploaded Date</th>}
                  {visibleCols.uploadedBy && <th className="py-2.5 px-3">Uploaded By</th>}
                  {visibleCols.size && <th className="py-2.5 px-3">File size</th>}
                  {visibleCols.docType && <th className="py-2.5 px-3">Doc-Set Type</th>}
                  {visibleCols.version && <th className="py-2.5 px-3">Version</th>}
                  {visibleCols.qc && <th className="py-2.5 px-3">Status</th>}
                  {visibleCols.lock && <th className="py-2.5 px-3">Lock</th>}
                  <th className="py-2.5 px-3 text-right">Action</th>
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
                  ) : displayedDocuments.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-muted-foreground space-y-2">
                      <FileText className="h-8 w-8 mx-auto opacity-40" />
                      <p className="font-medium text-xs">{favouritesOnly ? "No favourite documents in this folder." : "No documents in this folder."}</p>
                      {!favouritesOnly && folderRights?.upload && (
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
                  displayedDocuments.map((doc, rowIdx) => (
                    <tr
                      key={doc.id}
                      onClick={() => setSelectedDoc(doc)}
                      className="hover:bg-surface/50 cursor-pointer transition-colors"
                    >
                      <td className="py-2.5 px-3" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select ${doc.title}`}
                          checked={selectedDocIds.has(doc.id)}
                          onChange={(e) => {
                            setSelectedDocIds((prev) => {
                              const next = new Set(prev);
                              if (e.target.checked) next.add(doc.id);
                              else next.delete(doc.id);
                              return next;
                            });
                          }}
                        />
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono text-[11px] text-muted-foreground tabular-nums">
                        {rowIdx + 1}
                      </td>
                      {visibleCols.docId && (
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground" title={doc.id}>
                          {doc.id.slice(0, 8)}
                        </td>
                      )}
                      <td className="py-2.5 px-3 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-primary shrink-0" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold truncate">{doc.title}</span>
                              {isUploadedWithin24Hours(doc.createdAt) && (
                                <span className="px-1.5 py-0.5 rounded bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold uppercase shrink-0">
                                  New
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-muted-foreground font-mono truncate block">
                              {doc.originalFileName}
                            </span>
                          </div>
                        </div>
                      </td>

                      {visibleCols.uploadedDate && (
                        <td className="py-2.5 px-3 text-[11px] text-muted-foreground whitespace-nowrap">
                          {new Date(doc.createdAt).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Kolkata" })}
                        </td>
                      )}

                      {visibleCols.uploadedBy && (
                        <td className="py-2.5 px-3 text-[11px] text-foreground truncate max-w-[140px]">
                          {doc.createdByName || "–"}
                        </td>
                      )}

                      {visibleCols.size && (
                        <td className="py-2.5 px-3 font-mono text-[11px] text-muted-foreground whitespace-nowrap">
                          {formatBytes(doc.fileSizeBytes)}
                        </td>
                      )}

                      {visibleCols.docType && (
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-accent-soft text-primary whitespace-nowrap">
                            {doc.docTypeCode}
                          </span>
                        </td>
                      )}

                      {visibleCols.version && (
                        <td className="py-2.5 px-3 font-mono text-[11px]">
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-accent-soft text-primary font-semibold">
                            v{doc.currentVersionNo}
                            <span className="text-[9px] uppercase">Live</span>
                          </span>
                        </td>
                      )}

                      {visibleCols.qc && (
                        <td className="py-2.5 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
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
                      )}

                      {visibleCols.lock && (
                        <td className="py-2.5 px-3">
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] ${doc.isLocked ? "text-warning-text" : "text-muted-foreground"}`}
                            title={doc.isLocked ? `Checked out by ${doc.lockedByMe ? "you" : doc.lockedByName}` : "Available"}
                          >
                            {doc.isLocked ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                            {doc.isLocked ? (doc.lockedByMe ? "You" : doc.lockedByName) : ""}
                          </span>
                        </td>
                      )}

                      <td className="py-2.5 px-3 text-right">
                        <div className="relative flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            onClick={async () => {
                              const res = await toggleFavouriteAction(doc.id);
                              if (res.success) {
                                setFavouriteIds((prev) => {
                                  const next = new Set(prev);
                                  if (res.isFavourite) next.add(doc.id);
                                  else next.delete(doc.id);
                                  return next;
                                });
                                toast.success(res.isFavourite ? "Added to Favourites" : "Removed from Favourites");
                              } else toast.error(res.error);
                            }}
                            className="p-1 hover:bg-surface rounded-md text-muted-foreground hover:text-amber-500 cursor-pointer"
                            title={favouriteIds.has(doc.id) ? "Remove favourite" : "Mark favourite"}
                            aria-label={favouriteIds.has(doc.id) ? "Remove favourite" : "Mark favourite"}
                          >
                            <Star className={`h-3.5 w-3.5 ${favouriteIds.has(doc.id) ? "fill-amber-500 text-amber-500" : ""}`} />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              if (openActionMenuId === doc.id) {
                                setOpenActionMenuId(null);
                                setActionMenuPos(null);
                              } else {
                                const rect = e.currentTarget.getBoundingClientRect();
                                const menuHeight = 290;
                                const openUp = rect.bottom + menuHeight > window.innerHeight - 16;
                                setActionMenuPos({
                                  top: openUp ? Math.max(12, rect.top - menuHeight) : rect.bottom + 4,
                                  right: Math.max(12, window.innerWidth - rect.right),
                                });
                                setOpenActionMenuId(doc.id);
                              }
                            }}
                            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-border bg-surface text-[11px] font-semibold text-foreground hover:bg-sunken cursor-pointer"
                            title="Document actions"
                          >
                            <span>Actions</span>
                            <ChevronDown className="h-3 w-3" />
                          </button>
                          {openActionMenuId === doc.id && actionMenuPos && (
                            <>
                              <div
                                className="fixed inset-0 z-50"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setActionMenuPos(null);
                                }}
                              />
                              <div
                                style={{ top: actionMenuPos.top, right: actionMenuPos.right }}
                                className="fixed z-50 w-52 rounded-lg border border-border bg-elevated shadow-xl py-1 text-left text-xs"
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPos(null);
                                    setDocModalMode("PREVIEW");
                                    setPanelInitialTab("details");
                                    setPanelInitialEditing(false);
                                    setSelectedDoc(doc);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                >
                                  <Eye className="h-3.5 w-3.5 text-primary" /> Preview
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPos(null);
                                    setDocModalMode("DETAILS");
                                    setPanelInitialTab("details");
                                    setPanelInitialEditing(false);
                                    setSelectedDoc(doc);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                >
                                  <Info className="h-3.5 w-3.5 text-primary" /> Information
                                </button>
                                {doc.rights?.edit && (!doc.isLocked || doc.lockedByMe) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setActionMenuPos(null);
                                      setDocModalMode("DETAILS");
                                      setPanelInitialTab("details");
                                      setPanelInitialEditing(true);
                                      setSelectedDoc(doc);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                  >
                                    <FileText className="h-3.5 w-3.5 text-primary" /> Edit &amp; Indexing
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPos(null);
                                    setDocModalMode("DETAILS");
                                    setPanelInitialTab("versions");
                                    setPanelInitialEditing(false);
                                    setSelectedDoc(doc);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                >
                                  <Layers className="h-3.5 w-3.5 text-primary" /> Versions (v{doc.currentVersionNo} Live)
                                </button>
                                {(doc.rights?.upload || doc.rights?.edit) && (!doc.isLocked || doc.lockedByMe) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setActionMenuPos(null);
                                      setVersionUploadDoc(doc);
                                      setVersionFile(null);
                                      setVersionWhatChanged("");
                                      setVersionRemark("");
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                  >
                                    <Upload className="h-3.5 w-3.5 text-primary" /> Data Versioning (+ v{doc.currentVersionNo + 1})
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPos(null);
                                    setDocModalMode("DETAILS");
                                    setPanelInitialTab("activity");
                                    setPanelInitialEditing(false);
                                    setSelectedDoc(doc);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                >
                                  <Clock className="h-3.5 w-3.5 text-primary" /> File Status / Audit
                                </button>
                                <button
                                  type="button"
                                  disabled={!doc.rights?.email || doc.approvalStatus !== "APPROVED"}
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    setActionMenuPos(null);
                                    setShareSingleDoc(doc);
                                  }}
                                  className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground disabled:opacity-50"
                                  title={doc.approvalStatus !== "APPROVED" ? "Approve QC first to share outside the company" : "Share outside the company"}
                                >
                                  <Link2 className="h-3.5 w-3.5 text-primary" />
                                  <span>{doc.approvalStatus === "APPROVED" ? "Share" : "Share (Approve QC first)"}</span>
                                </button>
                                {doc.rights?.download && (
                                  <a
                                    href={`/api/proxy-attachment/${doc.id}?download=1`}
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setActionMenuPos(null);
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-surface flex items-center gap-2 text-foreground"
                                  >
                                    <Download className="h-3.5 w-3.5 text-primary" /> Download
                                  </a>
                                )}
                                {doc.rights?.delete && (!doc.isLocked || doc.lockedByMe) && (
                                  <button
                                    type="button"
                                    onClick={async () => {
                                      setOpenActionMenuId(null);
                                      setActionMenuPos(null);
                                      const res = await deleteDocumentAction(doc.id);
                                      if (res.success) {
                                        toast.success("Moved to recycle bin");
                                        loadFolderDocuments();
                                        loadFolderTree();
                                      } else toast.error(res.error || "Could not delete document.");
                                    }}
                                    className="w-full px-3 py-1.5 hover:bg-danger-soft/50 flex items-center gap-2 text-danger-text"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" /> Delete
                                  </button>
                                )}
                              </div>
                            </>
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
        </>
        )}
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

              <div>
                <label className="text-xs font-semibold text-muted-foreground">
                  Copy settings from folder (optional)
                </label>
                <select
                  value={replicateFromFolderId}
                  onChange={(e) => setReplicateFromFolderId(e.target.value)}
                  className="w-full mt-1 text-xs rounded-lg bg-surface border border-border p-2 text-foreground"
                >
                  <option value="">None (start with defaults)</option>
                  {flatFolders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Copies QC, auto-index, and download rename settings (user permissions are not copied).
                </p>
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

      {/* IN-APP UPLOADED DOCUMENT PREVIEW MODAL */}
      {selectedDoc && docModalMode === "PREVIEW" && (
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
              <div className="flex items-center gap-1 bg-surface border border-border rounded-lg px-2 py-1 mr-1">
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
              <button
                type="button"
                onClick={() => setDocModalMode("DETAILS")}
                className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-surface border border-border hover:bg-sunken text-foreground inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Info className="h-3.5 w-3.5 text-primary" />
                <span>Information &amp; Audit</span>
              </button>

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
                className="p-1.5 hover:bg-surface text-muted-foreground hover:text-foreground rounded-lg ml-1 cursor-pointer"
                title="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </header>

          <div className="flex-1 flex flex-col overflow-hidden">
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
                    <iframe
                      src={fileSrc}
                      className="w-full h-full flex-1 border-none"
                      title={selectedDoc.title}
                    />
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
          </div>
        </div>
      )}

      {shareSingleDoc && (
        <DmsShareDialog
          documents={[{ id: shareSingleDoc.id, title: shareSingleDoc.title }]}
          onClose={() => setShareSingleDoc(null)}
          onCreated={() => {
            setShareSingleDoc(null);
          }}
        />
      )}

      {bulkSharing && (
        <DmsShareDialog
          documents={documents
            .filter((d) => selectedDocIds.has(d.id) && d.approvalStatus === "APPROVED" && d.rights?.email)
            .map((d) => ({ id: d.id, title: d.title }))}
          onClose={() => setBulkSharing(false)}
          onCreated={() => {
            setBulkSharing(false);
            setSelectedDocIds(new Set());
          }}
        />
      )}

      {versionUploadDoc && (
        <div className="fixed inset-0 z-60 bg-[var(--overlay)] flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-lg shadow-lg max-w-md w-full overflow-hidden">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <div>
                <h3 className="text-sm font-semibold text-foreground">
                  Upload Version v{versionUploadDoc.currentVersionNo + 1}
                </h3>
                <p className="text-[11px] text-muted-foreground truncate">
                  {versionUploadDoc.title} · Locks v{versionUploadDoc.currentVersionNo} and makes v{versionUploadDoc.currentVersionNo + 1} live
                </p>
              </div>
              <button type="button" aria-label="Close" onClick={() => setVersionUploadDoc(null)} className="p-1 rounded hover:bg-sunken">
                <X className="h-4 w-4" />
              </button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!versionFile || !versionWhatChanged.trim() || !versionRemark.trim()) return;
                setIsUploadingVersion(true);
                const fd = new FormData();
                fd.append("documentId", versionUploadDoc.id);
                fd.append("file", versionFile);
                fd.append("whatChanged", versionWhatChanged.trim());
                fd.append("remark", versionRemark.trim());
                const res = await uploadDocumentVersionAction(fd);
                setIsUploadingVersion(false);
                if (res.success) {
                  toast.success(`Uploaded v${res.versionNo} (v${versionUploadDoc.currentVersionNo} locked, v${res.versionNo} live).`);
                  setVersionUploadDoc(null);
                  loadFolderDocuments();
                } else {
                  toast.error(res.error || "Could not upload version.");
                }
              }}
              className="p-4 space-y-3 text-xs"
            >
              <label className="block space-y-1">
                <span className="font-semibold text-muted-foreground">Select file *</span>
                <input
                  type="file"
                  required
                  onChange={(e) => setVersionFile(e.target.files?.[0] || null)}
                  className="block w-full text-xs"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-muted-foreground">What changed in document *</span>
                <input
                  type="text"
                  required
                  value={versionWhatChanged}
                  onChange={(e) => setVersionWhatChanged(e.target.value)}
                  placeholder="Describe changes…"
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5"
                />
              </label>
              <label className="block space-y-1">
                <span className="font-semibold text-muted-foreground">Remark *</span>
                <input
                  type="text"
                  required
                  value={versionRemark}
                  onChange={(e) => setVersionRemark(e.target.value)}
                  placeholder="Enter remark for audit trail…"
                  className="w-full rounded-lg border border-border bg-background px-2.5 py-1.5"
                />
              </label>
              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button type="button" onClick={() => setVersionUploadDoc(null)} className="px-3 py-1.5 rounded-lg border border-border">
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingVersion || !versionFile || !versionWhatChanged.trim() || !versionRemark.trim()}
                  className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {isUploadingVersion ? "Uploading..." : `Check in v${versionUploadDoc.currentVersionNo + 1}`}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
