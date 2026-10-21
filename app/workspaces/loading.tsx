import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function WorkspacesLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="md"
        title="Loading workspaces…"
        subtitle="Fetching workspaces and tasks"
      />
    </div>
  );
}
