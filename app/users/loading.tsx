import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function UsersLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak Enterprise Directory"
        subtitle="Loading staff personnel, roles & authentication credentials..."
      />
    </div>
  );
}
