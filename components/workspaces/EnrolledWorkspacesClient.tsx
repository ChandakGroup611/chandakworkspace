"use client";
import { toast } from 'react-toastify';

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { StatusBadge } from "@/components/ui/data";
import { EmptyState } from "@/components/ui/feedback/States";
import { AppButton } from "@/components/ui/AppButton";
import { FolderKanban, Search, Trash2, Edit2, Eye } from "lucide-react";
import { AppTable, AppTableContainer, AppTableHeader, AppTableBody, AppTableRow, AppTableHead, AppTableCell } from "@/components/ui/AppTable";
import { AppInput } from "@/components/ui/AppInput";
import { useRouter } from "next/navigation";
import { usePermissions } from "@/hooks/usePermissions";
import ChandakLoader from "@/components/ui/ChandakLoader";

export function EnrolledWorkspacesClient({ initialWorkspaces, initialSubWorkspaces }: { initialWorkspaces: any[], initialSubWorkspaces: any[] }) {
  const router = useRouter();
  const { hasPermission, loading: permsLoading } = usePermissions();

  const [searchQuery, setSearchQuery] = useState("");
  
  // Combine workspaces and sub-workspaces for the list
  const combinedItems = [
    ...(initialWorkspaces || []).map(w => ({ ...w, type: 'workspace' })),
    ...(initialSubWorkspaces || []).map(sw => ({ ...sw, type: 'sub_workspace' }))
  ];

  const filteredItems = combinedItems.filter(item => 
    (item.name?.toLowerCase() || item.workspace_name?.toLowerCase() || "").includes(searchQuery.toLowerCase()) ||
    (item.code?.toLowerCase() || item.workspace_code?.toLowerCase() || "").includes(searchQuery.toLowerCase())
  );

  const handleView = (item: any) => {
    router.push(`/workspaces?workspace=${item.id}`);
  };

  const handleUpdate = (item: any) => {
    router.push(`/workspaces?workspace=${item.id}&action=edit`);
  };

  const handleDelete = (item: any) => {
    toast.warning(`Delete action requested for ${item.type === 'workspace' ? item.workspace_name : item.name}`);
  };

  if (permsLoading) {
    return (
      <div className="flex justify-center py-12">
        <ChandakLoader size="md" title="Loading your workspaces…" />
      </div>
    );
  }

  if (!hasPermission("ENROLLED_WORKSPACES_VIEW")) {
    return (
      <div className="flex flex-col items-center justify-center space-y-3 py-12 text-center">
        <div className="rounded-full bg-warning-soft p-3 text-warning-text">
          <FolderKanban className="h-6 w-6" aria-hidden />
        </div>
        <h2 className="text-[15px] font-semibold text-heading">You don't have access to enrolled workspaces</h2>
        <p className="text-[13px] text-muted">Ask your administrator to grant Enrolled workspaces view access in RBAC access policies.</p>
      </div>
    );
  }

  const canManage = hasPermission("ENROLLED_WORKSPACES_MANAGE");
  const iconBtn = "inline-flex h-7 w-7 items-center justify-center rounded-md text-muted transition-colors hover:bg-surface-hover hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring";

  return (
    <div className="mx-auto w-full max-w-7xl space-y-5 p-4 text-foreground sm:p-6">
      <PageHeader
        title="Enrolled workspaces"
        description="Workspaces and sub-workspaces you're a member of"
        breadcrumbs={[{ label: "Home", href: "/" }, { label: "Enrolled workspaces" }]}
      />

      <div className="theme-card-structural overflow-hidden">
        <div className="flex flex-col gap-2 border-b border-border p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:w-72">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" aria-hidden />
            <AppInput
              type="search"
              aria-label="Search by name or code"
              placeholder="Search by name or code"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 pl-9 text-[13.5px]"
            />
          </div>
          {searchQuery && (
            <div className="text-[12.5px] text-muted tabular">
              {filteredItems.length} of {combinedItems.length} shown
            </div>
          )}
        </div>
        <AppTableContainer>
          <AppTable>
            <AppTableHeader>
              <tr>
                <AppTableHead>Code</AppTableHead>
                <AppTableHead>Name</AppTableHead>
                <AppTableHead>Type</AppTableHead>
                <AppTableHead>Status</AppTableHead>
                <AppTableHead className="text-right">Actions</AppTableHead>
              </tr>
            </AppTableHeader>
            <AppTableBody>
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5}>
                    <EmptyState
                      kind={searchQuery ? "no-results" : "empty"}
                      compact
                      title={searchQuery ? "No workspaces match your search" : "You're not in any workspace yet"}
                      description={searchQuery ? "Check the spelling, or search by workspace code." : "Ask a workspace owner to add you."}
                    />
                  </td>
                </tr>
              ) : (
                filteredItems.map(item => (
                  <AppTableRow key={`${item.type}-${item.id}`}>
                    <AppTableCell>
                      <span className="font-mono text-[12.5px] font-medium text-accent-soft-text">
                        {item.workspace_code || item.code || item.id.substring(0,8)}
                      </span>
                    </AppTableCell>
                    <AppTableCell>
                      <span className="font-medium text-foreground">
                        {item.workspace_name || item.name}
                      </span>
                    </AppTableCell>
                    <AppTableCell className="text-subtle">
                      {item.type === 'workspace' ? "Workspace" : "Sub-workspace"}
                    </AppTableCell>
                    <AppTableCell>
                      <StatusBadge status={item.status?.status_name || "Active"} />
                    </AppTableCell>
                    <AppTableCell className="text-right">
                      <div className="flex items-center justify-end gap-0.5">
                        <button type="button" onClick={() => handleView(item)} className={iconBtn} title="View" aria-label={`View ${item.workspace_name || item.name}`}>
                          <Eye className="h-4 w-4" aria-hidden />
                        </button>
                        {canManage && (
                          <>
                            <button type="button" onClick={() => handleUpdate(item)} className={iconBtn} title="Edit" aria-label={`Edit ${item.workspace_name || item.name}`}>
                              <Edit2 className="h-4 w-4" aria-hidden />
                            </button>
                            <button type="button" onClick={() => handleDelete(item)} className={`${iconBtn} hover:bg-danger-soft hover:text-danger-text`} title="Delete" aria-label={`Delete ${item.workspace_name || item.name}`}>
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
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
    </div>
  );
}
