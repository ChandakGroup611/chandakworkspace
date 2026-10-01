import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function DesignLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Design Tracker"
        subtitle="Loading engineering drawings, revisions & consultant workflows..."
      />
    </div>
  );
}
