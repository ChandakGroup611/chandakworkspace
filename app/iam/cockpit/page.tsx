import React from "react";
import { Metadata } from "next";
import IAMGovernanceCockpit from "@/components/iam/IAMGovernanceCockpit";

export const metadata: Metadata = {
  title: "Access control · Chandak Workspace",
  description: "Identity and access overview",
};

export const dynamic = "force-dynamic";

// Same screen as /iam. The component loads its own roles and permissions.
// (Passing an inline server function to this client component crashed the page.)
export default function IAMCockpitPage() {
  return (
    <div className="w-full space-y-6">
      <IAMGovernanceCockpit />
    </div>
  );
}
