import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function AmcLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak AMC & Contracts"
        subtitle="Initializing maintenance agreements, vendor logs & assets..."
      />
    </div>
  );
}
