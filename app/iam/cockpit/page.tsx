import React from "react";
import { Metadata } from "next";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";
import { fetchRoles, fetchPermissions } from "@/lib/actions/iam";

export const metadata: Metadata = {
  title: "IAM Governance Cockpit | ADIOS",
  description: "Enterprise Identity & Access Management Governance Dashboard",
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
