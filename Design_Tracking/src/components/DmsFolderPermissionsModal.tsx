"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Folder,
  ShieldCheck,
  Users,
  Search,
  Plus,
  Trash2,
  Check,
  X,
  Lock,
  Unlock,
  Eye,
  Upload,
  Download,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Sparkles,
  Layers,
  Key
} from "lucide-react";
import {
  DmsDocTypePermissionRow,
  DmsFolderNode,
  DmsFolderPermissionItem,
  fetchDocTypePermissionsAction,
  fetchFolderPermissionsAction,
  saveDocTypePermissionAction,
  saveFolderPermissionsAction
} from "@/lib/actions/dms-core";
import { fetchDesignWorkspaceUsersAction } from "@/lib/actions/designTracking";
import { DesignWorkspaceUser } from "@/Design_Tracking/src/types/masterTypes";

interface DmsFolderPermissionsModalProps {
  folder: DmsFolderNode;
  isOpen: boolean;
  onClose: () => void;
  onPermissionsUpdated?: () => void;
  currentUser?: {
    id: string;
    email: string;
    fullName: string;
    roleCode: string;
    isAdmin: boolean;
  };
}

export const DmsFolderPermissionsModal: React.FC<DmsFolderPermissionsModalProps> = ({
  folder,
  isOpen,
  onClose,
  onPermissionsUpdated,
  currentUser
}) => {
  const [inheritPermissions, setInheritPermissions] = useState<boolean>(folder.inheritPermissions ?? true);
  const [assignedPermissions, setAssignedPermissions] = useState<DmsFolderPermissionItem[]>([]);
  const [workspaceUsers, setWorkspaceUsers] = useState<DesignWorkspaceUser[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [canManage, setCanManage] = useState<boolean>(false);
  const [permTab, setPermTab] = useState<"FOLDER" | "DOCTYPE">("FOLDER");
  const [dtGroups, setDtGroups] = useState<{ id: string; code: string; name: string }[]>([]);
  const [dtTypes, setDtTypes] = useState<{ id: string; code: string; name: string }[]>([]);
  const [dtRows, setDtRows] = useState<DmsDocTypePermissionRow[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<string>("");
  const [dtLoaded, setDtLoaded] = useState<boolean>(false);
  const [folderGroups, setFolderGroups] = useState<{ id: string; name: string }[]>([]);
  const [folderDepartments, setFolderDepartments] = useState<{ id: string; code: string; name: string }[]>([]);
  const [shareSettings, setShareSettings] = useState<{ userWise: boolean; groupWise: boolean; departmentWise: boolean }>({
    userWise: true,
    groupWise: true,
    departmentWise: true,
  });

  // Multi-select user picker state
  const [isUserPickerOpen, setIsUserPickerOpen] = useState<boolean>(false);
  const [userSearchQuery, setUserSearchQuery] = useState<string>("");
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [defaultPresetForNewUsers, setDefaultPresetForNewUsers] = useState<"VIEW_ONLY" | "CONTRIBUTOR" | "FULL_ACCESS">("CONTRIBUTOR");

  // Load existing folder permissions and workspace users
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    setIsLoading(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    const loadData = async () => {
      try {
        const [permsRes, usersRes] = await Promise.all([
          fetchFolderPermissionsAction(folder.id),
          fetchDesignWorkspaceUsersAction()
        ]);

        if (!isMounted) return;

        if (usersRes.success && usersRes.users) {
          setWorkspaceUsers(usersRes.users);
        }

        if (permsRes.success) {
          setInheritPermissions(permsRes.inheritPermissions ?? true);
          setAssignedPermissions(permsRes.permissions || []);
          setCanManage(!!permsRes.canManage);
          setFolderGroups(permsRes.groups || []);
          setFolderDepartments(permsRes.departments || []);
          if (permsRes.shareSettings) setShareSettings(permsRes.shareSettings);
        } else {
          setErrorMessage(permsRes.error || "Failed to load permissions");
        }
      } catch (err: any) {
        if (isMounted) {
          console.error("Failed to load folder permissions:", err);
          setErrorMessage(err.message || "Failed to load permissions");
        }
      } finally {
        if (isMounted) setIsLoading(false);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
  }, [folder.id, isOpen]);

  // Filter available users for multi-selection (exclude already added users)
  const existingUserIds = useMemo(() => {
    return new Set(assignedPermissions.map(p => p.userId).filter(Boolean) as string[]);
  }, [assignedPermissions]);

  const availableUsers = useMemo(() => {
    return workspaceUsers.filter(u => !existingUserIds.has(u.id));
  }, [workspaceUsers, existingUserIds]);

  const filteredAvailableUsers = useMemo(() => {
    if (!userSearchQuery.trim()) return availableUsers;
    const q = userSearchQuery.toLowerCase();
    return availableUsers.filter(u => 
      u.fullName.toLowerCase().includes(q) ||
      u.email.toLowerCase().includes(q) ||
      (u.departmentName && u.departmentName.toLowerCase().includes(q)) ||
      (u.roleCode && u.roleCode.toLowerCase().includes(q))
    );
  }, [availableUsers, userSearchQuery]);

  // Toggle user selection in multi-picker
  const toggleUserSelection = (userId: string) => {
    setSelectedUserIds(prev => {
      const next = new Set(prev);
      if (next.has(userId)) {
        next.delete(userId);
      } else {
        next.add(userId);
      }
      return next;
    });
  };

  const selectAllFilteredUsers = () => {
    const next = new Set(selectedUserIds);
    filteredAvailableUsers.forEach(u => next.add(u.id));
    setSelectedUserIds(next);
  };

  const deselectAllUsers = () => {
    setSelectedUserIds(new Set());
  };

  // Add selected users to folder permissions table
  const handleAddSelectedUsers = () => {
    if (selectedUserIds.size === 0) return;

    const newEntries: DmsFolderPermissionItem[] = [];

    selectedUserIds.forEach(uid => {
      const user = workspaceUsers.find(u => u.id === uid);
      if (!user) return;

      const baseCanView = true;
      const baseCanDownload = defaultPresetForNewUsers !== "VIEW_ONLY";
      const baseCanUpload = defaultPresetForNewUsers === "CONTRIBUTOR" || defaultPresetForNewUsers === "FULL_ACCESS";
      const baseCanDelete = defaultPresetForNewUsers === "FULL_ACCESS";
      const baseCanManage = defaultPresetForNewUsers === "FULL_ACCESS";

      newEntries.push({
        id: `temp-${Date.now()}-${uid}`,
        folderId: folder.id,
        userId: user.id,
        userEmail: user.email,
        userName: user.fullName,
        roleCode: user.roleCode || "USER",
        canView: baseCanView,
        canUpload: baseCanUpload,
        canDownload: baseCanDownload,
        canDelete: baseCanDelete,
        canManage: baseCanManage
      });
    });

    setAssignedPermissions(prev => [...prev, ...newEntries]);
    setSelectedUserIds(new Set());
    setIsUserPickerOpen(false);
    setUserSearchQuery("");
  };

  // Permission toggles for existing assigned rows
  const handleTogglePermission = (index: number, key: "canView" | "canUpload" | "canDownload" | "canDelete" | "canManage") => {
    setAssignedPermissions(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };
      target[key] = !target[key];
      // If View is disabled, disable all child rights
      if (key === "canView" && !target.canView) {
        target.canUpload = false;
        target.canDownload = false;
        target.canDelete = false;
        target.canManage = false;
      }
      // If any write right is enabled, automatically enable View
      if ((key === "canUpload" || key === "canDownload" || key === "canDelete" || key === "canManage") && target[key]) {
        target.canView = true;
      }
      updated[index] = target;
      return updated;
    });
  };

  // Apply preset to single user row
  const applyPresetToRow = (index: number, preset: "VIEW_ONLY" | "CONTRIBUTOR" | "FULL_ACCESS") => {
    setAssignedPermissions(prev => {
      const updated = [...prev];
      const target = { ...updated[index] };
      if (preset === "VIEW_ONLY") {
        target.canView = true;
        target.canDownload = true;
        target.canUpload = false;
        target.canDelete = false;
        target.canManage = false;
      } else if (preset === "CONTRIBUTOR") {
        target.canView = true;
        target.canDownload = true;
        target.canUpload = true;
        target.canDelete = false;
        target.canManage = false;
      } else if (preset === "FULL_ACCESS") {
        target.canView = true;
        target.canDownload = true;
        target.canUpload = true;
        target.canDelete = true;
        target.canManage = true;
      }
      updated[index] = target;
      return updated;
    });
  };

  // Remove assigned user row
  const handleRemoveUserPermission = (index: number) => {
    setAssignedPermissions(prev => prev.filter((_, i) => i !== index));
  };

  // Save changes to database
  const handleSaveChanges = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccessMsg(null);

    try {
      const res = await saveFolderPermissionsAction({
        folderId: folder.id,
        inheritPermissions,
        permissions: assignedPermissions
      });

      if (!res.success) {
        throw new Error(res.error || "Failed to save folder permissions");
      }

      setSaveSuccessMsg("Folder permissions updated successfully!");
      if (onPermissionsUpdated) {
        onPermissionsUpdated();
      }

      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.error("Save folder permissions error:", err);
      setErrorMessage(err.message || "Failed to save folder permissions");
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[var(--overlay)] animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-surface border border-border rounded-lg shadow-lg flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-b border-border bg-sunken shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="h-10 w-10 rounded-lg bg-accent-soft text-primary flex items-center justify-center border border-border-active shrink-0">
              <ShieldCheck className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-semibold text-foreground truncate">
                  Folder access & permissions
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-sunken text-foreground border border-border">
                  {folder.name}
                </span>
              </div>
              <p className="text-xs text-muted-foreground font-mono mt-0.5 truncate">
                Path: {folder.path}
              </p>
            </div>
          </div>

          <button aria-label="Close"
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-surface-hover transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          <div className="flex items-center gap-2 border-b border-border pb-2">
            <button
              type="button"
              onClick={() => setPermTab("FOLDER")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${permTab === "FOLDER" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              Folder Access
            </button>
            <button
              type="button"
              onClick={async () => {
                setPermTab("DOCTYPE");
                if (!dtLoaded) {
                  const res = await fetchDocTypePermissionsAction(folder.workspaceId);
                  if (res.success) {
                    setDtGroups(res.groups || []);
                    setDtTypes(res.docTypes || []);
                    setDtRows(res.rows || []);
                    if (res.groups?.[0]) setSelectedGroupId(res.groups[0].id);
                    setDtLoaded(true);
                  } else if (res.error) {
                    setErrorMessage(res.error);
                  }
                }
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${permTab === "DOCTYPE" ? "bg-primary text-primary-foreground" : "border border-border text-muted-foreground"}`}
            >
              Doc-Type Rights (Layer 4)
            </button>
          </div>

          {permTab === "DOCTYPE" ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <p className="text-xs text-muted-foreground">
                  Configure per-group Document-Type permissions (Add, View, Edit, Download, Print, Email, Delete, Private View).
                </p>
                <select
                  aria-label="User group"
                  value={selectedGroupId}
                  onChange={(e) => setSelectedGroupId(e.target.value)}
                  className="text-xs rounded-lg border border-border bg-surface px-2.5 py-1.5"
                >
                  {dtGroups.map((g) => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="overflow-x-auto border border-border rounded-lg">
                <table className="w-full text-left text-xs">
                  <thead className="bg-sunken border-b border-border text-[11px] font-semibold text-muted-foreground">
                    <tr>
                      <th className="py-2 px-3">Document Type</th>
                      <th className="py-2 px-2 text-center">Add</th>
                      <th className="py-2 px-2 text-center">View</th>
                      <th className="py-2 px-2 text-center">Edit</th>
                      <th className="py-2 px-2 text-center">Download</th>
                      <th className="py-2 px-2 text-center">Print</th>
                      <th className="py-2 px-2 text-center">Email</th>
                      <th className="py-2 px-2 text-center">Delete</th>
                      <th className="py-2 px-2 text-center">Private</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {dtTypes.map((dt) => {
                      const cur = dtRows.find((r) => r.groupId === selectedGroupId && r.docTypeId === dt.id) || {
                        groupId: selectedGroupId,
                        groupName: "",
                        docTypeId: dt.id,
                        docTypeCode: dt.code,
                        docTypeName: dt.name,
                        canAdd: false,
                        canView: false,
                        canPrint: false,
                        canEditFields: false,
                        canDelete: false,
                        canDownload: false,
                        canEmail: false,
                        isPrivateView: false,
                      };
                      const toggle = async (key: keyof Pick<DmsDocTypePermissionRow, "canAdd" | "canView" | "canEditFields" | "canDownload" | "canPrint" | "canEmail" | "canDelete" | "isPrivateView">) => {
                        const updated = { ...cur, [key]: !cur[key] };
                        setDtRows((prev) => {
                          const exists = prev.some((r) => r.groupId === selectedGroupId && r.docTypeId === dt.id);
                          return exists ? prev.map((r) => (r.groupId === selectedGroupId && r.docTypeId === dt.id ? updated : r)) : [...prev, updated];
                        });
                        const res = await saveDocTypePermissionAction(updated);
                        if (!res.success) setErrorMessage(res.error || "Could not save document-type right.");
                      };
                      return (
                        <tr key={dt.id}>
                          <td className="py-2 px-3 font-medium">{dt.name} <span className="text-[10px] font-mono text-muted-foreground">({dt.code})</span></td>
                          {(["canAdd", "canView", "canEditFields", "canDownload", "canPrint", "canEmail", "canDelete", "isPrivateView"] as const).map((k) => (
                            <td key={k} className="py-2 px-2 text-center">
                              <input type="checkbox" checked={!!cur[k]} onChange={() => toggle(k)} aria-label={`${dt.name} ${k}`} />
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
          <>
          {/* Notification Messages */}
          {errorMessage && (
            <div className="p-3 rounded-lg bg-danger-soft border border-danger-border text-danger-text text-xs flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {saveSuccessMsg && (
            <div className="p-3 rounded-lg bg-success-soft border border-success-border text-success-text text-xs flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              <span>{saveSuccessMsg}</span>
            </div>
          )}

          {/* 1. Inheritance Option Card */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="h-4 w-4 text-primary" />
                <span className="text-xs font-semibold text-foreground">Permission inheritance</span>
              </div>
              <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                inheritPermissions 
                  ? "bg-info-soft text-info-text border border-info-border" 
                  : "bg-warning-soft text-warning-text border border-warning-border"
              }`}>
                {inheritPermissions ? "Inherited from Parent" : "Custom Folder Access"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                inheritPermissions 
                  ? "bg-surface border-primary ring-1 ring-ring" 
                  : "bg-surface/50 border-border hover:bg-surface"
              }`}>
                <input
                  type="radio"
                  name="inheritance"
                  checked={inheritPermissions}
                  onChange={() => setInheritPermissions(true)}
                  className="mt-0.5 text-primary focus:ring-ring"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Inherit from parent folder</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Users who have access to parent folders automatically receive access to this folder.
                  </p>
                </div>
              </label>

              <label className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                !inheritPermissions 
                  ? "bg-surface border-primary ring-1 ring-ring" 
                  : "bg-surface/50 border-border hover:bg-surface"
              }`}>
                <input
                  type="radio"
                  name="inheritance"
                  checked={!inheritPermissions}
                  onChange={() => setInheritPermissions(false)}
                  className="mt-0.5 text-primary focus:ring-ring"
                />
                <div>
                  <p className="text-xs font-semibold text-foreground">Custom permissions (break inheritance)</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    Define an explicit list of authorised users and their specific View, Upload, Download, and Delete rights.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* 2. User Permission Manager Header & Add Users Button */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-xs font-semibold text-muted-foreground flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5 text-primary" />
                  <span>Folder access list ({assignedPermissions.length} User{assignedPermissions.length !== 1 ? "s" : ""})</span>
                </h3>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Configure who can view, upload, download, and delete documents under this folder.
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 self-start sm:self-center">
                {shareSettings.groupWise && (
                  <select
                    aria-label="Add group to folder"
                    defaultValue=""
                    onChange={(e) => {
                      const gid = e.target.value;
                      e.target.value = "";
                      if (!gid) return;
                      if (assignedPermissions.some((p) => p.groupId === gid)) return;
                      const grp = folderGroups.find((g) => g.id === gid);
                      if (!grp) return;
                      setAssignedPermissions((prev) => [
                        ...prev,
                        {
                          id: `group-${gid}-${Date.now()}`,
                          folderId: folder.id,
                          groupId: gid,
                          userName: `Group: ${grp.name}`,
                          userEmail: "DMS Group",
                          canView: true,
                          canUpload: true,
                          canDownload: true,
                          canDelete: false,
                          canManage: false,
                        },
                      ]);
                    }}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground"
                  >
                    <option value="">+ Add Group…</option>
                    {folderGroups
                      .filter((g) => !assignedPermissions.some((p) => p.groupId === g.id))
                      .map((g) => (
                        <option key={g.id} value={g.id}>{g.name}</option>
                      ))}
                  </select>
                )}
                {shareSettings.departmentWise && (
                  <select
                    aria-label="Add department to folder"
                    defaultValue=""
                    onChange={(e) => {
                      const did = e.target.value;
                      e.target.value = "";
                      if (!did) return;
                      if (assignedPermissions.some((p) => p.departmentId === did)) return;
                      const dep = folderDepartments.find((d) => d.id === did);
                      if (!dep) return;
                      setAssignedPermissions((prev) => [
                        ...prev,
                        {
                          id: `dept-${did}-${Date.now()}`,
                          folderId: folder.id,
                          departmentId: did,
                          departmentName: dep.name,
                          userName: `Dept: ${dep.name}`,
                          userEmail: "Department",
                          canView: true,
                          canUpload: false,
                          canDownload: true,
                          canDelete: false,
                          canManage: false,
                        },
                      ]);
                    }}
                    className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground"
                  >
                    <option value="">+ Add Department…</option>
                    {folderDepartments
                      .filter((d) => !assignedPermissions.some((p) => p.departmentId === d.id))
                      .map((d) => (
                        <option key={d.id} value={d.id}>{d.name}</option>
                      ))}
                  </select>
                )}
                <select
                  aria-label="Add role to folder"
                  defaultValue=""
                  onChange={(e) => {
                    const rc = e.target.value;
                    e.target.value = "";
                    if (!rc) return;
                    if (assignedPermissions.some((p) => !p.userId && !p.groupId && !p.departmentId && String(p.roleCode || "").toUpperCase() === rc)) return;
                    setAssignedPermissions((prev) => [
                      ...prev,
                      {
                        id: `role-${rc}-${Date.now()}`,
                        folderId: folder.id,
                        roleCode: rc,
                        userName: `Role: ${rc}`,
                        userEmail: "Design Role",
                        canView: true,
                        canUpload: rc !== "DESIGN_VIEWER" && rc !== "DESIGN_REVIEWER",
                        canDownload: true,
                        canDelete: rc === "DESIGN_ADMIN",
                        canManage: rc === "DESIGN_ADMIN",
                      },
                    ]);
                  }}
                  className="rounded-lg border border-border bg-surface px-2.5 py-1.5 text-xs font-medium text-foreground"
                >
                  <option value="">+ Add Role…</option>
                  <option value="DESIGN_ADMIN">Design Admin</option>
                  <option value="DESIGN_ARCHITECT">Architect</option>
                  <option value="DESIGN_ENGINEER">Engineer</option>
                  <option value="DESIGN_REVIEWER">Reviewer / QC</option>
                  <option value="DESIGN_VIEWER">Viewer</option>
                </select>
                {shareSettings.userWise && (
                  <button
                    type="button"
                    onClick={() => setIsUserPickerOpen(!isUserPickerOpen)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 transition-opacity shadow-xs cursor-pointer"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>{isUserPickerOpen ? "Hide User Picker" : "Add Users (Multi-Select)"}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Multi-Select User Picker Popover */}
            {isUserPickerOpen && (
              <div className="p-4 rounded-lg bg-surface border border-border-active ring-1 ring-ring space-y-3 shadow-md animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-primary" />
                    <span className="text-xs font-semibold text-foreground">Select multiple workspace users</span>
                  </div>
                  <div className="flex items-center gap-2 text-[11px]">
                    <button
                      type="button"
                      onClick={selectAllFilteredUsers}
                      className="text-primary font-semibold hover:underline"
                    >
                      Select all ({filteredAvailableUsers.length})
                    </button>
                    <span className="text-muted-foreground">•</span>
                    <button
                      type="button"
                      onClick={deselectAllUsers}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      Clear
                    </button>
                  </div>
                </div>

                {/* Search Input */}
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="Search by name, email, department, or role…"
                    className="w-full text-xs rounded-lg bg-sunken border border-border pl-8 pr-3 py-1.5 text-foreground focus:ring-1 focus:ring-ring"
                  />
                </div>

                {/* User List Scroll Area */}
                <div className="max-h-48 overflow-y-auto divide-y divide-border border border-border rounded-lg bg-muted/20">
                  {filteredAvailableUsers.length === 0 ? (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      {availableUsers.length === 0 
                        ? "All workspace users have already been added to this folder."
                        : "No matching users found."}
                    </div>
                  ) : (
                    filteredAvailableUsers.map(user => {
                      const isSelected = selectedUserIds.has(user.id);
                      return (
                        <div
                          key={user.id}
                          onClick={() => toggleUserSelection(user.id)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.target === e.currentTarget && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); (e.currentTarget as HTMLElement).click(); } }}
                          className={`flex items-center justify-between p-2.5 text-xs cursor-pointer transition-colors ${
                            isSelected ? "bg-accent-soft" : "hover:bg-surface-hover"
                          }`}
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}} // Handled by row click
                              className="rounded text-primary focus:ring-ring"
                            />
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">{user.fullName}</p>
                              <p className="text-[11px] text-muted-foreground truncate">{user.email}</p>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {user.departmentName && (
                              <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-sunken text-muted-foreground border border-border">
                                {user.departmentName}
                              </span>
                            )}
                            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-accent-soft text-primary border border-border-active">
                              {user.roleCode || "USER"}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Bottom Preset & Add Button */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-border">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground font-semibold">Initial Preset:</span>
                    <select
                      value={defaultPresetForNewUsers}
                      onChange={(e) => setDefaultPresetForNewUsers(e.target.value as any)}
                      className="text-xs rounded-md bg-surface border border-border px-2 py-1 text-foreground"
                    >
                      <option value="CONTRIBUTOR">Contributor (view + upload + download)</option>
                      <option value="VIEW_ONLY">View & download only</option>
                      <option value="FULL_ACCESS">Full access (admin)</option>
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleAddSelectedUsers}
                    disabled={selectedUserIds.size === 0}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90 disabled:opacity-40 transition-opacity cursor-pointer shadow-xs"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Add {selectedUserIds.size} User{selectedUserIds.size !== 1 ? "s" : ""}</span>
                  </button>
                </div>
              </div>
            )}

            {/* 3. Permissions Matrix Table */}
            <div className="overflow-x-auto rounded-lg border border-border bg-surface">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-sunken border-b border-border text-muted-foreground font-semibold">
                    <th className="py-2.5 px-3">User / role</th>
                    <th className="py-2.5 px-2 text-center w-20" title="Can open and view folder & preview documents">
                      <div className="flex flex-col items-center gap-0.5">
                        <Eye className="h-3.5 w-3.5 text-info-text" />
                        <span>View</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 text-center w-20" title="Can upload new documents and create subfolders">
                      <div className="flex flex-col items-center gap-0.5">
                        <Upload className="h-3.5 w-3.5 text-warning-text" />
                        <span>Upload</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 text-center w-20" title="Can download document file blobs">
                      <div className="flex flex-col items-center gap-0.5">
                        <Download className="h-3.5 w-3.5 text-success-text" />
                        <span>Download</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 text-center w-20" title="Can delete documents and subfolders">
                      <div className="flex flex-col items-center gap-0.5">
                        <Trash2 className="h-3.5 w-3.5 text-danger-text" />
                        <span>Delete</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-2 text-center w-20" title="Can manage folder permissions and settings">
                      <div className="flex flex-col items-center gap-0.5">
                        <Key className="h-3.5 w-3.5 text-accent-soft-text" />
                        <span>Admin</span>
                      </div>
                    </th>
                    <th className="py-2.5 px-3 text-center w-24">Presets</th>
                    <th className="py-2.5 px-2 text-right w-12"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {isLoading ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground">
                        Loading folder access matrix…
                      </td>
                    </tr>
                  ) : assignedPermissions.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground space-y-1.5">
                        <Users className="h-6 w-6 mx-auto opacity-40 text-primary" />
                        <p className="font-semibold text-xs text-foreground">No explicit users assigned.</p>
                        <p className="text-[11px]">
                          {inheritPermissions 
                            ? "All users inherit permissions from the parent folder." 
                            : "Click '+ Add Users' above to grant access."}
                        </p>
                      </td>
                    </tr>
                  ) : (
                    assignedPermissions.map((perm, index) => {
                      const resolvedGroup = perm.groupId ? folderGroups.find((g) => g.id === perm.groupId) : null;
                      const resolvedDept = perm.departmentId ? folderDepartments.find((d) => d.id === perm.departmentId) : null;
                      const displayTitle = perm.groupId
                        ? `Group: ${resolvedGroup?.name || perm.userName || perm.groupId}`
                        : perm.departmentId
                        ? `Dept: ${resolvedDept?.name || perm.departmentName || perm.departmentId}`
                        : perm.userName || perm.userEmail || "Workspace User";
                      const displaySub = perm.groupId
                        ? "DMS Group"
                        : perm.departmentId
                        ? "Department"
                        : perm.userEmail || perm.roleCode || "Role";
                      return (
                      <tr key={perm.id || index} className="hover:bg-muted/30 transition-colors">
                        {/* Principal */}
                        <td className="py-2.5 px-3 min-w-48">
                          <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-full bg-accent-soft text-primary font-semibold text-xs flex items-center justify-center shrink-0">
                              {displayTitle[0].toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <p className="font-semibold text-foreground truncate">
                                {displayTitle}
                              </p>
                              <p className="text-[11px] text-muted-foreground truncate font-mono">
                                {displaySub}
                              </p>
                            </div>
                          </div>
                        </td>

                        {/* View Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canView}
                            onChange={() => handleTogglePermission(index, "canView")}
                            className="rounded text-primary focus:ring-ring cursor-pointer"
                          />
                        </td>

                        {/* Upload Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canUpload}
                            onChange={() => handleTogglePermission(index, "canUpload")}
                            className="rounded text-warning-text focus:ring-warning-border cursor-pointer"
                          />
                        </td>

                        {/* Download Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canDownload}
                            onChange={() => handleTogglePermission(index, "canDownload")}
                            className="rounded text-success-text focus:ring-success-border cursor-pointer"
                          />
                        </td>

                        {/* Delete Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canDelete}
                            onChange={() => handleTogglePermission(index, "canDelete")}
                            className="rounded text-danger-text focus:ring-danger-border cursor-pointer"
                          />
                        </td>

                        {/* Admin / Manage Checkbox */}
                        <td className="py-2.5 px-2 text-center">
                          <input
                            type="checkbox"
                            checked={perm.canManage}
                            onChange={() => handleTogglePermission(index, "canManage")}
                            className="rounded text-accent-soft-text focus:ring-ring cursor-pointer"
                          />
                        </td>

                        {/* Quick Presets */}
                        <td className="py-2.5 px-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => applyPresetToRow(index, "VIEW_ONLY")}
                              className="px-1.5 py-0.5 rounded text-[11px] bg-sunken hover:bg-surface-hover text-muted-foreground hover:text-foreground cursor-pointer"
                              title="Set view & download only"
                            >
                              Read
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetToRow(index, "CONTRIBUTOR")}
                              className="px-1.5 py-0.5 rounded text-[11px] bg-accent-soft text-primary hover:bg-accent-soft font-semibold cursor-pointer"
                              title="Set view + upload + download"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={() => applyPresetToRow(index, "FULL_ACCESS")}
                              className="px-1.5 py-0.5 rounded text-[11px] bg-accent-soft text-accent-soft-text hover:bg-accent-soft font-semibold cursor-pointer"
                              title="Set full admin rights"
                            >
                              Full
                            </button>
                          </div>
                        </td>

                        {/* Delete User Entry */}
                        <td className="py-2.5 px-2 text-right">
                          <button aria-label="Remove access entry from folder"
                            type="button"
                            onClick={() => handleRemoveUserPermission(index)}
                            className="p-1 rounded-md text-muted-foreground hover:text-danger-text hover:bg-danger-soft transition-colors cursor-pointer"
                            title="Remove access entry from folder"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between p-4 sm:p-5 border-t border-border bg-sunken shrink-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="h-4 w-4 text-success-text" />
            <span>Changes take effect immediately upon saving.</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-border bg-surface hover:bg-surface-hover transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveChanges}
              disabled={isSaving || !canManage}
              title={!canManage ? "Only folder managers and Design administrators can change access" : undefined}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-lg bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity shadow-sm cursor-pointer"
            >
              <Check className="h-4 w-4" />
              <span>{isSaving ? "Saving..." : "Save Permissions"}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
