import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function MastersLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Master Configuration"
        subtitle="Loading companies, departments, vendors & entity catalogs..."
      />
    </div>
  );
}
