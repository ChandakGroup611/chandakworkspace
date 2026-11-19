import React from "react";
import { Metadata } from "next";
import MyWorkClient from "@/components/my-work/MyWorkClient";
import { fetchMyWorkItems } from "@/lib/actions/my-work";

export const metadata: Metadata = {
  title: "My Work | Chandak Workspace",
  description: "Cross-module aggregation of assigned tasks, tickets, requirements, and trips",
};

export const dynamic = "force-dynamic";

export default async function MyWorkPage() {
  const items = await fetchMyWorkItems();

  return (
    <div className="w-full max-w-7xl mx-auto py-4 px-4 sm:px-6 space-y-6">
      <MyWorkClient initialItems={items} />
    </div>
  );
}
