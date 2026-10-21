import React from "react";
import { Metadata } from "next";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";
import { fetchRoles, fetchPermissions } from "@/lib/actions/iam";

export const metadata: Metadata = {
  title: "IAM governance cockpit | Chandak Workspace",
  description: "Enterprise identity & access management governance dashboard",
};

export const dynamic = "force-dynamic";

export default async function IAMCockpitPage() {
  const [roles, permissions] = await Promise.all([
    fetchRoles(),
    fetchPermissions()
  ]);

  return (
    <div className="w-full space-y-6 animate-in fade-in-50 duration-500">
      <IAMGovernanceCockpit
        roles={roles}
        permissions={permissions}
        onRefresh={async () => {
          // Refresh logic handled by server
        }}
      />
    </div>
  );
}
