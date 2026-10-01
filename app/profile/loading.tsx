import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function ProfileLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="User Profile & Security"
        subtitle="Loading personal credentials, preferences & activity logs..."
      />
    </div>
  );
}
