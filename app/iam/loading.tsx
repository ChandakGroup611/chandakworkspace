import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function IamLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Identity & Access Governance"
        subtitle="Verifying security matrix, active sessions & permissions..."
      />
    </div>
  );
}
