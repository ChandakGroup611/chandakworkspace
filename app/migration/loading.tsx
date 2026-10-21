import React from "react";
import ChandakLoader from "@/components/ui/ChandakLoader";

export default function MigrationLoading() {
  return (
    <div className="flex h-[80vh] w-full items-center justify-center">
      <ChandakLoader
        size="lg"
        title="Enterprise data migration"
        subtitle="Initializing migration pipelines & spreadsheet transformers…"
      />
    </div>
  );
}
