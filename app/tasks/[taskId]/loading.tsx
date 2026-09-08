import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TaskLoading() {
  return (
    <div className="flex h-[60vh] w-full items-center justify-center">
      <ChandakLoader
        size="md"
        title="Decrypting Task Data..."
        subtitle="Fetching operational intel"
      />
    </div>
  );
}
