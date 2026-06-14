"use client";

import React, { useState, useEffect } from "react";
import { AppCard, AppCardHeader, AppCardTitle, AppCardContent } from "@/components/ui/AppCard";
import { AppButton } from "@/components/ui/AppButton";
import { AppBadge } from "@/components/ui/AppBadge";
import { FolderKanban, Search, Trash2, Edit2, Eye, Building2, CheckCircle2, ArrowLeft } from "lucide-react";
import { useTheme } from "@/components/theme/ThemeProvider";
import { AppTable, AppTableContainer, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { AppInput } from "@/components/ui/AppInput";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";

export function EnrolledWorkspacesClient({ initialWorkspaces, initialSubWorkspaces }: { initialWorkspaces: any[], initialSubWorkspaces: any[] }) {
  const { theme } = useTheme();
  const router = useRouter();
  const { hasPermission, loading: permsLoading } = usePermissions();
  const isLightMode = ["executive-light", "material-ocean", "aurora-breeze", "pure-elegance"].includes(theme);

  const [searchQuery, setSearchQuery] = useState("");
  
  // Combine workspaces and sub-workspaces for the list
  const combinedItems = [
    ...initialWorkspaces.map(w => ({ ...w, type: 'workspace' })),
    ...initialSubWorkspaces.map(sw => ({ ...sw, type: 'sub_workspace' }))
  ];

  const filteredItems = combinedItems.filter(item => 
    (item.name?.toLowerCase() || item.workspace_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.code?.toLowerCase() || item.workspace_code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleView = (item: any) => {
    // If we want to open the workspace hub and focus on this workspace
    router.push(`/workspaces?workspaceId=${item.id}`);
  };

  const handleUpdate = (item: any) => {
    // Update might open the master UI for workspaces or subworkspaces
    // For now we'll route to the workspaces hub which has the update functionality
    router.push(`/workspaces?workspaceId=${item.id}&action=edit`);
  };

  const handleDelete = (item: any) => {
    // Deletion would require hitting the API
    // We'll stub this out for now, to be implemented via an API route or server action
    alert(`Delete action requested for ${item.type === 'workspace' ? item.workspace_name : item.name}`);
  };

  if (permsLoading) {
    return <div className="animate-spin h-8 w-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto my-12" />;
  }

  if (!hasPermission("ENROLLED_WORKSPACES_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-4 py-12">
        <div className="p-4 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400">
          <FolderKanban className="h-10 w-10" />
        </div>
        <h2 className="text-xl font-bold text-foreground">Access Denied</h2>
        <p className="text-xs text-gray-500">You do not have capabilities to view Enrolled Workspaces.</p>
      </div>
    );
  }

  const canManage = hasPermission("ENROLLED_WORKSPACES_MANAGE");

  return (
    <div className={`p-8 w-full max-w-7xl mx-auto space-y-6 ${"text-foreground"}`}>
      <div className="flex items-center justify-between border-b pb-4 border-gray-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <AppButton variant="outline" size="sm" onClick={() => router.push("/")} leftIcon={<ArrowLeft className="h-4 w-4" />}>
            Back
          </AppButton>
          <div className="space-y-1">
            <h1 className="text-2xl font-bold flex items-center gap-2">
            <FolderKanban className="h-6 w-6 text-emerald-500" />
            Enrolled Workspaces
          </h1>
          <p className="text-sm text-gray-500">
            A list of all explicit workspace and sub-workspace nodes you are a member of.
          </p>
          </div>
        </div>
      </div>

      <AppCard className={isLightMode ? "bg-white" : ""}>
        <AppCardHeader className="flex flex-row items-center justify-between pb-2 border-b border-gray-100 dark:border-white/5">
          <div className="relative w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <AppInput 
              placeholder="Search by name or code..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 text-sm"
            />
          </div>
          <div className="text-sm text-gray-500 font-medium">
            {filteredItems.length} Enrolled Nodes Found
          </div>
        </AppCardHeader>
        <div className="p-0">
          <AppTableContainer>
            <AppTable>
              <AppTableHeader>
                <tr>
                  <AppTableHead>Node ID</AppTableHead>
                  <AppTableHead>Name</AppTableHead>
                  <AppTableHead>Type</AppTableHead>
                  <AppTableHead>Status</AppTableHead>
                  <AppTableHead className="text-right">Actions</AppTableHead>
                </tr>
              </AppTableHeader>
              <AppTableBody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-gray-500 text-sm">
                      No enrolled workspaces found.
                    </td>
                  </tr>
                ) : (
                  filteredItems.map(item => (
                    <AppTableRow key={`${item.type}-${item.id}`}>
                      <AppTableCell>
                        <span className="font-mono text-xs font-bold text-gray-500">
                          {item.workspace_code || item.code || item.id.substring(0,8)}
                        </span>
                      </AppTableCell>
                      <AppTableCell>
                        <span className="font-medium">
                          {item.workspace_name || item.name}
                        </span>
                      </AppTableCell>
                      <AppTableCell>
                        <AppBadge variant={item.type === 'workspace' ? "info" : "neutral"}>
                          {item.type === 'workspace' ? "Workspace" : "Sub-Workspace"}
                        </AppBadge>
                      </AppTableCell>
                      <AppTableCell>
                        <span className="text-xs flex items-center gap-1">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: item.status?.status_color || '#10b981' }}></span>
                          {item.status?.status_name || "Active"}
                        </span>
                      </AppTableCell>
                      <AppTableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <AppButton variant="ghost" size="sm" onClick={() => handleView(item)} className="h-8 px-2 text-blue-500 hover:bg-blue-500/10">
                            <Eye className="h-4 w-4 mr-1" /> View
                          </AppButton>
                          {canManage && (
                            <>
                              <AppButton variant="ghost" size="sm" onClick={() => handleUpdate(item)} className="h-8 px-2 text-amber-500 hover:bg-amber-500/10">
                                <Edit2 className="h-4 w-4 mr-1" /> Update
                              </AppButton>
                              <AppButton variant="ghost" size="sm" onClick={() => handleDelete(item)} className="h-8 px-2 text-red-500 hover:bg-red-500/10">
                                <Trash2 className="h-4 w-4 mr-1" /> Delete
                              </AppButton>
                            </>
                          )}
                        </div>
                      </AppTableCell>
                    </AppTableRow>
                  ))
                )}
              </AppTableBody>
            </AppTable>
          </AppTableContainer>
        </div>
      </AppCard>
    </div>
  );
}
