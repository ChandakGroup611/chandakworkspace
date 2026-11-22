import React from "react";
import { MeetHeader } from "@/components/meet/MeetHeader";
import { requireMeet } from "@/lib/permissions/meet";
import { getModuleRbacDataAction } from "@/lib/actions/module-rbac";
import ModuleRbacManager from "@/components/rbac/ModuleRbacManager";
import { ShieldAlert } from "lucide-react";
import Link from "next/link";
import { AppButton } from "@/components/ui/AppButton";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Module RBAC Policy · Chandak Meet",
  description: "Independent module role definitions, permissions, and policy synchronization for Chandak Meet",
};

export default async function MeetRbacPage() {
  try {
    await requireMeet("MEET_ADMIN", { requireAdmin: true });
  } catch (err: any) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="h-14 w-14 rounded-2xl bg-danger/10 text-danger flex items-center justify-center ring-8 ring-danger/5">
          <ShieldAlert className="h-7 w-7" />
        </div>
        <div className="space-y-1.5 max-w-md">
          <h2 className="text-xl font-bold text-heading">Module RBAC Access Restricted</h2>
          <p className="text-sm text-muted">
            You do not have administrative privileges (MEET_ADMIN) to manage Chandak Meet module roles and access policies.
          </p>
        </div>
        <Link href="/meet">
          <AppButton variant="primary" size="md">
            Return to Meet Overview
          </AppButton>
        </Link>
      </div>
    );
  }

  const initialData = await getModuleRbacDataAction("CHANDAK_MEET");

  return (
    <div className="space-y-6">
      <MeetHeader
        title="Meet Module RBAC & Policies"
        description="Independent module-level role definitions, permission matrix, and policy versioning"
        breadcrumbs={[
          { label: "Meet Overview", href: "/meet" },
          { label: "Settings", href: "/meet/admin" },
          { label: "RBAC Access Policies" },
        ]}
      />

      <ModuleRbacManager
        initialModuleCode="CHANDAK_MEET"
        manifest={initialData.manifest}
        initialRoles={initialData.roles || []}
        initialAuditLogs={initialData.auditLogs || []}
        backHref="/meet/admin"
        backLabel="Back to Meet Settings"
      />
    </div>
  );
}
