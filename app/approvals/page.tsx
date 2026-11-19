import React from "react";
import { Metadata } from "next";
import ApprovalInboxClient from "@/components/approvals/ApprovalInboxClient";
import { fetchPendingApprovals } from "@/lib/actions/approvals";

export const metadata: Metadata = {
  title: "Approval Inbox | Chandak Workspace",
  description: "Cross-module aggregation of pending sign-offs, reviews, and authorizations",
};

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const items = await fetchPendingApprovals();

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      <ApprovalInboxClient initialItems={items} />
    </div>
  );
}
