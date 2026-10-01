import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function RequirementsLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Requirements Desk"
        subtitle="Loading business specifications, grooming & approvals..."
      />
    </div>
  );
}
