import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function SelectModuleLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Workspace Gateway"
        subtitle="Verifying authorized enterprise application modules..."
      />
    </div>
  );
}
