import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function SettingsLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Enterprise Configuration"
        subtitle="Loading system preferences, triggers & integrations..."
      />
    </div>
  );
}
