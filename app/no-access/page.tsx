import React from "react";
import { Metadata } from "next";
import { NoAccessCard } from "@/components/common/NoAccessCard";

export const metadata: Metadata = {
  title: "Access Restricted | Chandak Workspace",
  description: "Module access denied with request access option",
};

export default async function NoAccessPage(props: {
  searchParams?: Promise<{ module?: string; reason?: string }>;
}) {
  const params = await props.searchParams;
  const moduleCode = params?.module || "WORKSPACE";
  const reason = params?.reason;

  return (
    <div className="w-full max-w-2xl mx-auto py-12 px-4">
      <NoAccessCard moduleCode={moduleCode} reason={reason} />
    </div>
  );
}
