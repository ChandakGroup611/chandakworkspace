import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function SlaLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Chandak SLA Engine"
        subtitle="Calculating operational timeouts, schedules & escalation gates..."
      />
    </div>
  );
}
