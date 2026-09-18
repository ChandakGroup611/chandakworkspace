import React from "react";
import { redirect } from "next/navigation";
import { getCachedUser } from "@/lib/auth/cached-user";
import { DesignRbacGovernance } from "@/Design_Tracking/src/components/DesignRbacGovernance";

export const metadata = {
  title: "RBAC Access Policies | Chandak Workspace",
  description: "Enterprise Role-Based Access Control, Project-Wise Governance, and Granular CRUD Policies."
};

export const dynamic = "force-dynamic";

export default async function RbacPage() {
  const { user } = await getCachedUser();

  if (!user) {
    redirect("/login?next=/rbac");
  }

  return (
    <div className="w-full flex-1 flex flex-col min-w-0">
      <DesignRbacGovernance />
    </div>
  );
}
