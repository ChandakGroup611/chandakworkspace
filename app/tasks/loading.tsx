import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TasksLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Task Governance"
        subtitle="Loading workspace tasks, sprints & timeline matrix..."
      />
    </div>
  );
}
