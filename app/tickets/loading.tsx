import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function TicketsLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak ticketing portal"
        subtitle="Synchronizing operations stream & active tickets…"
      />
    </div>
  );
}
