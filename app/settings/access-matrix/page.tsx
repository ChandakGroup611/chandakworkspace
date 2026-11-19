import React from "react";
import { Metadata } from "next";
import AccessMatrixClient from "@/components/settings/AccessMatrixClient";
import { fetchAccessMatrixData } from "@/lib/actions/iam";

export const metadata: Metadata = {
  title: "Access Matrix | Settings | Chandak Workspace",
  description: "Read-only access matrix and per-user module capability inspector",
};

export const dynamic = "force-dynamic";

export default async function AccessMatrixPage() {
  const { moduleRoles, users } = await fetchAccessMatrixData();

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      <AccessMatrixClient moduleRoles={moduleRoles} users={users} />
    </div>
  );
}
