import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function ComplianceLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Compliance & Data Vault"
        subtitle="Verifying statutory retention rules & soft-deleted archives..."
      />
    </div>
  );
}
