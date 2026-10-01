import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function VehicleLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Fleet & Vehicle Desk"
        subtitle="Initializing fleet directory, allocations & compliance..."
      />
    </div>
  );
}
